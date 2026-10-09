const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const host = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host);
const track = host.createNeuroTrack('veloz');
const race = host.createNeuroRace(track, 'normal', { laps: 5 });
race.cars.slice(1).forEach(car => { car.done = true; });
for (let i = 0; i < 180; i++) race.step({});
const car = race.cars[0];
Object.assign(car, track.pointAt(500), { speed: 3, tyreLife: .00001 });
for (let i = 0; i < 120; i++) {
  const predicted = structuredClone(car), input = { accelerate: true, right: i > 40 && i < 70 };
  host.predictNeuroCar(track, predicted, input); race.step(input);
  for (const key of ['x', 'y', 'angle', 'speed', 'tyreLife', 'tyreDistance', 'burstWheel']) assert(Math.abs(predicted[key] - car[key]) < 1e-9, key);
  assert.equal(predicted.tyreBurst, car.tyreBurst);
}
assert(car.tyreBurst); assert.equal(car.tyreLife, 0); assert(car.speed * 54 < 70, 'Pneu estourado impede manter alta velocidade');
race.recoverPlayer(); assert(car.tyreBurst, 'Reposicionar nao troca os pneus');
for (let i = 0; i < 120; i++) race.step({});
Object.assign(car, track.pointAt(21), { speed: .5, cooldown: 0 });
assert(race.requestPit(1));
for (let i = 0; i < 2400 && !car.pitStops; i++) race.step({});
assert.equal(car.pitStops, 1); assert.equal(car.tyreBurst, false); assert.equal(car.burstWheel, -1); assert.equal(car.tyreLife, 1);
// Trecho reto sem paredes permite comparar desgaste e arrasto sem colisões.
const straight = { ...track, length: 10000, contains: () => true, nearest: (x, y) => ({ distance: Math.abs(y), progress: x, x, y: 0, tx: 1, ty: 0 }) };
const clean = host.createNeuroRace(track, 'normal', { laps: 5 }).cars[0];
Object.assign(clean, { x: 0, y: 0, angle: 0, speed: 3 });
const stressed = structuredClone(clean), flat = { ...structuredClone(clean), tyreBurst: true, burstWheel: 2, tyreLife: 0 };
for (let i = 0; i < 120; i++) {
  host.predictNeuroCar(straight, clean, { accelerate: true });
  host.predictNeuroCar(straight, stressed, { accelerate: true, right: true });
  host.predictNeuroCar(straight, flat, { accelerate: true });
}
assert(stressed.tyreLife < clean.tyreLife, 'Forcar curvas aumenta o desgaste');
assert(Math.abs(flat.angle) > .08, 'Pneu estourado desvia mesmo sem virar');
assert(flat.speed < clean.speed * .5);
const short = host.createNeuroRace(track, 'normal', { laps: 3 }).cars[0];
for (let i = 0; i < 600; i++) host.predictNeuroCar(straight, short, { accelerate: true });
assert.equal(short.tyreLife, 1); assert.equal(short.tyreBurst, false);
console.log('OK: desgaste, estouro, direcao comprometida, previsao identica, recuperacao sem reparo e troca nos boxes.');
