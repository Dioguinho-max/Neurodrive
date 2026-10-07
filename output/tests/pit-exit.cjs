const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const host = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) {
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host);
}
for (const config of host.NeuroTracks) {
  const track = host.createNeuroTrack(config.id);
  const race = host.createNeuroRace(track, 'normal', { session: 'qualifying', pitStart: true });
  assert(race.cars.every((car) => car.pitExit));
  for (const [i, car] of race.cars.entries()) {
    const garage = track.pit.garage(i), p = track.pointAt(garage.distance, garage.lane);
    assert(Math.hypot(car.x - p.x, car.y - p.y) < 0.001);
  }
  const released = new Set();
  for (let step = 0; step < 2200 && released.size < 6; step++) {
    const before = race.cars.map((car) => ({ pit: car.pitExit, x: car.x, y: car.y }));
    race.step({ accelerate: true });
    for (let a = 0; a < race.cars.length; a++) {
      for (let b = a + 1; b < race.cars.length; b++) {
        const first = race.cars[a], second = race.cars[b];
        if (first.pitExit && second.pitExit) assert(Math.hypot(first.x - second.x, first.y - second.y) > 17, 'Carros não devem se sobrepor nos boxes');
      }
    }
    race.cars.forEach((car, i) => {
      if (before[i].pit) {
        assert(car.speed <= track.pit.limit + 1e-8);
        assert(Math.hypot(car.x - before[i].x, car.y - before[i].y) <= track.pit.limit + 1e-6, 'Sem teletransporte na saída');
        assert.equal(car.bestLap, null, 'Percurso dos boxes não pode contar como volta válida');
        if (!car.pitExit) {
          released.add(car.id);
          assert(track.contains(car.x, car.y, 8));
          assert.equal(car.completedLaps, 0);
          assert.equal(car.invalidLap, false);
        }
      }
    });
  }
  assert.equal(released.size, 6, `${config.id}: todos devem sair dos boxes`);
  const grid = host.createNeuroRace(track, 'normal', { session: 'race' });
  assert(grid.cars.every((car) => !car.pitExit));
}
console.log('OK: seis garagens, saída sem saltos, limite de 60 km/h, aquecimento e grid nas três pistas.');
