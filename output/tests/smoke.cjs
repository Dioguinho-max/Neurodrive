// Execute: node output/tests/smoke.cjs
// Usa a geometria real do Three.js; substitui apenas WebGL e DOM.
// Não substitui uma verificação visual em um navegador com GPU.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('../vendor/three.min.js');
const read = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

function setup(with3D) {
  const html = read('neuro-pista.html');
  const context2D = new Proxy({}, { get: () => () => {} });
  const elements = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map((match) => [match[1], {
    value: '0', checked: true, hidden: false, clientWidth: 680, clientHeight: 420,
    width: 680, height: 420, textContent: '', handlers: {},
    getContext: () => context2D,
    addEventListener(name, handler) { this.handlers[name] = handler; },
    setPointerCapture() {},
    setCustomValidity(message) { this.validationMessage = message; },
    reportValidity() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 680, height: 380 }; },
  }]));
  elements['np-camera'].value = 'overview';
  const root = {
    querySelector(selector) {
      assert(elements[selector.slice(1)], `Elemento ausente: ${selector}`);
      return elements[selector.slice(1)];
    },
    appendChild() {},
  };
  let lastRender;
  let frame;
  let clock = 0;
  class Renderer {
    constructor() { this.shadowMap = {}; }
    setPixelRatio() {}
    setSize() {}
    render(scene, camera) { lastRender = { scene, camera }; }
  }
  const sandbox = {
    Date: { now: () => clock },
    document: { getElementById: () => root, createElement: () => ({ style: {}, remove() {}, getContext: () => context2D }) },
    window: { THREE: with3D ? { ...THREE, WebGLRenderer: Renderer } : undefined, devicePixelRatio: 1, addEventListener() {} },
    getComputedStyle: () => ({ color: 'rgb(100, 100, 100)' }),
    ResizeObserver: class { observe() {} },
    requestAnimationFrame(callback) { frame = callback; },
    console: { warn() {} },
  };
  vm.createContext(sandbox);
  vm.runInContext(read('neuro-pista-track.js'), sandbox);
  vm.runInContext(read('neuro-pista-3d.js'), sandbox);
  vm.runInContext(read('neuro-pista.js'), sandbox);
  return { elements, track: sandbox.window.NeuroTrack, render: () => lastRender, advance: (time) => frame(time),
    setTime: (time) => { clock = time; },
    raceRenderer: () => sandbox.window.createNeuroTrack3D((id) => elements[`np-${id}`], { track: sandbox.window.NeuroTrack, racePresentation: true }) };
}

// O pós-prova move somente a apresentação, preservando o estado autoritativo.
const ending = setup(true);
const endingRenderer = ending.raceRenderer();
const finisher = { ...ending.track.start, speed: 2, maxSpeed: 3.2, steering: 0, alive: true,
  done: false, inputs: [0, 0, 0, 0, 0], activations: [[], [], [0, 0]] };
endingRenderer.update([finisher], finisher, false);
assert.equal(ending.render().scene.children.filter((object) => object.name.startsWith('starting-grid-slot-')).length, 6);
finisher.done = true; finisher.speed = 0;
const frozenResult = JSON.stringify(finisher);
endingRenderer.update([finisher], finisher, false, finisher, true);
const visualCar = ending.render().scene.children.find((object) => object.isGroup);
const finishPosition = visualCar.position.clone();
ending.setTime(1000);
endingRenderer.update([finisher], finisher, false, finisher, true);
assert(visualCar.position.distanceTo(finishPosition) > 1);
assert.equal(JSON.stringify(finisher), frozenResult);
ending.setTime(6000); endingRenderer.update([finisher], finisher, false, finisher, true);
const stoppedPosition = visualCar.position.clone();
ending.setTime(8000); endingRenderer.update([finisher], finisher, false, finisher, true);
assert(visualCar.position.equals(stoppedPosition));
finisher.done = false;
endingRenderer.update([finisher], finisher, false);
assert(Math.abs(visualCar.position.x - finisher.x) < 1e-6);
console.log('OK: grid de seis vagas, desaceleração visual, parada e reinício sem modificar resultados.');

const app = setup(true);
const ui = app.elements;
assert.equal(ui['np-track'].hidden, true);
assert.equal(ui['np-track-3d'].hidden, false);
const cars = app.render().scene.children.filter((object) => object.isGroup);
assert.equal(cars.length, 40);
assert(cars.every((car) => car.children.filter((part) => part.isGroup).length === 4));
assert(!app.render().scene.children.some((object) => object.geometry?.type === 'RingGeometry'));
assert(Math.abs(cars[0].position.y - app.track.heightAt(app.track.start.x, app.track.start.y) - 0.15) < 1e-6);
function checkWheels() {
  for (const car of cars) {
    car.updateMatrixWorld(true);
    for (const pivot of car.children.filter((part) => part.isGroup)) {
      const center = pivot.getWorldPosition(new THREE.Vector3());
      assert(Math.abs(center.y - 1.65 - app.track.heightAt(center.x, center.z) - 0.15) < 0.02);
    }
  }
}
checkWheels();
const heights = app.track.points.map((point) => app.track.heightAt(point.x, point.y));
assert(Math.max(...heights) - Math.min(...heights) > 20);
assert(cars[0].rotation.toArray().slice(0, 3).every(Number.isFinite));

ui['np-play'].onclick();
for (let i = 1; i <= 90; i++) app.advance(i * 17);
assert(cars.some((car) => car.position.z !== app.track.start.y));
checkWheels();
assert(cars.some((car) => car.children.some((part) => part.isGroup && Math.abs(part.children[0].rotation.z) > 0.01)));
ui['np-play'].onclick();
assert.equal(ui['np-inspect'].hidden, false);
assert.equal((ui['np-terms'].innerHTML.match(/<tr>/g) || []).length, 7);
ui['np-play'].onclick();
ui['np-network'].onclick({ clientX: 340, clientY: 170 });
assert.equal(ui['np-neuron'].value, '2');
assert.equal(ui['np-inspect'].hidden, false);
assert(ui['np-sum'].textContent.includes('tanh'));
for (let neuron = 0; neuron < 8; neuron++) {
  ui['np-neuron'].value = String(neuron);
  ui['np-neuron'].onchange();
  assert(!ui['np-sum'].textContent.includes('NaN'));
  assert.equal((ui['np-terms'].innerHTML.match(/<tr>/g) || []).length, 7);
}
assert(Number.isFinite(ui['np-steering-meter'].value));
assert(Number.isFinite(ui['np-pedal-meter'].value));

const before = app.render().camera.position.clone();
ui['np-rotate'].onclick();
assert(!before.equals(app.render().camera.position));
ui['np-camera'].value = 'follow';
ui['np-camera'].onchange();
assert(app.render().camera.position.toArray().every(Number.isFinite));
ui['np-sensors'].checked = false;
ui['np-sensors'].onchange();
assert.equal(app.render().scene.children.find((object) => object.isLineSegments).visible, false);
ui['np-camera-reset'].onclick();
assert.equal(ui['np-camera'].value, 'overview');
ui['np-track-3d'].handlers.pointerdown({ clientX: 10, clientY: 10, pointerId: 1 });
ui['np-track-3d'].handlers.pointermove({ clientX: 80, clientY: 30, pointerId: 1 });
ui['np-track-3d'].handlers.pointerup();
ui['np-track-3d'].handlers.wheel({ deltaY: -100, preventDefault() {} });
assert(app.render().camera.position.toArray().every(Number.isFinite));

const fallback = setup(false);
assert(fallback.elements['np-3d-status'].textContent.includes('2D'));
fallback.elements['np-step'].onclick();
assert(fallback.elements['np-announce'].textContent.includes('Passo 1'));
console.log('OK: 40 modelos, movimento, pausa, inspeção, câmeras, sensores e fallback 2D.');

// O traçado é maior que o oval original e os sensores usam a mesma geometria.
assert(app.track.length > 3000);
assert(app.track.points.every((point) => app.track.contains(point.x, point.y, 9)));
for (let index = 0; index < app.track.points.length; index += 10) {
  const outside = app.track.offset(index, app.track.halfWidth + 8);
  assert(!app.track.contains(outside.x, outside.y));
}

for (const count of [1, 10, 100, 2]) {
  ui['np-count'].value = String(count);
  ui['np-apply-count'].onclick();
  const visible = app.render().scene.children.filter((object) => object.isGroup && object.visible);
  assert.equal(visible.length, count);
  assert(ui['np-stats'].textContent.includes(`/${count}`));
  // Inclui várias gerações para verificar populações menores que a elite.
  for (let step = 0; step < 400; step++) ui['np-step'].onclick();
}
ui['np-count'].value = '101';
ui['np-apply-count'].onclick();
assert(ui['np-count'].validationMessage);
assert(ui['np-stats'].textContent.includes('/2'));

ui['np-target'].value = '2';
ui['np-target'].onchange();
ui['np-camera'].value = 'chase';
ui['np-camera'].onchange();
const selectedCar = app.render().scene.children.filter((object) => object.isGroup)[1];
const camera = app.render().camera;
const heading = new THREE.Vector3(Math.cos(-selectedCar.rotation.y), 0, Math.sin(-selectedCar.rotation.y));
assert(camera.position.clone().sub(selectedCar.position).dot(heading) < 0, 'Camera precisa estar atras do carro');
assert(camera.position.y > selectedCar.position.y);
assert(camera.position.distanceTo(selectedCar.position) < 100);
console.log(`OK: circuito de ${(app.track.length * 0.25).toFixed(0)} m, populações 1–100, seleção e terceira pessoa.`);
