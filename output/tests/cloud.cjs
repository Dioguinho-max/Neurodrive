const assert = require('node:assert/strict');
const { once } = require('node:events');
const { PGlite } = require('@electric-sql/pglite');
const { WebSocket } = require('ws');
const { CloudStore } = require('../../server/cloud-store.cjs');
const { createCloudServer } = require('../../server/cloud.cjs');

// PostgreSQL real via WASM; conexão única enfileirada como um pool de tamanho 1.
class TestPool {
  constructor() { this.db = new PGlite(); this.tail = Promise.resolve(); }
  async lock() { let release; const previous = this.tail; this.tail = new Promise((resolve) => { release = resolve; }); await previous; return release; }
  async execute(sql, params) {
    const result = params ? await this.db.query(sql, params) : (await this.db.exec(sql)).at(-1);
    return { ...result, rowCount: result.rowCount ?? (result.rows?.length || result.affectedRows || 0) };
  }
  async query(sql, params) { const release = await this.lock(); try { return await this.execute(sql, params); } finally { release(); } }
  async connect() { const release = await this.lock(); return { query: this.execute.bind(this), release }; }
}
function messages(ws) {
  const pending = [], queued = [];
  ws.on('message', (raw) => {
    const value = JSON.parse(raw);
    const index = pending.findIndex((entry) => entry.test(value));
    if (index < 0) queued.push(value);
    else { const item = pending.splice(index, 1)[0]; clearTimeout(item.timer); item.resolve(value); }
  });
  return (test) => {
    const index = queued.findIndex(test);
    if (index >= 0) return Promise.resolve(queued.splice(index, 1)[0]);
    return new Promise((resolve, reject) => {
      const item = { test, resolve, timer: setTimeout(() => reject(new Error('Mensagem online não recebida')), 10000) };
      pending.push(item);
    });
  };
}
(async () => {
  const pool = new TestPool(); const store = new CloudStore(pool);
  let server, a, b, inputs;
  try {
    await store.init(); await store.init();
    server = createCloudServer({ store, frontendOrigin: 'https://game.example', backendOrigin: 'https://api.example' });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    async function api(route, data, cookie = '', origin = 'https://game.example') {
      const response = await fetch(base + '/api/' + route, { method: data ? 'POST' : 'GET', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
      return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
    }
    const registration = await api('register', { username: 'player_one', password: 'SenhaSegura_123' });
    assert.equal(registration.status, 200);
    const ca = registration.cookie;
    const cb = (await api('register', { username: 'player_two', password: 'SenhaSegura_456' })).cookie;
    assert.equal((await api('register', { username: 'PLAYER_ONE', password: 'SenhaSegura_123' })).status, 409);
    assert.equal((await api('buy', { skin: 'rubi' }, ca, 'https://bad.example')).status, 403);
    assert.equal((await api('equip', { skin: 'ouro' }, ca)).status, 403);
    const buy = await Promise.all([api('buy', { skin: 'rubi' }, ca), api('buy', { skin: 'rubi' }, ca)]);
    assert(buy.every((value) => value.status === 200));
    assert.equal((await api('me', null, ca)).data.player.coins, 300);
    assert.equal((await api('races/finish', { reward: 90000 }, ca)).status, 409, 'Cliente não pode enviar uma chegada para ganhar moedas');
    const id = (await store.find('player_one')).id;
    const awards = await Promise.all([store.award(id, 'server-race', 3, 1), store.award(id, 'server-race', 3, 1)]);
    assert.deepEqual(awards, [110, 110]);
    assert.equal((await store.profile(id)).coins, 410);
    assert.equal((await store.profile(id)).stats.races, 1);
    a = new WebSocket(base.replace('http', 'ws') + '/online', { origin: 'https://game.example' });
    const ma = messages(a); await once(a, 'open');
    a.send(JSON.stringify({ type: 'auth', ticket: (await api('online-ticket', {}, ca)).data.ticket }));
    await ma((m) => m.type === 'auth');
    a.send(JSON.stringify({ type: 'ping', time: 123 }));
    assert.equal((await ma((m) => m.type === 'pong')).time, 123);
    a.send(JSON.stringify({ type: 'create', track: 'serra', laps: 1 }));
    const room = await ma((m) => m.type === 'lobby');
    a.send(JSON.stringify({ type: 'start' }));
    assert((await ma((m) => m.type === 'error')).message.includes('dois'));
    b = new WebSocket(base.replace('http', 'ws') + '/online', { origin: 'https://game.example' });
    const mb = messages(b); await once(b, 'open');
    b.send(JSON.stringify({ type: 'auth', ticket: (await api('online-ticket', {}, cb)).data.ticket }));
    await mb((m) => m.type === 'auth');
    b.send(JSON.stringify({ type: 'join', code: room.code }));
    await mb((m) => m.type === 'lobby' && m.players.length === 2);
    b.send(JSON.stringify({ type: 'start' }));
    a.send(JSON.stringify({ type: 'ready', ready: true })); b.send(JSON.stringify({ type: 'ready', ready: true }));
    await ma((m) => m.type === 'lobby' && m.players.length === 2 && m.players.every((p) => p.ready));
    a.send(JSON.stringify({ type: 'start' }));
    const state = await ma((m) => m.type === 'state');
    assert.equal(state.cars.filter((car) => car.player).length, 2);
    inputs = setInterval(() => a.send(JSON.stringify({ type: 'input', accelerate: true, x: 999999, completedLaps: 50 })), 40);
    const moving = await ma((m) => m.type === 'state' && m.phase === 'racing' && m.cars[0].speed > 0.1);
    assert(moving.cars[0].x < 10000 && moving.cars[0].completedLaps === 0);
    assert.equal(moving.cars[1].speed, 0);
    b.close(); await once(b, 'close');
    await ma((m) => m.type === 'state' && m.cars[1].disconnected);
    clearInterval(inputs); inputs = null;
    const changed = await api('password', { currentPassword: 'SenhaSegura_123', password: 'SenhaNova_45678' }, ca);
    assert.equal(changed.status, 200);
    assert.equal((await api('me', null, ca)).status, 401);
    assert.equal((await api('me', null, changed.cookie)).status, 200);
    assert.equal((await api('login', { username: 'player_one', password: 'SenhaSegura_123' })).status, 401);
    await pool.query('CREATE ROLE anonymous_test; SET ROLE anonymous_test');
    await assert.rejects(pool.query('SELECT * FROM neurodrive.players'), /permission denied/);
    await pool.query('RESET ROLE');
    console.log('OK: PostgreSQL, transações, sessões, troca de senha, isolamento do schema e corrida autoritativa com dois clientes WebSocket.');
  } finally {
    clearInterval(inputs); a?.terminate(); b?.terminate();
    if (server) { server.shutdownOnline(); await new Promise((resolve) => server.close(resolve)); }
    await pool.db.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
