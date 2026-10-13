// CPU benchmark with real Three.js geometry; does not measure GPU FPS.
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const THREE = require('../vendor/three.min.js');
class Renderer {
  constructor() { this.shadowMap = {}; }
  setPixelRatio() {}
  setSize() {}
  render(scene) { scene.updateMatrixWorld(); }
}
const host = { THREE: { ...THREE, WebGLRenderer: Renderer }, devicePixelRatio: 1 };
const document = { createElement: () => ({ getContext: () => null }) };
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js', 'neuro-pista-3d.js']) {
  new Function('window', 'document', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host, document);
}
for (const weather of ['dry', 'rain']) {
  const track = host.createNeuroTrack('serra');
  const race = host.createNeuroRace(track, 'normal');
  const nodes = new Map();
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, { value: 'chase', clientWidth: 1280, clientHeight: 720, addEventListener() {} });
    return nodes.get(id);
  };
  const view = host.createNeuroTrack3D(get, { track, racePresentation: true });
  const samples = [];
  for (let frame = 0; frame < 400; frame++) {
    race.cars.forEach((car, i) => {
      Object.assign(car, track.pointAt(850 + frame * 2 + i * 30));
      car.speed = 3; car.wetness = weather === 'rain' ? 1 : 0;
      car.rainIntensity = car.wetness; car.brake = 1;
    });
    const start = performance.now();
    view.update(race.cars, race.cars[0], false);
    if (frame >= 100) samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  console.log(`${weather}: CPU median=${samples[150].toFixed(2)}ms p95=${samples[285].toFixed(2)}ms`);
}
