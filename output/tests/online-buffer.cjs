const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = {};
new Function('window', fs.readFileSync(path.join(__dirname, '../neurodrive-online-buffer.js'), 'utf8'))(api);
const buffer = api.createOnlineBuffer();
const state = (x, angle = 0) => ({ cars: [{ id: 1, x, y: 0, angle, speed: 2, rpm: 4000, steering: 0, bodyRoll: 0 }] });
assert.deepEqual(buffer.sample(0), []);
// Irregular arrivals, including two updates arriving in a burst.
const arrivals = [0, 48, 112, 130, 205, 208, 310];
let index = 0, lastX = 0;
for (let now = 0; now <= 420; now += 5) {
  while (index < arrivals.length && arrivals[index] <= now) {
    buffer.push(state(index * 6), arrivals[index++]);
  }
  const car = buffer.sample(now)[0];
  assert(car.x >= lastX, 'Jitter must not rewind a moving car');
  assert(car.x <= 36, 'Do not extrapolate through walls when packets stop');
  lastX = car.x;
}
assert.equal(lastX, 36);
buffer.clear();
assert.deepEqual(buffer.sample(500), []);
buffer.push(state(0, Math.PI - 0.1), 0);
buffer.push(state(2, -Math.PI + 0.1), 50);
assert(Math.abs(buffer.sample(100)[0].angle - Math.PI) < 1e-8, 'Interpolate across angle wrap by the short path');
buffer.push(state(500), 100);
assert.equal(buffer.sample(175)[0].x, 500, 'Recovery must snap instead of crossing the track');
console.log('OK: jitter, burst arrivals, stalled connection, angle wrap, recovery and reset.');
