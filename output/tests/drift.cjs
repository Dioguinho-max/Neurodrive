const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) {
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(api);
}
for (const config of api.NeuroTracks) {
  const track = api.createNeuroTrack(config.id);
  const race = api.createNeuroRace(track, 'normal', { mode: 'drift', session: 'qualifying', weather: 'rain', laps: 50 });
  assert(race.drift && !race.qualifying);
  assert.equal(race.cars.length, 1);
  const car = race.cars[0], point = track.pointAt(900);
  assert.equal(car.weatherMode, 'dry');
  assert.equal(car.tyreWearEnabled, false);
  assert.equal(race.requestPit(1), false);
  for (let i = 0; i < 180; i++) race.step();
  function slide() {
    Object.assign(car, point, { angle: point.angle + .5, driftHeading: point.angle, speed: 1.5, steering: 0 });
    race.step({ accelerate: true });
  }
  for (let i = 0; i < 240; i++) slide();
  assert(race.driftScore.combo > 100 && race.driftScore.multiplier >= 2);
  assert.notEqual(car.angle, car.driftHeading, 'Travel direction differs from body heading');
  for (let i = 0; i < 80; i++) {
    Object.assign(car, point, { driftHeading: point.angle, speed: 0, steering: 0 });
    race.step();
  }
  assert(race.driftScore.total > 100);
  const banked = race.driftScore.total;
  for (let i = 0; i < 30; i++) slide();
  car.x += 2000; race.step();
  assert.equal(race.driftScore.combo, 0, 'Leaving the road loses only pending points');
  assert.equal(race.driftScore.total, banked);
  race.recoverPlayer();
  for (let i = 0; i < 125; i++) race.step();
  for (let i = 0; i < 20; i++) slide();
  race.recoverPlayer();
  assert.equal(race.driftScore.combo, 0);
  while (race.phase !== 'finished') race.step();
  assert(race.elapsed >= 120 && race.elapsed < 121);
  assert.equal(car.bestLap, null);
  assert.equal(car.recordLap, null);
  const result = race.driftScore.total;
  race.step({ accelerate: true });
  assert.equal(race.driftScore.total, result);
}
console.log('OK: drift scoring, banking, multiplier, invalidation, reset, timer and isolated lap records.');
// Isolate handling on an unlimited flat test surface, without wall/grass drag.
const base = api.createNeuroTrack('serra');
const flat = { ...base, halfWidth: 100000, contains: () => true,
  nearest: (x, y) => ({ x, y: 0, tx: 1, ty: 0, distance: Math.abs(y), progress: x }) };
function testCar(speed) {
  return { ...api.createNeuroRace(base, 'normal', { mode: 'drift' }).cars[0],
    x: 0, y: 0, angle: 0, driftHeading: 0, speed, gear: speed > 3 ? 6 : 3 };
}
const fast = testCar(200 / 54);
api.predictNeuroCar(flat, fast, { accelerate: true, right: true });
assert(Math.abs(fast.driftYaw) < .002, 'Turning must build progressively');
for (let i = 0; i < 90; i++) api.predictNeuroCar(flat, fast, { accelerate: true, right: true });
assert(Math.abs(fast.angle - fast.driftHeading) < .16, '200 km/h cannot sustain an easy large-angle drift');
const scrub = testCar(200 / 54);
scrub.angle = .6;
const initialSpeed = scrub.speed;
api.predictNeuroCar(flat, scrub, { accelerate: true });
assert(scrub.speed < initialSpeed, 'Sliding consumes speed even under throttle');
const medium = testCar(85 / 54);
for (let i = 0; i < 90; i++) api.predictNeuroCar(flat, medium, { accelerate: true, right: true });
const slipBefore = Math.abs(medium.angle - medium.driftHeading);
assert(slipBefore > .17, 'Drifting remains possible at moderate speeds');
const yawBefore = medium.driftYaw;
api.predictNeuroCar(flat, medium, { left: true });
assert(Math.abs(medium.driftYaw - yawBefore) < .003, 'Countersteer must not snap rotation');
for (let i = 0; i < 35; i++) api.predictNeuroCar(flat, medium, {});
assert(Math.abs(medium.angle - medium.driftHeading) < slipBefore, 'Lifting recovers grip');
console.log('OK: high-speed grip limit, progressive rotation, tire scrub and smooth recovery.');
