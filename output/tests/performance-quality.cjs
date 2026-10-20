// Geometry budget regression, not a GPU FPS benchmark.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const THREE = require('../vendor/three.min.js');
let scene, pixelRatio;
class Renderer {
  constructor() { this.shadowMap = {}; }
  setPixelRatio(value) { pixelRatio = value; }
  setSize() {}
  render(value) { scene = value; }
}
const host = { THREE: { ...THREE, WebGLRenderer: Renderer }, devicePixelRatio: 1 };
const document = { createElement: () => ({ getContext: () => null }) };
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js', 'neuro-pista-3d.js']) {
  new Function('window', 'document', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host, document);
}
const track = host.createNeuroTrack('serra');
const race = host.createNeuroRace(track);
const nodes = new Map();
const get = id => {
  if (!nodes.has(id)) nodes.set(id, { value: 'chase', clientWidth: 1920, clientHeight: 1080, addEventListener() {} });
  return nodes.get(id);
};
const view = host.createNeuroTrack3D(get, { track, racePresentation: true, quality: 'high' });
const state = JSON.stringify(race.cars);
const draw = () => { for (let i = 0; i < 3; i++) view.update(race.cars, race.cars[0], false); };
const budget = () => {
  let meshes = 0, triangles = 0;
  scene.traverseVisible(object => {
    if (!object.isMesh) return;
    meshes++;
    triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3
      * (object.isInstancedMesh ? object.count : 1);
  });
  return { meshes, triangles: Math.round(triangles) };
};
draw();
const high = budget();
view.setQuality('performance'); draw();
const light = budget();
assert(pixelRatio <= 2 / 3, 'Full HD 3D is capped at 720p');
assert(light.meshes < high.meshes * .85, 'Meaningfully fewer visible meshes');
assert(light.triangles < high.triangles * .85, 'Meaningfully fewer triangles');
assert.equal(JSON.stringify(race.cars), state, 'Quality never changes authoritative physics');
get('track-3d').clientWidth = 960; get('track-3d').clientHeight = 540;
draw(); assert.equal(pixelRatio, 1, 'Small viewports keep native resolution');
view.setQuality('high'); draw();
assert.deepEqual(budget(), high, 'Detailed graphics restore without reloading');
console.log('OK: quality switching, physics unchanged, resolution cap; scene budgets:', { high, performance: light });
