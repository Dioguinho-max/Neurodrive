const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const host = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js', 'neurodrive-hud.js']) {
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host);
}
const race = host.createNeuroRace(host.NeuroTrack, 'normal', { session: 'race' });
const banner = { innerHTML: '', textContent: '' };
const update = host.createRaceSignals(() => banner);
const stages = new Set();
for (let tick = 0; tick < 180; tick++) {
  assert.equal(race.phase, 'countdown');
  stages.add(race.startLights);
  update(race.cars[0], race);
  assert.equal((banner.innerHTML.match(/start-light lit/g) || []).length, race.startLights);
  race.step({});
}
assert.deepEqual([...stages], [1, 2, 3, 4, 5]);
assert.equal(race.phase, 'racing');
update(race.cars[0], race);
assert.equal(banner.textContent, 'VAI!');
update({ done: true, place: 2 }, { phase: 'finished' });
assert(banner.innerHTML.includes('2º LUGAR'));
banner.innerHTML = '';
update({ done: true, place: 2, disconnected: true }, { phase: 'finished' });
assert.equal(banner.innerHTML, '');
console.log('OK: cinco luzes, largada no tick original, bandeirada e abandono.');
