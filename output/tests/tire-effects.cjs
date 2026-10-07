const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const THREE = require('../vendor/three.min.js');
let scene;
class Renderer {
  constructor() { this.shadowMap = {}; }
  setPixelRatio() {}
  setSize() {}
  render(value) { scene = value; }
}
const host = { THREE: { ...THREE, WebGLRenderer: Renderer }, devicePixelRatio: 1 };
const document = { createElement: () => ({ getContext: () => null }) };
for (const file of ['neuro-pista-track.js', 'neuro-pista-3d.js']) {
  new Function('window', 'document', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host, document);
}
function emitted(speed, pedal, sliding = false) {
  const controls = new Map();
  const get = (id) => {
    if (!controls.has(id)) controls.set(id, { value: 'overview', clientWidth: 800, clientHeight: 600, addEventListener() {} });
    return controls.get(id);
  };
  const track = host.createNeuroTrack('veloz');
  const renderer = host.createNeuroTrack3D(get, { track, racePresentation: true });
  const car = { ...track.start, speed: speed / 54, brake: 0.045, steering: 0, alive: true,
    sliding, gripUsage: 2, inputs: [0, 0, 0, 0, 0], activations: [[], [], [0, pedal]] };
  renderer.update([car], car, false);
  car.x += Math.cos(car.angle) * 5;
  car.y += Math.sin(car.angle) * 5;
  renderer.update([car], car, false);
  const marks = scene.children.find((object) => object.isInstancedMesh && object.count === 256);
  const matrix = new THREE.Matrix4();
  let count = 0;
  for (let i = 0; i < marks.count; i++) { marks.getMatrixAt(i, matrix); if (matrix.determinant() > 0) count++; }
  renderer.setQuality('ultra');
  assert(scene.environment?.isDataTexture, 'Super alto usa céu refletido nos materiais');
  const sun = scene.children.find((object) => object.isDirectionalLight);
  assert.equal(sun.shadow.mapSize.x, 2048);
  const visual = scene.children.find((object) => object.isGroup);
  const wheels = visual.children.filter((part) => part.isGroup);
  assert(wheels.every((pivot) => pivot.children[0].geometry.parameters.radialSegments === 32));
  renderer.update([car], car, false);
  renderer.setQuality('performance');
  assert.equal(scene.environment, null);
  assert.equal(sun.castShadow, false);
  assert(wheels.every((pivot) => pivot.children[0].geometry.parameters.radialSegments === 16));
  return count;
}
assert.equal(emitted(135, -1), 2, 'Frenagem forte ativa as duas marcas antes da força do freio atingir 90%');
assert.equal(emitted(130, -1), 2);
assert.equal(emitted(129, -1), 0);
assert.equal(emitted(160, -0.5), 0);
assert.equal(emitted(160, 1, true), 0, 'Derrapar sem frear não emite marcas');
console.log('OK: efeito imediato na frenagem forte, limite de 130 km/h e ausência em curvas sem freio.');
