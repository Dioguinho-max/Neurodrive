const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const THREE = require('../vendor/three.min.js');
let scene, camera;
class Renderer {
  constructor() { this.shadowMap = {}; }
  setPixelRatio() {}
  setSize() {}
  render(value, view) { scene = value; camera = view; }
  dispose() {}
}
const host = { THREE: { ...THREE, WebGLRenderer: Renderer }, devicePixelRatio: 1 };
const document = { createElement: () => ({ getContext: () => null }) };
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js', 'neuro-pista-3d.js']) {
  new Function('window', 'document', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host, document);
}
const elements = Object.fromEntries(['track-3d', 'camera', 'rotate', 'zoom-in', 'zoom-out', 'camera-reset'].map((id) =>
  [id, { value: 'chase', clientWidth: 1280, clientHeight: 720, addEventListener() {}, removeEventListener() {} }]));
const renderer = host.createNeuroTrack3D((id) => elements[id], { speedEffects: true });
const race = host.createNeuroRace(host.NeuroTrack);
const player = race.cars[0];
player.skin = { color: '#d83d52', accent: '#fff1dc' };
renderer.update(race.cars, player, false);
const models = scene.children.filter((object) => object.isGroup);
assert.equal(models[0].children[0].material.color.getHexString(), 'd83d52');
assert.equal(models[0].children[3].visible, true);
assert.equal(models[0].children[3].material.color.getHexString(), 'fff1dc');
assert.equal(models[1].children[3].visible, Boolean(race.cars[1].skin));
assert.equal(models[1].children[0].material.color.getHexString(), race.cars[1].skin.color.slice(1));
const catalog = require('../../server/catalog.cjs');
assert.equal(new Set(catalog.map((skin) => skin.id)).size, 14);
for (const skin of catalog) {
  player.skin = skin;
  renderer.update(race.cars, player, false);
  const paint = models[0].children[0].material;
  assert.equal(paint.color.getHexString(), skin.color.slice(1), skin.name);
  assert.equal(models[0].children[3].material.color.getHexString(), skin.accent.slice(1), skin.name);
  assert.equal(paint.roughness, skin.finish === 'matte' ? 0.82 : skin.finish === 'metallic' ? 0.27 : 0.4);
}
player.skin = catalog.find((skin) => skin.finish === 'matte');
renderer.setQuality('ultra');
renderer.update(race.cars, player, false);
assert.equal(models[0].children[0].material.clearcoat, 0.08, 'Pintura fosca permanece fosca em ultra');
player.skin = null;
renderer.update(race.cars, player, false);
assert.equal(models[0].children[0].material.color.getHexString(), '48e6a4');
assert.equal(models[0].children[3].visible, false);
const lowSpeedFov = camera.fov;
player.speed = player.maxSpeed;
for (let i = 0; i < 60; i++) renderer.update(race.cars, player, false);
assert(camera.fov > lowSpeedFov + 15, 'Campo de visão deve aumentar em alta velocidade');
assert(camera.position.y > host.NeuroTrack.heightAt(camera.position.x, camera.position.z), 'Câmera deve permanecer acima do terreno');
const beforeBrake = camera.position.clone();
const beforeBrakeRotation = camera.quaternion.clone();
const groundedPosition = models[0].position.clone();
for (const pedal of [-1, 0, -1, 1]) {
  player.activations[2][1] = pedal;
  renderer.update(race.cars, player, false);
  assert(camera.position.distanceTo(beforeBrake) < 1e-8, 'Acionar ou soltar freio não desloca a câmera instantaneamente');
  assert(camera.quaternion.angleTo(beforeBrakeRotation) < 1e-6, 'Freio não dá solavanco no enquadramento');
  assert(models[0].position.distanceTo(groundedPosition) < 1e-8, 'Carro continua apoiado no terreno');
}
const preview = renderer.createPreview({ clientWidth: 700, clientHeight: 330 });
preview.setSkin(catalog.find((skin) => skin.id === 'rubi'));
const previewModel = scene.children.find((object) => object.isGroup);
assert.equal(previewModel.children[0].material.color.getHexString(), 'd83d52');
assert.equal(models[0].children[0].material.color.getHexString(), '48e6a4', 'Experimentar não equipa a pintura');
assert(previewModel.children[0].geometry !== models[0].children[0].geometry, 'Geometria da vitrine pode ser descartada sem afetar a corrida');
assert.deepEqual([...previewModel.children[0].geometry.attributes.position.array], [...models[0].children[0].geometry.attributes.position.array]);
const initialCamera = camera.position.clone();
preview.rotate(0.5, 0.2);
assert(camera.position.distanceTo(initialCamera) > 1);
preview.setSkin(catalog.find((skin) => skin.finish === 'matte'));
assert.equal(previewModel.children[0].material.roughness, 0.82);
preview.reset(); preview.dispose();
renderer.update(race.cars, player, false);
renderer.dispose();
console.log('OK: pintura e faixas no jogador, IA inalterada e retorno à pintura padrão.');
