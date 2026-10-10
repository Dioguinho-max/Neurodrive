'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { DatabaseSync } = require('node:sqlite');
const catalog = require('./catalog.cjs');
const pilot = require('./pilot.cjs');
const scrypt = promisify(crypto.scrypt);
const DAY = 86400000;
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (status, message) => Object.assign(new Error(message), { status });

function createApp({ database = path.join(__dirname, 'data', 'neurodrive.sqlite'), origin = null, clock = Date.now } = {}) {
  if (database !== ':memory:') fs.mkdirSync(path.dirname(database), { recursive: true });
  const db = new DatabaseSync(database);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL, salt TEXT NOT NULL,
      coins INTEGER NOT NULL DEFAULT 500 CHECK(coins >= 0),
      equipped TEXT NOT NULL DEFAULT 'original', last_bonus INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS inventory (
      player_id INTEGER NOT NULL REFERENCES players(id), skin TEXT NOT NULL,
      PRIMARY KEY(player_id, skin)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, player_id INTEGER NOT NULL REFERENCES players(id), expires INTEGER NOT NULL
    );`);
  for (const [name, type] of [['nickname', 'TEXT'], ['driver_number', 'INTEGER NOT NULL DEFAULT 0'], ['avatar', 'TEXT']]) {
    if (!db.prepare('PRAGMA table_info(players)').all().some(column => column.name === name)) db.exec(`ALTER TABLE players ADD COLUMN ${name} ${type}`);
  }
  const rewards = require('./rewards.cjs')(db, clock);
  const publicRoot = fs.realpathSync(path.join(__dirname, '..', 'output'));
  const attempts = new Map();
  const statement = (sql, ...params) => db.prepare(sql).get(...params);
  const run = (sql, ...params) => db.prepare(sql).run(...params);
  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  function profile(id) {
    const player = statement('SELECT id, username, nickname, driver_number, avatar, coins, equipped, last_bonus FROM players WHERE id=?', id);
    const owned = db.prepare('SELECT skin FROM inventory WHERE player_id=?').all(id).map((row) => row.skin);
    return { username: player.username, nickname: player.nickname || player.username, number: player.driver_number, avatar: player.avatar, bestLaps: [], coins: player.coins, equipped: player.equipped, owned, stats: rewards.stats(id),
      nextBonusAt: player.last_bonus ? player.last_bonus + DAY : 0 };
  }
  function token(req) {
    return /(?:^|;\s*)nd_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1] || '';
  }
  function user(req) {
    const session = statement('SELECT player_id FROM sessions WHERE token_hash=? AND expires>?', hash(token(req)), Date.now());
    if (!session) throw fail(401, 'Entre na sua conta para continuar.');
    return session.player_id;
  }
  function session(req, res, id, allowedOrigin) {
    run('DELETE FROM sessions WHERE expires <= ? OR token_hash=?', Date.now(), hash(token(req)));
    const value = crypto.randomBytes(32).toString('hex');
    run('INSERT INTO sessions VALUES (?, ?, ?)', hash(value), id, Date.now() + 7 * DAY);
    res.setHeader('Set-Cookie', `nd_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${allowedOrigin.startsWith('https:') ? '; Secure' : ''}`);
  }
  async function body(req, maximum = 4096) {
    if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw fail(415, 'Envie JSON.');
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > maximum) throw fail(413, 'Pedido muito grande.');
      chunks.push(chunk);
    }
    try {
      const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
      return value;
    } catch { throw fail(400, 'Dados inválidos.'); }
  }
  function rateLimit(req) {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const key = req.socket.remoteAddress;
    const entry = attempts.get(key) || { count: 0, until: now + 15 * 60000 };
    if (++entry.count > 20 || attempts.size > 10000) throw fail(429, 'Muitas tentativas. Aguarde 15 minutos.');
    attempts.set(key, entry);
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    const allowedOrigin = origin || `http://127.0.0.1:${server.address().port}`;
    function json(status, value) {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(value));
    }
    try {
      // Origem e Host fixos: sem CORS e sem confiar em cabeçalhos de proxy.
      if (req.headers.host !== new URL(allowedOrigin).host) throw fail(403, 'Abra o endereço configurado do jogo.');
      const url = new URL(req.url, allowedOrigin);
      if (url.pathname.startsWith('/api/')) {
        if (req.method === 'GET' && url.pathname === '/api/records') {
          const filters = require('./records.cjs').filters(url.searchParams);
          return json(200, { available: false, ...filters, seasons: [], entries: [], own: null, leader: null, total: 0 });
        }
        if (req.method === 'GET' && url.pathname === '/api/config') return json(200, { online: false, localRewards: true });
        if (req.method === 'GET' && url.pathname === '/api/catalog') return json(200, { skins: catalog });
        if (req.method === 'GET' && url.pathname === '/api/me') return json(200, { player: profile(user(req)) });
        if (req.method === 'GET' && url.pathname === '/api/pilot') {
          user(req);
          const target = statement('SELECT id FROM players WHERE username=?', (url.searchParams.get('name') || '').slice(0, 20));
          if (!target) throw fail(404, 'Piloto nao encontrado.');
          return json(200, { pilot: pilot.publicPilot(profile(target.id)) });
        }
        if (req.method !== 'POST') throw fail(404, 'Rota não encontrada.');
        if (req.headers.origin && req.headers.origin !== allowedOrigin) throw fail(403, 'Origem não permitida.');
        if (req.headers['sec-fetch-site'] === 'cross-site') throw fail(403, 'Origem não permitida.');
        const auth = ['/api/register', '/api/login'].includes(url.pathname);
        if (auth) rateLimit(req);
        if (url.pathname === '/api/avatar') user(req);
        const data = await body(req, url.pathname === '/api/avatar' ? 280000 : 4096);
        if (auth) {
          const username = typeof data.username === 'string' ? data.username.trim() : '';
          const password = data.password;
          if (!/^[a-zA-Z0-9_]{3,20}$/.test(username) || typeof password !== 'string' || password.length < 10 || password.length > 128) {
            throw fail(400, 'Use nome com 3–20 letras, números ou _ e senha de 10–128 caracteres.');
          }
          let player;
          if (url.pathname === '/api/register') {
            const salt = crypto.randomBytes(16).toString('hex');
            const derived = (await scrypt(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 })).toString('hex');
            player = transaction(() => {
              if (statement('SELECT id FROM players WHERE username=?', username)) throw fail(409, 'Esse nome já está em uso.');
              const id = Number(run('INSERT INTO players(username, password_hash, salt) VALUES (?, ?, ?)', username, derived, salt).lastInsertRowid);
              run('INSERT INTO inventory VALUES (?, ?)', id, 'original');
              return { id };
            });
          } else {
            player = statement('SELECT id, password_hash, salt FROM players WHERE username=?', username);
            const derived = await scrypt(password, player?.salt || 'unknown-user-padding', 64, { N: 32768, maxmem: 64 * 1024 * 1024 });
            if (!crypto.timingSafeEqual(derived, Buffer.from(player?.password_hash || '00'.repeat(64), 'hex')) || !player) throw fail(401, 'Nome ou senha incorretos.');
          }
          session(req, res, player.id, allowedOrigin);
          return json(200, { player: profile(player.id) });
        }
        if (url.pathname === '/api/logout') {
          run('DELETE FROM sessions WHERE token_hash=?', hash(token(req)));
          res.setHeader('Set-Cookie', `nd_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${allowedOrigin.startsWith('https:') ? '; Secure' : ''}`);
          return json(200, { ok: true });
        }
        const id = user(req);
        if (url.pathname === '/api/races/start') return json(200, { ticket: rewards.start(id, data) });
        if (url.pathname === '/api/races/finish') {
          const reward = rewards.finish(id, data);
          return json(200, { reward, player: profile(id) });
        }
        if (url.pathname === '/api/profile') {
          const dataPilot = pilot.details(data);
          run('UPDATE players SET nickname=?,driver_number=? WHERE id=?', dataPilot.nickname, dataPilot.number, id);
        } else if (url.pathname === '/api/avatar') {
          const bytes = pilot.avatar(data.avatar);
          run('UPDATE players SET avatar=? WHERE id=?', bytes ? 'data:image/jpeg;base64,' + bytes.toString('base64') : null, id);
        } else if (url.pathname === '/api/bonus') {
          const result = run('UPDATE players SET coins=coins+100, last_bonus=? WHERE id=? AND last_bonus<=?', Date.now(), id, Date.now() - DAY);
          if (!result.changes) throw fail(409, 'Bônus já resgatado. Volte após 24 horas.');
        } else if (['/api/buy', '/api/equip'].includes(url.pathname)) {
          const skin = catalog.find((item) => item.id === data.skin);
          if (!skin) throw fail(400, 'Skin inválida.');
          transaction(() => {
            const owned = statement('SELECT skin FROM inventory WHERE player_id=? AND skin=?', id, skin.id);
            if (url.pathname === '/api/buy' && !owned) {
              const payment = run('UPDATE players SET coins=coins-? WHERE id=? AND coins>=?', skin.price, id, skin.price);
              if (!payment.changes) throw fail(409, 'Moedas insuficientes.');
              run('INSERT INTO inventory VALUES (?, ?)', id, skin.id);
            } else if (!owned) throw fail(403, 'Compre essa skin antes de equipar.');
            // Comprar já equipa; repetir o pedido não cobra novamente.
            run('UPDATE players SET equipped=? WHERE id=?', skin.id, id);
          });
        } else throw fail(404, 'Rota não encontrada.');
        return json(200, { player: profile(id) });
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw fail(405, 'Método não permitido.');
      let relative = decodeURIComponent(url.pathname);
      if (relative === '/') relative = '/corrida.html';
      if (relative.startsWith('/output/')) relative = relative.slice(7);
      const file = path.resolve(publicRoot, '.' + relative);
      if (!file.startsWith(publicRoot + path.sep)) throw fail(404, 'Arquivo não encontrado.');
      let resolved;
      try { resolved = fs.realpathSync(file); } catch { throw fail(404, 'Arquivo não encontrado.'); }
      if (!resolved.startsWith(publicRoot + path.sep) || !fs.statSync(resolved).isFile()) throw fail(404, 'Arquivo não encontrado.');
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
      if (!types[path.extname(file)] || relative.includes('/tests/')) throw fail(404, 'Arquivo não encontrado.');
      res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-cache' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(resolved).on('error', () => res.destroy()).pipe(res);
    } catch (error) {
      if (!error.status) console.error('Falha interna no backend:', error.code || error.name);
      if (!res.headersSent) json(error.status || 500, { error: error.status ? error.message : 'Não foi possível completar o pedido.' });
      else res.destroy();
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.on('close', () => db.close());
  return server;
}
module.exports = { createApp };
if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const origin = process.env.PUBLIC_ORIGIN || `http://127.0.0.1:${port}`;
  if (process.env.NODE_ENV === 'production' && !origin.startsWith('https://')) throw new Error('Produção requer PUBLIC_ORIGIN com HTTPS e proxy TLS.');
  const server = createApp({ origin, ...(process.env.DATABASE_PATH ? { database: path.resolve(process.env.DATABASE_PATH) } : {}) });
  server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`NeuroDrive: ${origin}`));
}
