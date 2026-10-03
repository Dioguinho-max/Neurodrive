const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const host = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) {
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host);
}
for (const definition of host.NeuroTracks) {
  const track = host.createNeuroTrack(definition.id);
  assert(track.points.every((point) => track.contains(point.x, point.y, 9)));
  const session = host.createNeuroRace(track, 'normal', { session: 'qualifying' });
  session.cars.forEach((car) => { car.player = false; });
  for (let i = 0; i < 18500 && session.phase !== 'finished'; i++) session.step();
  assert.equal(session.phase, 'finished');
  const timed = session.standings().filter((car) => car.bestLap !== null);
  assert(timed.length >= 5, `${definition.name}: faltam voltas válidas (${timed.length}/6)`);
  for (let i = 1; i < timed.length; i++) assert(timed[i].bestLap >= timed[i - 1].bestLap);
  const grid = session.gridOrder();
  const race = host.createNeuroRace(track, 'normal', { grid });
  assert.deepEqual(race.standings().map((car) => car.id), grid);
  assert.equal(race.cars[0].player, true);
  console.log(`${definition.name}: ${timed.length} tempos válidos; pole ${timed[0].bestLap.toFixed(2)} s; grid ${grid.join(', ')}.`);
}

const early = host.createNeuroRace(host.NeuroTrack, 'normal', { session: 'qualifying' });
for (let i = 0; i < 180; i++) early.step();
early.recoverPlayer();
assert(early.cars[0].invalidLap);
early.cars[1].bestLap = 60;
early.cars[2].bestLap = 55;
early.endQualifying();
assert.equal(early.phase, 'finished');
assert.deepEqual(early.gridOrder().slice(0, 2), [3, 2]);
assert(early.gridOrder().indexOf(1) > 1);
console.log('OK: invalidação, encerramento antecipado e pilotos sem tempo atrás dos classificados.');

const timeout = host.createNeuroRace(host.NeuroTrack, 'normal', { session: 'qualifying' });
timeout.cars.forEach((car) => { car.player = true; });
for (let i = 0; i < 18500 && timeout.phase !== 'finished'; i++) timeout.step();
assert.equal(timeout.phase, 'finished');
assert(timeout.elapsed >= 300 && timeout.elapsed < 301);
assert(timeout.cars.every((car) => car.bestLap === null));
console.log('OK: classificação encerra em cinco minutos mesmo sem voltas concluídas.');
