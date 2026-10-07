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
renderer.dispose();
console.log('OK: pintura e faixas no jogador, IA inalterada e retorno à pintura padrão.');
