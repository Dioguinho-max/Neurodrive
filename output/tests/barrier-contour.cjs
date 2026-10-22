const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = {};
new Function('window', fs.readFileSync(path.join(__dirname, '..', 'neuro-pista-track.js'), 'utf8'))(api);
for (const config of api.NeuroTracks) {
  const track = api.createNeuroTrack(config.id);
  const lines = track.barrierSegments(), degree = new Map();
  assert.strictEqual(track.barrierSegments(), lines, 'Contour is cached, never rebuilt per frame');
  assert(lines.length > 0);
  for (const { ends: [a, b] } of lines) {
    for (const p of [a, b]) {
      const key = `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
      degree.set(key, (degree.get(key) || 0) + 1);
    }
    for (let i = 0; i <= 8; i++) {
      const distance = track.nearest(a.x + (b.x - a.x) * i / 8, a.y + (b.y - a.y) * i / 8).distance;
      assert(distance >= track.halfWidth + 39, `${config.id}: rail intrudes into the driving area`);
      assert(distance <= track.halfWidth + 46, `${config.id}: rail too far from collision boundary`);
    }
  }
  assert([...degree.values()].every(count => count === 2), `${config.id}: continuous contour without dangling ends or crossings`);
}
console.log('OK: continuous guardrails outside the driving area on every circuit.');
