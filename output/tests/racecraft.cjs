const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const host = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) {
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host);
}
const track = { ...host.NeuroTrack, halfWidth: 52, length: 20000,
  segments: [{ a: { x: 0, y: 0 }, dx: 20000, dy: 0, start: 0, size: 20000 }],
  nearest: (x, y) => ({ x, y: 0, distance: Math.abs(y), progress: x, tx: 1, ty: 0 }),
  contains: (x, y, margin = 0) => Math.abs(y) < 52 - margin };
function setup(playerX = 1060, playerLane = 0, playerSpeed = 1.5) {
  const race = host.createNeuroRace(track, 'normal');
  for (let i = 0; i < 180; i++) race.step();
  race.cars.forEach((car, index) => Object.assign(car, { ...race.pointAt(index ? 1000 : playerX, index ? 0 : playerLane),
    progress: index ? 1000 : playerX, speed: index ? 2.8 : playerSpeed, done: index > 1, gear: 4, rpm: 4000 }));
  return race;
}
const passing = setup();
passing.step();
const ai = passing.cars[1];
assert.equal(Math.abs(ai.targetLane), 26, 'Escolhe faixa livre para ultrapassar');
const chosen = Math.sign(ai.targetLane);
for (let i = 0; i < 35; i++) passing.step();
assert.equal(Math.sign(ai.targetLane), chosen, 'Mantém decisão em vez de ziguezaguear');
for (let i = 0; i < 350; i++) passing.step();
assert(ai.progress > passing.cars[0].progress, `Conclui ultrapassagem: IA ${ai.progress}/${ai.y}/${ai.speed}, jogador ${passing.cars[0].progress}, alvo ${ai.targetLane}`);
assert(!ai.offRoad, 'Ultrapassagem permanece no asfalto');
const blocked = setup();
for (const [index, lane] of [[2, -26], [3, 26]]) Object.assign(blocked.cars[index], { ...blocked.pointAt(1045, lane), progress: 1045, done: false });
blocked.step();
assert.equal(blocked.cars[1].targetLane, 0, 'Não invade uma faixa ocupada');
const alongside = setup(1002, 18, 2.8);
alongside.step();
assert(alongside.cars[1].targetLane < 0, 'Abre espaço para carro lado a lado');
const defending = setup(940, 0, 3.2);
defending.step();
assert(defending.cars[1].targetLane > 0, 'Defesa antecipada com adversário ainda atrás');
console.log('OK: ultrapassagem completa, decisão estável, faixas bloqueadas, espaço lateral e defesa antecipada.');
