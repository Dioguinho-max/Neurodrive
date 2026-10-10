const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const nodes = Object.fromEntries([...read('online.html').matchAll(/id="([^"]+)"/g)].map((m) => [m[1], {
  textContent: '', value: '', hidden: false, open: false, style: {}, dataset: {},
  setAttribute() {}, replaceChildren() {}, append() {}, showModal() { this.open = true; }, close() { this.open = false; },
}]));
const listeners = {}, intervals = new Map();
const touchButtons = Object.fromEntries(['left', 'right', 'brake', 'accelerate', 'shiftDown', 'shiftUp'].map(action => [action, {
  dataset: { drive: action }, hidden: false, attributes: {}, setPointerCapture() {},
  setAttribute(name, value) { this.attributes[name] = value; },
}]));
let now = 0, frame, drawn;
const windowMock = { addEventListener: (name, fn) => { listeners[name] = fn; }, matchMedia: () => ({ matches: false }),
  createNeuroTrack3D: () => ({ update(cars) { drawn = cars; }, dispose() {} }) };
const documentMock = { hidden: false, getElementById: (id) => { assert(nodes[id], id); return nodes[id]; },
  querySelectorAll: selector => selector === '[data-drive]' ? Object.values(touchButtons) : selector === '.race-shift' ? [touchButtons.shiftDown, touchButtons.shiftUp] : [], addEventListener() {}, createElement: () => ({ dataset: {} }) };
let socket;
class Socket { static OPEN = 1; constructor() { socket = this; this.readyState = 1; this.sent = []; } send(data) { this.sent.push(JSON.parse(data)); } }
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js', 'neurodrive-hud.js', 'neurodrive-online-buffer.js', 'neurodrive-prediction.js']) new Function('window', read(file))(windowMock);
new Function('window','document',read('neurodrive-achievements.js'))(windowMock,documentMock);
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
  receive({ type: 'state', raceId:'r1', cars: race.cars, self: 1, track: 'serra', phase: 'racing', laps: 3, elapsed: 0 });
  receive({type:'record',raceId:'r1',id:'r1:lap2',stage:'race',track:'serra',previous:47000,milliseconds:45000,improvement:2000,circuit:true,summary:{previous:47000,milliseconds:45000}});
  assert.match(nodes['online-improvement'].textContent,/2\.000 s/);
  assert.equal(nodes['record-celebration'].hidden,false);
  receive({type:'record',raceId:'old',id:'old:lap2',stage:'race',summary:{previous:47000,milliseconds:1000}});
  assert.match(nodes['online-improvement'].textContent,/2\.000 s/,'Old room cannot overwrite result');
  assert.equal(nodes['online-lobby'].open, false);
  assert.equal(nodes['online-ready'].hidden, true, 'Pronto não aparece durante corrida');
  assert.equal(nodes['online-start'].hidden, true, 'Largar não aparece após largada');
  assert.equal(nodes['online-manual'].disabled, true);
  assert.equal(touchButtons.shiftUp.hidden, true, 'Automatico oculta trocas manuais');
  const pointer = pointerId => ({ pointerId, preventDefault() {} });
  touchButtons.accelerate.onpointerdown(pointer(1));
  touchButtons.right.onpointerdown(pointer(2));
  now = 1; intervals.get(16)();
  assert.equal(socket.sent.at(-1).accelerate, true);
  assert.equal(socket.sent.at(-1).right, true, 'Acelera e vira simultaneamente');
  touchButtons.right.onpointercancel(pointer(2));
  now = 80; intervals.get(16)();
  assert.equal(socket.sent.at(-1).accelerate, true, 'Soltar direcao preserva pedal');
  assert.equal(Boolean(socket.sent.at(-1).right), false);
  touchButtons.accelerate.onpointerdown(pointer(3));
  touchButtons.accelerate.onpointerup(pointer(1));
  assert.equal(touchButtons.accelerate.attributes['aria-pressed'], 'true');
  listeners.blur();
  assert.equal(touchButtons.accelerate.attributes['aria-pressed'], 'false', 'Perder foco libera pedal');
  now = 0;
  listeners.keydown({ code: 'KeyW', target: { tagName: 'BODY' }, preventDefault() {} });
  now = 1; intervals.get(16)(); now = 70; frame();
  assert(drawn[0].speed > 0, 'Online page renders local input without a new snapshot');
  assert.equal(race.cars[0].speed, 0);
  now = 120; receive({ type: 'pong', time: 0 });
  assert.match(nodes['online-connection'].textContent, /120 ms/);
  listeners.blur(); now = 140; frame(); assert(drawn[0].brake > 0);
  const qualifying = windowMock.createNeuroRace(windowMock.createNeuroTrack('serra'), 'normal', { session: 'qualifying', pitStart: true });
  receive({ type: 'state', stage: 'qualifying', cars: qualifying.cars, self: 1, track: 'serra', phase: 'racing', laps: 3, elapsed: 3 });
  assert.match(nodes['race-banner'].textContent, /boxes/);
  const grid = qualifying.cars.map((car, i) => ({ id: car.id, name: car.name, bestLap: 40 + i }));
  receive({ type: 'state', stage: 'waiting', grid, waiting: 10, cars: qualifying.cars, self: 1, track: 'serra', phase: 'waiting', laps: 3, elapsed: 100 });
  assert.equal(nodes['online-lobby'].open, true);
  assert.equal(nodes['online-grid'].hidden, false);
  assert.match(nodes['online-grid-title'].textContent, /10 s/);
  receive({ type: 'state', stage: 'race', cars: race.cars, self: 1, track: 'serra', phase: 'countdown', laps: 5, elapsed: 0 });
  assert.equal(nodes['online-lobby'].open, false);
  assert.equal(nodes['online-grid'].hidden, true);
  const finished = race.cars.map((car, i) => ({ ...car, done: true, place: i + 1, finishTime: 100 + i }));
  receive({ type: 'state', stage: 'race', cars: finished, self: 1, track: 'serra', phase: 'finished', laps: 5, elapsed: 100 });
  assert.equal(nodes['online-podium'].hidden, true, 'Pódio acontece na pista');
  assert.equal(nodes['online-lobby'].open, false, 'Resultados aguardam a cerimônia');
  for (let i = 0; i < 125; i++) { now += 100; frame(); }
  assert.equal(nodes['online-lobby'].open, true);
  assert.equal(nodes['online-title'].textContent, 'Celebração no pódio');
  receive({ type: 'left' }); assert.equal(nodes['online-hud'].hidden, true);
  assert.equal(nodes['online-ready'].hidden, false);
  assert.equal(nodes['online-manual'].disabled, false);
  assert.equal(nodes['online-recover'].disabled, true, 'Não reposiciona fora da corrida');
  console.log('OK: online page integrates prediction, input, blur braking, ping and room cleanup.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
