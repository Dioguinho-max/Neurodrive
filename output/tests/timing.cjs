const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const host = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) {
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host);
}
const track = host.NeuroTrack;
assert.equal(host.createNeuroRace(track, 'normal', { laps: 50 }).laps, 50);
for (const laps of [0, -1, 51, 2.5, NaN]) assert.equal(host.createNeuroRace(track, 'normal', { laps }).laps, 3);
assert.equal(host.createNeuroRace(track, 'normal', { session: 'qualifying', laps: 50 }).laps, 3);
for (const laps of [1, 5]) {
  const race = host.createNeuroRace(track, 'normal', { laps });
  race.cars.forEach((car) => { car.player = false; });
  for (let tick = 0; tick < 25000 && race.phase !== 'finished'; tick++) race.step();
  const car = race.cars[0];
  assert.equal(race.phase, 'finished');
  assert.equal(car.completedLaps, laps);
  assert.equal(car.checkpoint, laps * 12);
  assert(car.lastLap > 0 && car.bestLap > 0);
  assert.equal(car.checkpointTimes[laps * 12], car.finishTime);
  assert.equal(car.lastLapKind, 'válida');
  if (laps === 1) assert.equal(car.bestLap, car.finishTime);
  for (let i = 2; i < car.checkpointTimes.length; i++) assert(car.checkpointTimes[i] > car.checkpointTimes[i - 1]);
  console.log(`OK: ${laps} volta(s), melhor volta ${car.bestLap.toFixed(2)} s, tempos de checkpoint e chegada consistentes.`);
}
