const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = new Map();
const host = { localStorage: { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) } };
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js', 'neurodrive-hud.js']) {
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host);
}
const career = host.createNeuroCareer();
assert(!career.record('serra', null));
assert(!career.record('serra', -1));
assert(career.record('serra', 80));
assert(!career.record('serra', 82));
assert(career.record('serra', 79));
assert.equal(host.createNeuroCareer().records.serra, 79);
const race = host.createNeuroRace(host.NeuroTrack);
assert.equal(new Set(race.cars.map((car) => car.name)).size, 6);
assert.equal(new Set(race.cars.filter((car) => !car.player).map((car) => car.skin.color)).size, 5);
assert.equal(new Set(race.cars.filter((car) => !car.player).map((car) => car.driver.style)).size, 5);
const online = host.createNeuroRace(host.NeuroTrack, 'normal', { online: true, humans: [1, 2] });
assert(online.cars.slice(0, 2).every((car) => car.player && car.driver === null));
assert(online.cars.slice(2).every((car) => car.driver && car.skin));
const series = career.championship();
for (let stage = 0; stage < 3; stage++) {
  series.stage = stage;
  series.score(race.cars);
  series.score(race.cars);
}
assert.equal(series.standings()[0].points, 75);
assert.equal(series.standings()[0].wins, 3);
assert.equal(series.standings()[5].points, 24);
console.log('OK: recordes persistidos, nomes e estilos de IA local/online, três etapas sem pontuação duplicada.');
