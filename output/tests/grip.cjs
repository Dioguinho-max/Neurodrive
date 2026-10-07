const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const host = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) {
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host);
}
function probe(speed, offset = 0, steering = 0.5) {
  const race = host.createNeuroRace(host.NeuroTrack, 'normal', { session: 'qualifying' });
  for (let i = 0; i < 180; i++) race.step();
  race.cars.slice(1).forEach((car) => { car.done = true; });
  const car = race.cars[0];
  Object.assign(car, race.pointAt(150, offset), { progress: 150, speed, steering, gear: speed > 3 ? 6 : 2 });
  const previousAngle = car.angle;
  race.step({ right: true, accelerate: true });
  return { race, car, yaw: Math.abs(car.angle - previousAngle) };
}
const fast = probe(205 / 54);
const slow = probe(0.65);
assert(fast.car.sliding);
assert(!slow.car.sliding);
assert(fast.yaw / fast.car.speed < slow.yaw / slow.car.speed, 'Velocidade alta deve abrir o raio da curva');
assert(fast.yaw * (205 / 54) * 900 <= 2.6 * 9.81 + 0.001);
assert(!probe(205 / 54, 0, 0.15).car.sliding, 'Comando suave a 205 km/h deve manter aderência');
assert(!probe(160 / 54, 0, 0.25).car.sliding, 'Curva moderada a 160 km/h deve manter aderência');
assert(!probe(205 / 54, 0, 0.25).car.sliding, 'Curva moderada deve ficar mais tolerante também em alta');
const grass = probe(1.4, host.NeuroTrack.halfWidth + 10, 0);
assert(grass.car.offRoad);
const asphalt = probe(1.4, 0, 0);
assert(grass.car.speed < asphalt.car.speed, 'Grama deve oferecer mais resistência que o asfalto');
assert(asphalt.car.speed - grass.car.speed < 0.002, 'Penalidade do gramado deve ser suave');
for (let i = 0; i < 100; i++) fast.race.step({ right: true, accelerate: true });
assert(fast.car.offRoad, 'Uma curva fechada em alta deve levar à área de escape');
assert(Number.isFinite(fast.car.x) && Number.isFinite(fast.car.bodyRoll));
assert.equal(fast.car.invalidLap, false);
console.log('OK: limite de aderência, subesterço em alta, gramado e inclinação da carroceria.');
