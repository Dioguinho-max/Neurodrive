const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const host = {};
new Function('window', fs.readFileSync(path.join(__dirname, '../neuro-pista-track.js'), 'utf8'))(host);
new Function('window', fs.readFileSync(process.argv[2] || path.join(__dirname, '../neurodrive-race-engine.js'), 'utf8'))(host);
for (const id of ['serra', 'veloz', 'tecnico']) {
  const race = host.createNeuroRace(host.createNeuroTrack(id), 'normal', { session: 'qualifying' });
  race.cars[0].done = true;
  let samples = 0, offRoad = 0, walls = 0, peak = 0;
  for (let tick = 0; tick < 18300 && race.phase !== 'finished'; tick++) {
    race.step();
    for (const car of race.cars.slice(1)) {
      if (car.done || race.phase === 'countdown') continue;
      assert(Number.isFinite(car.x + car.y + car.speed));
      samples++; offRoad += Number(car.offRoad); walls += Number(car.wallContact);
      peak = Math.max(peak, car.speed * 54);
    }
  }
  const ai = race.cars.slice(1);
  assert(ai.every((car) => car.done && car.bestLap > 0), `${id}: todos devem completar a sessão com tempo válido`);
  assert(offRoad / samples < 0.015, `${id}: deve permanecer no asfalto`);
  assert(walls / samples < 0.002, `${id}: não pode depender das barreiras para contornar curvas`);
  console.log(JSON.stringify({ track: id, meanBestLap: +(ai.reduce((n, car) => n + car.bestLap, 0) / ai.length).toFixed(2), peakKmh: +peak.toFixed(1), offRoadSamples: offRoad, wallSamples: walls }));
}
