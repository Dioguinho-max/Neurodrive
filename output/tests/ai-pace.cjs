const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const host = {};
new Function('window', fs.readFileSync(path.join(__dirname, '../neuro-pista-track.js'), 'utf8'))(host);
new Function('window', fs.readFileSync(process.argv[2] || path.join(__dirname, '../neurodrive-race-engine.js'), 'utf8'))(host);
for (const id of process.argv[6] ? [process.argv[6]] : ['serra', 'veloz', 'tecnico']) {
  const race = host.createNeuroRace(host.createNeuroTrack(id), process.argv[3] || 'normal', { session: process.argv[5] || 'qualifying', weather: process.argv[4] || 'dry' });
  race.cars[0].done = process.argv[5] !== 'race';
  if (process.argv[5] === 'race') race.cars[0].cooldown = 1000000; // Spectator: do not park a blocking human on the grid.
  let samples = 0, offRoad = 0, walls = 0, peak = 0;
  for (let tick = 0; tick < 18300 && race.phase !== 'finished'; tick++) {
    race.step();
    if (race.cars.slice(1).every(car => car.done)) break;
    for (const car of race.cars.slice(1)) {
      if (car.done || race.phase === 'countdown') continue;
      assert(Number.isFinite(car.x + car.y + car.speed));
      samples++; offRoad += Number(car.offRoad); walls += Number(car.wallContact);
      peak = Math.max(peak, car.speed * 54);
    }
  }
  const ai = race.cars.slice(1);
  console.log(JSON.stringify({ track: id, meanBestLap: +(ai.reduce((n, car) => n + car.bestLap, 0) / ai.length).toFixed(2), peakKmh: +peak.toFixed(1), offRoadSamples: offRoad, wallSamples: walls }));
  assert(ai.every((car) => car.done && car.bestLap > 0), `${id}: todos devem completar a sessão com tempo válido`);
  // Racing permits brief excursions during aggressive side-by-side battles;
  // qualifying retains the stricter clean-lap threshold. Walls stay bounded below.
  assert(offRoad / samples < (process.argv[5] === 'race' ? 0.03 : 0.015), `${id}: deve permanecer predominantemente no asfalto`);
  assert(walls / samples < 0.002, `${id}: não pode depender das barreiras para contornar curvas`);
}
