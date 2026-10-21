const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../neurodrive-hud.js'), 'utf8');
const data = new Map();
const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
function create(localStorage = storage) {
  const window = { localStorage };
  new Function('window', source)(window);
  return window.createNeuroDriftCareer();
}
let career = create();
for (const [track, thresholds] of Object.entries(career.goals)) {
  thresholds.forEach((threshold, index) => {
    assert.equal(career.status(track, threshold - 1).level, index);
    assert.equal(career.status(track, threshold).level, index + 1);
  });
  assert.equal(career.record(track, thresholds[0], 100).persisted, true);
}
career = create();
assert.equal(career.records.serra.score, 600);
assert.equal(career.records.veloz.score, 500);
const date = career.records.serra.date;
assert.equal(career.record('serra', 600, 200).improved, false);
assert.equal(career.record('serra', 200, 100).improved, false);
assert.equal(career.records.serra.date, date);
assert.equal(career.record('serra', 900, 800).previous, 600);
for (const score of [NaN, Infinity, -1, 1.5, 0]) assert.equal(career.record('serra', score, 0).improved, false);
assert.equal(career.record('unknown', 900, 800).improved, false);
assert.equal(career.record('serra', 1000, 1001).improved, false);
assert.equal(create(null).record('serra', 100, 100).persisted, false);
assert.equal(create({ getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } }).record('serra', 100, 100).persisted, false);
data.set('neurodrive-drift-records-v1', 'invalid json');
assert.deepEqual(create().records, {});
data.set('neurodrive-drift-records-v1', JSON.stringify({ serra: { score: '900', bestCombo: 100 }, veloz: { score: 500, bestCombo: 600 } }));
assert.deepEqual(create().records, {});
console.log('OK: drift medal thresholds, separate records, reload, ties, invalid data and unavailable storage.');
