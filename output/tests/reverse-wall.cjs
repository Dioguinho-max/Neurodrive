const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) {
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(api);
}
for (const config of api.NeuroTracks) {
  const track = api.createNeuroTrack(config.id);
  const race = api.createNeuroRace(track);
  race.cars.slice(1).forEach(car => { car.done = true; });
  for (let i = 0; i < 180; i++) race.step();
  const car = race.cars[0];
  Object.assign(car, track.pointAt(900), { speed: 0 });
  for (let i = 0; i < 150; i++) {
    const predicted = structuredClone(car);
    api.predictNeuroCar(track, predicted, { brake: true });
    race.step({ brake: true });
    for (const key of ['x', 'y', 'speed', 'gear', 'rpm']) assert.equal(car[key], predicted[key]);
  }
  assert.equal(car.gear, 0);
  assert(car.speed < -.2 && car.speed >= -25 / 54);
  const life = car.tyreLife;
  for (let i = 0; i < 100; i++) race.step({ accelerate: true });
  assert.equal(car.gear, 1);
  assert(car.speed > 0);
  assert(car.tyreLife <= life, 'Reversing never restores tire life');
  for (const side of [-1, 1]) {
    const p = track.pointAt(900, side * (track.halfWidth + 35));
    const stuck = { ...car, ...p, angle: p.angle + side * Math.PI / 2,
      speed: .1, gear: 1, brake: 0, reverseHold: 0, wallContact: false };
    for (let i = 0; i < 20; i++) api.predictNeuroCar(track, stuck, { accelerate: true });
    const distance = track.nearest(stuck.x, stuck.y).distance;
    for (let i = 0; i < 180; i++) api.predictNeuroCar(track, stuck, { brake: true });
    assert(track.nearest(stuck.x, stuck.y).distance < distance - 15, 'Reverse escapes both barriers');
  }
  const manual = { ...car, ...track.pointAt(900), speed: 0, gear: 1,
    manual: true, shiftTicks: 0, lastShift: 0 };
  api.predictNeuroCar(track, manual, { shiftDown: true });
  assert.equal(manual.gear, 0);
  for (let i = 0; i < 100; i++) api.predictNeuroCar(track, manual, { accelerate: true });
  assert(manual.speed < 0);
  api.predictNeuroCar(track, manual, { shiftUp: true });
  assert.equal(manual.gear, 0, 'Cannot select forward while reversing');
  for (let i = 0; i < 100; i++) api.predictNeuroCar(track, manual, { brake: true, noReverse: true });
  assert.equal(manual.speed, 0);
  const parked = { ...car, speed: 0, gear: 1, manual: false };
  for (let i = 0; i < 100; i++) api.predictNeuroCar(track, parked, { brake: true, noReverse: true });
  assert.equal(parked.speed, 0, 'Lost connection/blur braking must never engage reverse');
}
console.log('OK: reverse, manual lockout, prediction parity, barrier escape and safe stop on all tracks.');
