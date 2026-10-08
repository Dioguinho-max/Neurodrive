const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js', 'neurodrive-prediction.js']) {
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(api);
}
for (const manual of [false, true]) {
  const track = api.createNeuroTrack('serra');
  const race = api.createNeuroRace(track, 'normal', { transmission: manual ? 'manual' : 'auto' });
  race.cars.slice(1).forEach((car) => { car.done = true; });
  for (let i = 0; i < 180; i++) race.step();
  for (let i = 0; i < 600; i++) {
    const input = { accelerate: i < 450, brake: i >= 450, right: i > 200 && i < 320, shiftUp: i === 150 || i === 300, shiftDown: i === 500 };
    const predicted = structuredClone(race.cars[0]);
    api.predictNeuroCar(track, predicted, input);
    race.step(input);
    for (const key of ['x', 'y', 'angle', 'speed', 'rpm', 'gear', 'steering', 'brake', 'bodyRoll']) {
      assert(Math.abs(predicted[key] - race.cars[0][key]) < 1e-9, `${key} must match server physics (frame ${i}, manual=${manual})`);
    }
  }
}
const track = api.createNeuroTrack('veloz');
const source = api.createNeuroRace(track).cars[0];
const predictor = api.createOnlinePrediction(track);
predictor.input({ accelerate: true }, 0);
predictor.receive(source, 'racing', 0, 120);
const start = predictor.sample(0), moved = predictor.sample(70);
assert(moved.speed > start.speed, 'Local throttle responds before another server snapshot');
assert.equal(source.speed, 0, 'Prediction must not mutate authoritative data');
predictor.input({ brake: true }, 80);
const braking = predictor.sample(130);
assert(braking.brake > 0, 'Brake responds before another snapshot');
const stopped = predictor.sample(200), later = predictor.sample(5000);
assert.equal(stopped.x, later.x, 'Stop extrapolating during a prolonged network outage');
predictor.receive({ ...source, x: source.x + 150, cooldown: 30 }, 'racing', 5100, 120);
assert.equal(predictor.sample(5100).x, source.x + 150, 'Recovery must snap without crossing the track');
predictor.receive({ ...source, done: true, speed: 0 }, 'finished', 5200, 120);
assert.equal(predictor.sample(5300).speed, 0, 'Server finish overrides prediction');
predictor.receive({ ...source, pitState: 'service', pitTimer: 240, speed: 0 }, 'racing', 5400, 120);
predictor.input({ accelerate: true, left: true }, 5400);
assert.equal(predictor.sample(5500).speed, 0, 'Piloto não acelera durante a troca');
assert.equal(predictor.sample(5500).x, source.x, 'Servidor controla o atendimento');
console.log('OK: identical driving physics, instant input, braking, no authoritative mutation, outage limit, recovery and finish.');
