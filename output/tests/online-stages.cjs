const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { once } = require('node:events');
const { createRequire } = require('node:module');
const { WebSocket } = require('ws');
const filename = path.resolve(__dirname, '../../server/online.cjs');
const moduleMock = { exports: {} };
let tick;
new Function('require', 'module', '__dirname', 'setInterval', 'clearInterval',
  fs.readFileSync(filename, 'utf8') + '\nmodule.exports.engine = engine;')(
  createRequire(filename), moduleMock, path.dirname(filename), fn => { tick = fn; return 1; }, () => {});
const { attachOnline, engine } = moduleMock.exports;
const createRace = engine.createNeuroRace, races = [];
engine.createNeuroRace = (...args) => { const race = createRace(...args); races.push(race); return race; };
function inbox(ws) {
  const queue = [], waiting = [];
  ws.on('message', raw => { const msg = JSON.parse(raw); const i = waiting.findIndex(item => item.test(msg));
    if (i < 0) queue.push(msg); else { const item = waiting.splice(i, 1)[0]; clearTimeout(item.timer); item.resolve(msg); }
  });
  return test => { const i = queue.findIndex(test); if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
    return new Promise((resolve, reject) => { const item = { test, resolve }; item.timer = setTimeout(() => reject(new Error('Missing online stage: ' + test.toString())), 3000); waiting.push(item); }); };
}
(async () => {
  const server = http.createServer(), awards = [];
  const online = attachOnline(server, { origin: 'http://test', store: {
    profile: async id => ({ username: `Pilot_${id}`, equipped: 'original' }),
    award: async (...args) => { awards.push(args); return 70; },
  } });
  let a, b;
  try {
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    async function connect(id) {
      const ws = new WebSocket(`ws://127.0.0.1:${server.address().port}/online`, { origin: 'http://test' });
      const next = inbox(ws); await once(ws, 'open'); ws.send(JSON.stringify({ type: 'auth', ticket: online.issue(id) }));
      await next(m => m.type === 'auth'); return { ws, next, send: data => ws.send(JSON.stringify(data)) };
    }
    a = await connect('a'); b = await connect('b');
    a.send({ type: 'create', track: 'serra', laps: 5 }); const room = await a.next(m => m.type === 'lobby');
    b.send({ type: 'join', code: room.code }); await b.next(m => m.type === 'lobby');
    a.send({ type: 'ready', ready: true }); b.send({ type: 'ready', ready: true });
    await a.next(m => m.type === 'lobby' && m.players.length === 2 && m.players.every(p => p.ready));
    a.send({ type: 'start' }); const first = await a.next(m => m.type === 'state');
    assert.equal(first.stage, 'qualifying'); assert(first.cars.every(car => car.pitExit));
    assert.equal(first.laps, 3); assert(first.cars.every(car => !car.rewardPending));
    races[0].cars.forEach((car, index) => { car.bestLap = 50 - index; car.finishTime = 100; car.done = true; });
    races[0].endQualifying(); for (let i = 0; i < 3; i++) tick();
    const waiting = await a.next(m => m.stage === 'waiting');
    assert.equal(waiting.phase, 'waiting'); assert.equal(waiting.waiting, 10);
    assert.deepEqual(waiting.grid.map(car => car.id), [6, 5, 4, 3, 2, 1]);
    assert.equal(awards.length, 0, 'ClassificaÃ§Ã£o nunca concede moedas');
    b.ws.close(); await once(b.ws, 'close'); await new Promise(resolve => setImmediate(resolve));
    for (let i = 0; i < 603; i++) { tick(); if (i % 15 === 0) await new Promise(resolve => setImmediate(resolve)); }
    const race = await a.next(m => m.stage === 'race');
    assert.equal(race.phase, 'countdown'); assert.equal(race.laps, 5);
    assert.equal(race.cars.find(car => car.id === 6).progress, 0, 'Pole usa melhor volta');
    assert.equal(race.cars[0].progress, -150, 'Jogador conserva identidade no novo grid');
    assert(race.cars[1].disconnected && race.cars[1].done, 'DesconexÃ£o nÃ£o reaparece na largada');
    assert.equal(race.cars[0].completedLaps, 0); assert.equal(race.cars[0].tyreLife, 1);
    Object.assign(races[1].cars[0], { done: true, finishTime: 120, place: 1 });
    for (let i = 0; i < 185; i++) { tick(); if (i % 15 === 0) await new Promise(resolve => setImmediate(resolve)); }
    await a.next(m => m.stage === 'race' && m.phase === 'finished');
    await new Promise(resolve => setImmediate(resolve)); tick();
    assert.equal(awards.length, 1); assert.equal(awards[0][0], 'a'); assert.equal(awards[0][2], 5);
    console.log('OK: classificaÃ§Ã£o sem moedas, espera, grid por tempo, desconexÃ£o, corrida e recompensa Ãºnica.');
  } finally { a?.ws.terminate(); b?.ws.terminate(); online.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });

