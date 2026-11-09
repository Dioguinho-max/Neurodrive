const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const THREE = require('../vendor/three.min.js');
let scene, camera;
class Renderer { constructor() { this.shadowMap = {}; } setPixelRatio() {} setSize() {} render(s, c) { scene = s; camera = c; } dispose() {} }
const host = { THREE: { ...THREE, WebGLRenderer: Renderer }, devicePixelRatio: 1 };
const document = { createElement: () => ({ getContext: () => null }) };
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js', 'neurodrive-podium.js', 'neuro-pista-3d.js']) new Function('window', 'document', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host, document);
const nodes = new Map();
const get = id => { if (!nodes.has(id)) nodes.set(id, { value: 'chase', clientWidth: 1200, clientHeight: 720, addEventListener() {}, removeEventListener() {} }); return nodes.get(id); };
for (const config of host.NeuroTracks) {
const track = host.createNeuroTrack(config.id);
const renderer = host.createNeuroTrack3D(get, { track, racePresentation: true });
const race = host.createNeuroRace(track), ranking = race.cars.slice(0, 3);
const before = JSON.stringify(race.cars);
renderer.setCeremony(ranking, 0); renderer.update(race.cars, race.cars[0], false, race.cars[0], true);
const podium = scene.children.find(item => item.userData.mapPodium);
assert(podium, 'Podio usa a mesma cena da pista');
assert.deepEqual(podium.children.filter(item => item.userData.podiumPlace).map(item => item.userData.podiumPlace), [1, 2, 3], 'Degraus identificam os tres lugares');
const cars = scene.children.filter(item => item.isGroup);
assert.equal(cars.filter(item => item.visible).length, 3);
const start = cars[0].position.clone(), openingCamera = camera.position.clone();
const pilots = podium.children.filter(item => item.type === 'Object3D');
assert(pilots.every(pilot => !pilot.visible));
// Check the whole arrival, not only parked positions: the front slot must
// arrive first so nobody drives through a car that has already stopped.
for (let milliseconds = 0; milliseconds <= 5000; milliseconds += 40) {
  renderer.setCeremony(ranking, milliseconds);
  renderer.update(race.cars, race.cars[0], false, race.cars[0], true);
  for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
    assert(cars[a].position.distanceTo(cars[b].position) > 22,
      `Arrival cars ${a}/${b} overlap at ${milliseconds} ms`);
  }
}
renderer.setCeremony(ranking, 5000); renderer.update(race.cars, race.cars[0], false, race.cars[0], true);
assert(cars[0].position.distanceTo(start) > 80, 'Carros chegam dirigindo');
const parked = cars[0].position.clone(), lowered = pilots[0].children.at(-1).position.y;
renderer.setCeremony(ranking, 10000); renderer.update(race.cars, race.cars[0], false, race.cars[0], true);
assert(cars[0].position.distanceTo(parked) < .001, 'Carros ficam estacionados');
assert(pilots.every(pilot => pilot.visible));
assert(pilots[0].children.at(-1).position.y > lowered + 1, 'Pilotos levantam trofeus');
assert(camera.position.distanceTo(openingCamera) > 20, 'Camera aproxima o podio');
assert.equal(JSON.stringify(race.cars), before, 'Animacao nao altera a corrida');
renderer.setCeremony(null); assert(!scene.children.some(item => item.userData.mapPodium));
renderer.dispose(); console.log('OK: carros estacionam no mapa, camera aproxima, pilotos erguem trofeus e resultados ficam intactos.');
}

// The podium atlas must use all four track logos, with no repeated painting on animation frames.
const painted = [];
const ctx = { fillRect() {}, fillText() {}, drawImage(...args) { painted.push(args); } };
const logos = Array.from({ length: 4 }, (_, id) => ({ id, width: 512, height: 128 }));
const branded = {};
new Function('window', 'document', fs.readFileSync(path.join(__dirname, '../neurodrive-podium.js'), 'utf8'))(
  branded, { createElement: () => ({ getContext: () => ctx }) });
const brandedPodium = branded.createNeuroPodiumScene(THREE, host.createNeuroRace(host.NeuroTrack).cars.slice(0, 3), { sponsorImages: logos });
assert.equal(painted.length, 20);
assert.equal(new Set(painted.map(args => args[0])).size, 4);
assert(painted.every(args => args[3] / args[4] === 4), 'Logos preserve their proportions');
brandedPodium.update(7); brandedPodium.update(10);
assert.equal(painted.length, 20, 'No repainting logos during animation');
const lastHeights = new Map();
for (let frame = 0; frame <= 420; frame++) {
  brandedPodium.update(5 + frame / 60);
  brandedPodium.root.traverse(part => {
    if (!part.userData.podiumHand) return;
    const body = part.parent.parent;
    const cup = body.children.find(child => child.userData.podiumTrophy);
    const expected = cup.position.clone().add(new THREE.Vector3(part.userData.podiumHand * 1.03, .5, 0).multiply(cup.scale));
    assert(part.position.clone().add(part.parent.position).distanceTo(expected) < 1e-6, 'Gloves stay on trophy handles');
    const previous = lastHeights.get(part);
    if (previous !== undefined) assert(Math.abs(cup.position.y - previous) < .04, 'Trophy lift has no jumps');
    lastHeights.set(part, cup.position.y);
    for (const bone of part.parent.children.slice(0, 2)) assert(Math.abs(bone.scale.y - 1.1) < 1e-6, 'Arms retain their length');
    const elbow = part.parent.children[2];
    assert(elbow.position.x * part.userData.podiumHand > 0, 'Elbows bend outward instead of crossing the chest');
  });
}
brandedPodium.dispose();
console.log('OK: podium reuses four sponsor logos in one static atlas.');
