const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const nodes = new Map();
const get = id => {
  if (!nodes.has(id)) nodes.set(id, { style: {}, setAttribute() {} });
  return nodes.get(id);
};
const window = {};
vm.runInNewContext(fs.readFileSync('output/neurodrive-hud.js', 'utf8'), { window });
const update = window.createRaceHUD(get);
const car = { speed: 3, rpm: 6500, gear: 1, steering: .5, manual: true, tyreLife: .25, tyreCompound: 'wet', completedLaps: 0 };
const draw = () => update(car, 1, 6, 3, 12);
draw();
assert.equal(get('cockpit-speed').textContent, '162');
assert.equal(get('cockpit-rpm').textContent, '6500');
assert.equal(get('cockpit-wheel').style.transform, 'rotate(37.5deg)');
assert.equal(get('cockpit-condition').textContent, '25%');
const positions = new Set();
for (let gear = 1; gear <= 6; gear++) { car.gear = gear; draw(); positions.add(get('cockpit-stick').style.transform); }
assert.equal(positions.size, 6, 'Each manual gear has its own gate position');
car.manual = false;
car.gear = 1; draw(); const parked = get('cockpit-stick').style.transform;
car.gear = 6; draw(); assert.equal(get('cockpit-stick').style.transform, parked, 'Automatic shifting leaves lever stationary');
car.tyreBurst = true; draw(); assert.equal(get('cockpit-condition').textContent, 'PNEU ESTOURADO');
console.log('OK: cockpit telemetry, steering, six manual gear positions, stationary automatic lever and puncture.');
