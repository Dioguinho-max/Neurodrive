'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { WebSocket } = require('ws');
const { createApp } = require('../../server/server.cjs');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'neurodrive-lan-'));
const database = path.join(directory, 'accounts.sqlite');
let server, base;
const clients = [];
async function start() {
  server = createApp({ database, multiplayer: true, lanHosts: ['localhost','192.168.1.20'] });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
}
async function stop() { server.closeMultiplayer(); await new Promise(resolve => server.close(resolve)); }
async function api(route, body, cookie = '', origin = base) {
  const response = await fetch(base + '/api/' + route, { method: body ? 'POST' : 'GET',
    headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
function client(url) {
  const ws = new WebSocket(url, { origin: base }), queue = [], waiters = [];
  clients.push(ws);
  ws.on('message', raw => {
    const message = JSON.parse(raw); const index = waiters.findIndex(w => w.test(message));
    if (index < 0) queue.push(message); else { const waiter = waiters.splice(index, 1)[0]; clearTimeout(waiter.timer); waiter.resolve(message); }
  });
  return { ws, send: msg => ws.send(JSON.stringify(msg)), next(test) {
    const index = queue.findIndex(test); if (index >= 0) return Promise.resolve(queue.splice(index, 1)[0]);
    return new Promise((resolve, reject) => { const waiter = { test, resolve, timer: setTimeout(() => reject(new Error('LAN message timeout')), 10000) }; waiters.push(waiter); });
  } };
}
(async () => {
  try {
    await start();
    const config = (await api('config')).body;
    assert.deepEqual(config.lanOrigins,[`http://192.168.1.20:${server.address().port}`]);
    assert.equal(config.online, true); assert.equal(config.localRewards, true);
    const invalidHostStatus = await new Promise((resolve, reject) => {
      require('node:http').get(base + '/api/config', { headers: { Host: 'untrusted.example' } }, response => {
        response.resume(); resolve(response.statusCode);
      }).on('error', reject);
    });
    assert.equal(invalidHostStatus, 403);
    const alias = await fetch(`http://localhost:${server.address().port}/api/config`);
    assert.equal((await alias.json()).websocketUrl, `ws://localhost:${server.address().port}/online`);
    assert.equal((await api('online-ticket', {})).status, 401);
    assert.equal((await api('register', { username: 'blocked', password: 'TestPassword123' }, '', 'https://evil.example')).status, 403);
    const users = [];
    for (const username of ['lan_one', 'lan_two', 'lan_three', 'lan_four', 'lan_five', 'lan_six']) {
      const user = await api('register', { username, password: 'TestPassword123' }); assert.equal(user.status, 200); users.push(user);
    }
    const peers = [];
    for (const user of users) {
      const auth = await api('online-ticket', {}, user.cookie); assert.equal(auth.status, 200);
      const peer = client(config.websocketUrl); await once(peer.ws, 'open');
      peer.send({ type: 'auth', ticket: auth.body.ticket }); await peer.next(m => m.type === 'auth'); peers.push(peer);
    }
    peers[0].send({ type: 'create', track: 'veloz', laps: 5 });
    const lobby = await peers[0].next(m => m.type === 'lobby');
    for (const peer of peers.slice(1)) peer.send({ type: 'join', code: lobby.code });
    await peers[0].next(m => m.type === 'lobby' && m.players.length === 6);
    for (const peer of peers) peer.send({ type: 'ready', ready: true });
    await peers[0].next(m => m.type === 'lobby' && m.players.every(p => p.ready));
    peers[0].send({ type: 'start' });
    for (const [index, peer] of peers.entries()) {
      const state = await peer.next(m => m.type === 'state'); assert.equal(state.stage, 'qualifying'); assert.equal(state.cars.filter(c => c.player).length, 6);
      assert.equal(state.self, index + 1, 'Shared serialization must preserve each player identity');
    }
    const presence = await peers[0].next(m => m.type === 'presence' && m.players.length === 6 && m.players.every(p => Number.isFinite(p.ping)));
    assert(presence.players.every(p => p.ping >= 0), 'Server measures actual WebSocket round trips');
    const closed = once(peers[1].ws, 'close'); await api('logout', {}, users[1].cookie); await closed;
    await stop();
    await start();
    const login = await api('login', { username: 'lan_one', password: 'TestPassword123' });
    assert.equal(login.status, 200); assert.equal(login.body.player.username, 'lan_one');
    assert.equal((await fetch(base + '/server/data/accounts.sqlite')).status, 404);
    assert.equal((await fetch(base + '/online.html')).status, 200);
    const clip = await fetch(base + '/assets/radio/pt-BR/preview.wav');
    assert.equal(clip.status,200);assert.equal(clip.headers.get('content-type'),'audio/wav');
    assert.equal(Buffer.from(await clip.arrayBuffer()).toString('ascii',0,4),'RIFF');
    console.log('OK: LAN accounts persist, six players on one port, distinct identities, room/start, ping, logout and origin protection.');
  } finally {
    clients.forEach(ws => ws.terminate());
    if (server?.listening) await stop();
    assert(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(directory, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
