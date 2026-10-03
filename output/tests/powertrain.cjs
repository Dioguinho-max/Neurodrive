const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const host = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host);
function setup() {
  const race = host.createNeuroRace(host.NeuroTrack, 'normal', { transmission: 'manual' });
  for (let i = 0; i < 180; i++) race.step();
  race.cars.slice(1).forEach((car) => { car.done = true; });
  const car = race.cars[0];
  function step(input) { Object.assign(car, race.pointAt(car.progress)); race.step(input); }
  return { race, car, step };
}
const manual = setup();
for (let i = 0; i < 600; i++) manual.step({ accelerate: true });
assert.equal(manual.car.gear, 1, 'Manual não deve subir sozinho no corte');
assert(manual.car.speed * 54 < 35);
for (let i = 0; i < 30; i++) manual.step({ shiftUp: true, accelerate: true });
assert.equal(manual.car.gear, 2, 'Segurar a tecla deve trocar só uma vez');
manual.step({});
Object.assign(manual.car, { speed: 2, gear: 2, shiftTicks: 0 });
manual.step({ shiftDown: true });
assert.equal(manual.car.gear, 2, 'Redução acima do corte deve ser bloqueada');
manual.race.setTransmission('automatic');
assert(!manual.car.manual);
const brake = setup();
brake.car.speed = 2;
brake.step({ brake: true });
const firstDrop = 2 - brake.car.speed;
assert(firstDrop > 0 && firstDrop < 0.005, 'Primeiro toque não deve dar uma freada seca');
for (let i = 0; i < 25; i++) brake.step({ brake: true });
const speed = brake.car.speed;
brake.step({ brake: true });
assert(speed - brake.car.speed > firstDrop * 5, 'Pressão deve crescer ao segurar o freio');
for (let i = 0; i < 15; i++) brake.step({});
assert.equal(brake.car.brake, 0, 'Soltar deve liberar o freio');
console.log('OK: freio progressivo, câmbio manual, troca por toque, corte e proteção de redução.');
