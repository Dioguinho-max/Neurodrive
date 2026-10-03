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
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js', 'neuro-pista-3d.js']) {
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host);
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
assert.equal(models[1].children[3].visible, false);
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
