const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const nodes = Object.fromEntries([...read('online.html').matchAll(/id="([^"]+)"/g)].map((m) => [m[1], {
  textContent: '', value: '', hidden: false, open: false, style: {}, dataset: {},
  setAttribute() {}, replaceChildren() {}, append() {}, showModal() { this.open = true; }, close() { this.open = false; },
}]));
const listeners = {}, intervals = new Map();
let now = 0, frame, drawn;
const windowMock = { addEventListener: (name, fn) => { listeners[name] = fn; }, matchMedia: () => ({ matches: false }),
  createNeuroTrack3D: () => ({ update(cars) { drawn = cars; }, dispose() {} }) };
const documentMock = { hidden: false, getElementById: (id) => { assert(nodes[id], id); return nodes[id]; },
  querySelectorAll: () => [], addEventListener() {}, createElement: () => ({ dataset: {} }) };
let socket;
class Socket { static OPEN = 1; constructor() { socket = this; this.readyState = 1; this.sent = []; } send(data) { this.sent.push(JSON.parse(data)); } }
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js', 'neurodrive-hud.js', 'neurodrive-online-buffer.js', 'neurodrive-prediction.js']) new Function('window', read(file))(windowMock);
new Function('window', 'document', 'WebSocket', 'fetch', 'performance', 'setInterval', 'requestAnimationFrame', read('online.js'))(
  windowMock, documentMock, Socket, async (url) => ({ ok: true, async json() { return url.endsWith('/config') ? { online: true, websocketUrl: 'ws://test' } : { ticket: 'test' }; } }),
  { now: () => now }, (fn, ms) => intervals.set(ms, fn), (fn) => { frame = fn; },
);
(async () => {
  await nodes['online-connect'].onclick(); socket.onopen();
  const receive = (data) => socket.onmessage({ data: JSON.stringify(data) });
  receive({ type: 'auth', id: '1', name: 'test' });
  const race = windowMock.createNeuroRace(windowMock.createNeuroTrack('serra'));
  for (let i = 0; i < 180; i++) race.step();
  receive({ type: 'state', cars: race.cars, self: 1, track: 'serra', phase: 'racing', laps: 3, elapsed: 0 });
  assert.equal(nodes['online-lobby'].open, false);
  listeners.keydown({ code: 'KeyW', target: { tagName: 'BODY' }, preventDefault() {} });
  now = 1; intervals.get(16)(); now = 70; frame();
  assert(drawn[0].speed > 0, 'Online page renders local input without a new snapshot');
  assert.equal(race.cars[0].speed, 0);
  now = 120; receive({ type: 'pong', time: 0 });
  assert.match(nodes['online-connection'].textContent, /120 ms/);
  listeners.blur(); now = 140; frame(); assert(drawn[0].brake > 0);
  receive({ type: 'left' }); assert.equal(nodes['online-hud'].hidden, true);
  console.log('OK: online page integrates prediction, input, blur braking, ping and room cleanup.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
