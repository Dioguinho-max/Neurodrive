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
  assert.equal(scene.children.filter(object => object.userData.pitEngineer).length, 12, 'Dois chefes em cada um dos seis boxes');
  const paved = (distance, lane) => {
    const point = track.pointAt(distance, lane);
    const down = new THREE.Raycaster(new THREE.Vector3(point.x, track.heightAt(point.x, point.y) + 1, point.y), new THREE.Vector3(0, -1, 0), 0, 2);
    assert(down.intersectObjects(scene.children, true).some(hit => hit.object.userData.pitPavement), `${config.id}: falta asfalto em ${distance}, ${lane}`);
  };
  for (let bay = 0; bay < 6; bay++) {
    const garage = track.pit.garage(bay);
    for (const along of [-9, 0, 9]) for (const lane of [78, 90, 102]) paved(garage.distance + along, track.halfWidth + lane);
  }
  for (const distance of [.6, .75, .9].map(t => track.pit.entry + t * (track.pit.entryEnd - track.pit.entry))) {
    const t = (distance - track.pit.entry) / (track.pit.entryEnd - track.pit.entry);
    const lane = track.pit.lane(distance) * t * t * (3 - 2 * t);
    for (const edge of [-12, 12]) if (lane + edge > track.halfWidth) paved(distance, lane + edge);
  }
  const target = new THREE.Vector3(car.x, track.heightAt(car.x, car.y) + 3, car.y);
  const screen = target.clone().project(camera);
  assert(Math.abs(screen.x) < 0.01 && Math.abs(screen.y) < 0.01, 'Carro deve estar no centro do enquadramento');
  const ray = new THREE.Raycaster(camera.position, target.clone().sub(camera.position).normalize());
  const visible = (object) => object && object.visible && (!object.parent || visible(object.parent));
  const hit = ray.intersectObjects(scene.children, true).find((entry) => visible(entry.object));
  const model = scene.children.find((object) => object.isGroup);
  const glazing=model.children.find(part=>part.userData.carGlass);
  assert(glazing.material.transparent&&glazing.material.opacity<.4&&!glazing.material.depthWrite,'Car glass lets interior render through it');
  assert(model.children.some(part=>part.userData.carInterior&&part.isInstancedMesh),'Interior uses batched seats and dashboard');
  assert.equal(model.children.filter(part=>part.userData.externalMirror).length,2,'Two exterior mirror surfaces');
  let ancestor = hit?.object;
  while (ancestor && ancestor !== model) ancestor = ancestor.parent;
  assert(ancestor === model, `${config.id}: objeto ${hit?.object.geometry?.type} em ${hit?.object.position.toArray()} não pode bloquear o carro`);
  get('camera').value='cockpit';
  car.pitExit=false;car.pitState='service';car.pitTimer=264;
  renderer.update(race.cars,car,false);
  assert(get('cockpit').hidden,'Pit service temporarily hides cockpit instruments');
  assert(!camera.view?.enabled,'Exterior service view clears cockpit projection');
  assert(Math.hypot(camera.position.x-car.x,camera.position.z-car.y)>20,'Service shown from outside');
  assert(model.visible,'Player model remains visible during service');
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const serviceTarget=new THREE.Vector3(car.x,track.heightAt(car.x,car.y)+3.9,car.y);
  const serviceRay=new THREE.Raycaster(camera.position,serviceTarget.sub(camera.position).normalize());
  const serviceHit=serviceRay.intersectObjects(scene.children,true).find(entry=>visible(entry.object));
  let serviceAncestor=serviceHit?.object;
  while(serviceAncestor&&serviceAncestor!==model)serviceAncestor=serviceAncestor.parent;
  assert(serviceAncestor===model,`${config.id}: pit roof must not obscure service view`);
  car.pitState='exit';
  renderer.update(race.cars,car,false);
  assert(!get('cockpit').hidden&&camera.view.enabled,'Departure restores first person');
  assert.equal(get('camera').value,'cockpit','Camera preference stays unchanged');
}
console.log('OK: carro enquadrado e sem obstrução geométrica na garagem das três pistas.');
