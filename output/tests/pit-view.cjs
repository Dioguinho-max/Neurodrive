const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const THREE = require('../vendor/three.min.js');
let scene, camera;
class Renderer {
  constructor() { this.shadowMap = {}; }
  setPixelRatio() {}
  setSize() {}
  render(s, c) { scene = s; camera = c; }
}
const host = { THREE: { ...THREE, WebGLRenderer: Renderer }, devicePixelRatio: 1 };
const document = { createElement: () => ({ getContext: () => null }) };
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js', 'neuro-pista-3d.js']) {
  new Function('window', 'document', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host, document);
}
for (const config of host.NeuroTracks) {
  const track = host.createNeuroTrack(config.id);
  const race = host.createNeuroRace(track, 'normal', { session: 'qualifying', pitStart: true });
  const nodes = new Map();
  const get = (id) => {
    if (!nodes.has(id)) nodes.set(id, { value: 'chase', clientWidth: 1000, clientHeight: 600, addEventListener() {} });
    return nodes.get(id);
  };
  const renderer = host.createNeuroTrack3D(get, { track, racePresentation: true });
  const car = race.cars[0];
  renderer.update(race.cars, car, false);
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  const target = new THREE.Vector3(car.x, track.heightAt(car.x, car.y) + 3, car.y);
  const screen = target.clone().project(camera);
  assert(Math.abs(screen.x) < 0.01 && Math.abs(screen.y) < 0.01, 'Carro deve estar no centro do enquadramento');
  const ray = new THREE.Raycaster(camera.position, target.clone().sub(camera.position).normalize());
  const visible = (object) => object && object.visible && (!object.parent || visible(object.parent));
  const hit = ray.intersectObjects(scene.children, true).find((entry) => visible(entry.object));
  const model = scene.children.find((object) => object.isGroup);
  let ancestor = hit?.object;
  while (ancestor && ancestor !== model) ancestor = ancestor.parent;
  assert(ancestor === model, `${config.id}: objeto ${hit?.object.geometry?.type} em ${hit?.object.position.toArray()} não pode bloquear o carro`);
}
console.log('OK: carro enquadrado e sem obstrução geométrica na garagem das três pistas.');
