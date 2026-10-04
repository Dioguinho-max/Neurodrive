const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { CloudStore, createPool } = require('./cloud-store.cjs');
const { attachOnline } = require('./online.cjs');
const catalog = require('./catalog.cjs');
const { startupConfig, startupMessage } = require('./startup-config.cjs');
const scrypt = promisify(crypto.scrypt);
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const fail = (status, message) => Object.assign(new Error(message), { status });
const derive = (password, salt) => scrypt(password, salt, 64, { N: 32768, maxmem: 67108864 });
const validPassword = (s) => typeof s === 'string' && s.length >= 10 && s.length <= 128;

function createCloudServer({ store, frontendOrigin, backendOrigin }) {
  const front = new URL(frontendOrigin).origin;
  const backend = new URL(backendOrigin).origin;
  const secure = front.startsWith('https:');
  const cookie = (value, age) => `nd_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure ? '; Secure' : ''}`;
  const root = fs.realpathSync(path.join(__dirname, '../output'));
  let authBusy = 0;
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
    const token = /(?:^|;\s*)nd_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1] || '';
    async function session(id) {
      const value = crypto.randomBytes(32).toString('hex');
      await store.newSession(hash(value), id, hash(token));
      res.setHeader('Set-Cookie', cookie(value, 604800));
    }
    try {
      const url = new URL(req.url, backend);
      if (url.pathname === '/health') return json(200, { ok: true });
      if (url.pathname === '/api/config' && req.method === 'GET') return json(200, { online: true, localRewards: false, websocketUrl: backend.replace(/^http/, 'ws') + '/online' });
      if (url.pathname === '/api/catalog' && req.method === 'GET') return json(200, { skins: catalog });
      if (!url.pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(req.method)) throw fail(405, 'Método inválido.');
        const name = decodeURIComponent(url.pathname === '/' ? '/corrida.html' : url.pathname);
        const target = path.resolve(root, '.' + name);
        let real;
        try { real = fs.realpathSync(target); } catch { throw fail(404, 'Arquivo não encontrado.'); }
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain' };
        if (!real.startsWith(root + path.sep) || name.includes('/tests/') || !types[path.extname(real)] || !fs.statSync(real).isFile()) throw fail(404, 'Arquivo não encontrado.');
        res.writeHead(200, { 'Content-Type': types[path.extname(real)] + '; charset=utf-8', 'Cache-Control': 'no-cache' });
        if (req.method === 'HEAD') return res.end();
        fs.createReadStream(real).on('error', () => res.destroy()).pipe(res); return;
      }
      let data = {};
      if (req.method === 'POST') {
        if (req.headers.origin !== front) throw fail(403, 'Origem não permitida.');
        if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw fail(415, 'Envie JSON.');
        const chunks = []; let bytes = 0;
        for await (const chunk of req) { bytes += chunk.length; if (bytes > 4096) throw fail(413, 'Pedido muito grande.'); chunks.push(chunk); }
        try { data = JSON.parse(Buffer.concat(chunks)); } catch { throw fail(400, 'JSON inválido.'); }
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw fail(400, 'Dados inválidos.');
      } else if (req.method !== 'GET') throw fail(405, 'Método inválido.');
      if (req.method === 'POST' && ['/api/login', '/api/register'].includes(url.pathname)) {
        if (authBusy >= 8) throw fail(503, 'Servidor ocupado. Tente novamente.');
        const username = typeof data.username === 'string' ? data.username.trim() : '';
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username) || !validPassword(data.password)) throw fail(400, 'Nome de 3–20 letras, números ou _; senha de 10–128 caracteres.');
        await store.limit(hash(username.toLowerCase()));
        authBusy++;
        let player;
        try {
          if (url.pathname === '/api/register') {
            const salt = crypto.randomBytes(16).toString('hex');
            player = await store.create(username, (await derive(data.password, salt)).toString('hex'), salt);
          } else {
            player = await store.find(username);
            const candidate = await derive(data.password, player?.salt || 'unknown-user-padding');
            if (!crypto.timingSafeEqual(candidate, Buffer.from(player?.password_hash || '00'.repeat(64), 'hex')) || !player) throw fail(401, 'Nome ou senha incorretos.');
          }
        } finally { authBusy--; }
        await session(player.id);
        return json(200, { player: await store.profile(player.id) });
      }
      const id = await store.session(hash(token));
      if (!id) throw fail(401, 'Entre na sua conta para continuar.');
      if (req.method === 'GET' && url.pathname === '/api/me') return json(200, { player: await store.profile(id) });
      if (req.method !== 'POST') throw fail(404, 'Rota não encontrada.');
      if (url.pathname === '/api/online-ticket') return json(200, { ticket: online.issue(id) });
      if (url.pathname === '/api/logout') {
        await store.logout(hash(token)); online.disconnect(id); res.setHeader('Set-Cookie', cookie('', 0)); return json(200, { ok: true });
      }
      if (url.pathname === '/api/password') {
        if (!validPassword(data.password) || !validPassword(data.currentPassword)) throw fail(400, 'Senhas devem ter de 10 a 128 caracteres.');
        await store.limit(hash('password:' + id));
        const profile = await store.profile(id);
        const user = await store.find(profile.username);
        if (!crypto.timingSafeEqual(await derive(data.currentPassword, user.salt), Buffer.from(user.password_hash, 'hex'))) throw fail(401, 'Senha atual incorreta.');
        const salt = crypto.randomBytes(16).toString('hex');
        await store.changePassword(id, (await derive(data.password, salt)).toString('hex'), salt);
        online.disconnect(id); await session(id);
      } else if (url.pathname === '/api/bonus') await store.bonus(id);
      else if (['/api/buy', '/api/equip'].includes(url.pathname)) await store.buy(id, data.skin, url.pathname === '/api/buy');
      else if (url.pathname.startsWith('/api/races/')) throw fail(409, 'Na versão online, somente corridas calculadas pelo servidor concedem moedas.');
      else throw fail(404, 'Rota não encontrada.');
      return json(200, { player: await store.profile(id) });
    } catch (error) {
      if (!res.headersSent) json(error.status || 500, { error: error.status ? error.message : 'Servidor indisponível. Tente novamente.' });
      else res.destroy();
      if (!error.status) console.error('Backend:', error.code || error.name);
    }
  });
  const online = attachOnline(server, { origin: front, store });
  server.requestTimeout = 10000; server.headersTimeout = 10000;
  server.on('close', () => online.close());
  server.shutdownOnline = () => online.close();
  return server;
}
module.exports = { createCloudServer };
if (require.main === module) {
  let pool;
  let stage = 'configuração';
  (async () => {
    const config = startupConfig(process.env);
    stage = 'conexão PostgreSQL e criação do esquema';
    console.log('Configuração validada. Conectando ao PostgreSQL…');
    pool = createPool();
    const store = new CloudStore(pool); await store.init();
    stage = 'inicialização HTTP';
    const server = createCloudServer({ store, ...config });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(config.port, '0.0.0.0', resolve); });
    console.log('NeuroDrive cloud pronto.');
    const stop = () => { server.shutdownOnline(); server.close(() => pool.end().then(() => process.exit(0))); };
    process.on('SIGTERM', stop); process.on('SIGINT', stop);
  })().catch(async (error) => {
    console.error(`Falha ao iniciar cloud [${stage}]: ${startupMessage(error)}`);
    if (pool) await pool.end().catch(() => {});
    process.exitCode = 1;
  });
}
