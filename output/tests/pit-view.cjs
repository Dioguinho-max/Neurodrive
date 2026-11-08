const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const THREE = require('../vendor/three.min.js');
let scene, camera, now=0;
class Renderer {
  constructor() { this.shadowMap = {}; }
  setPixelRatio() {}
  setSize() {}
  render(s, c) { scene = s; camera = c; }
}
const host = { THREE: { ...THREE, WebGLRenderer: Renderer }, devicePixelRatio: 1, performance:{now:()=>now} };
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
  assert(!model.children[1].material.transparent,'Original opaque car windows restored');
  assert(!model.children.some(part=>part.userData.carInterior||part.userData.externalMirror),'No detailed interiors or functional exterior mirrors');
  let ancestor = hit?.object;
  while (ancestor && ancestor !== model) ancestor = ancestor.parent;
  assert(ancestor === model, `${config.id}: objeto ${hit?.object.geometry?.type} em ${hit?.object.position.toArray()} não pode bloquear o carro`);
  renderer.setCockpit(true);car.pitExit=false;car.pitState='service';car.pitTimer=264;
  renderer.update(race.cars,car,false);
  assert(!camera.view?.enabled,'ET also uses external camera during pit service');
  car.pitState='exit';renderer.update(race.cars,car,false);
  assert(camera.view?.enabled,'ET cockpit projection preserved on departure');
  renderer.setCockpit(false);
  car.tyreCompound='dry';car.pitCompound='wet';car.pitState='service';car.pitTimer=300;
  now+=17;renderer.update(race.cars,car,false);
  const crew=model.children.find(part=>part.userData.pitCrew);
  const delivery=crew.children.filter(part=>part.userData.deliveryWheel);
  const wheels=model.children.filter(part=>part.userData.wheelPivot).map(pivot=>pivot.children[0]);
  const bands=wheel=>wheel.children.filter(part=>part.userData.tyreBand);
  assert.equal(delivery.length,4);
  for(const wheel of delivery){assert.equal(wheel.children.length,wheels[0].children.length,'Mechanic uses complete current wheel model');assert(bands(wheel).every(b=>b.material.color.getHexString()==='57b8ed'),'Incoming wet tires are blue');}
  car.tyreBurst=true;car.burstWheel=0;car.pitTimer=222;now+=17;renderer.update(race.cars,car,false);
  assert(wheels.every(wheel=>wheel.visible&&bands(wheel).every(b=>b.material.color.getHexString()==='57b8ed')),'New compound appears immediately after mounting');
  assert.equal(wheels[0].scale.y,1,'Mounted replacement is not still punctured');
  assert.equal(car.tyreCompound,'dry','Rendering must not change authoritative physics');
  car.pitTimer=180;now+=17;renderer.update(race.cars,car,false);
  assert(delivery.every(wheel=>bands(wheel).every(b=>b.material.color.getHexString()==='48db86')),'Helpers carry away the old dry tire');
  car.tyreCompound='wet';car.pitCompound='dry';car.pitTimer=222;now+=17;renderer.update(race.cars,car,false);
  assert(wheels.every(wheel=>bands(wheel).every(b=>b.material.color.getHexString()==='48db86')),'Wet-to-dry replacement also updates during service');
  car.pitState='entry';car.pitTrackProgress=track.pit.garage(0).distance;
  for(let frame=0;frame<120;frame++){now+=1000/60;car.angle+=frame%2?.16:-.16;renderer.update(race.cars,car,false);}
  const stable=camera.position.clone();car.angle+=.4;now+=1000/60;renderer.update(race.cars,car,false);
  assert(camera.position.distanceTo(stable)<.01,'Parking steering cannot swing the pit camera');
  for(const progress of [0,.5,1]){
    renderer.setIntro(progress);now+=17;renderer.update(race.cars,car,false);
    renderer.setIntro(null);now+=17;renderer.update(race.cars,car,false);
    const aim=new THREE.Vector3(car.x,track.heightAt(car.x,car.y)+3,car.y).sub(camera.position).normalize();
    assert(camera.getWorldDirection(new THREE.Vector3()).dot(aim)>.999,'Ending or skipping intro must immediately face the car');
  }
  car.pitState='service';car.pitTimer=300;
  for(let frame=0;frame<90;frame++){now+=1000/60;renderer.update(race.cars,car,false);}
  const serviceAim=new THREE.Vector3(car.x,track.heightAt(car.x,car.y)+3,car.y).sub(camera.position).normalize();
  assert(camera.getWorldDirection(new THREE.Vector3()).dot(serviceAim)>.999,'Camera rotation must converge alongside position during pit transitions');
  car.pitState='exit';car.pitExit=false;
  for(let frame=0;frame<100;frame++){
    // Physics and rendering do not always advance together (75/144 Hz and network snapshots).
    if(frame%3!==0){car.pitTrackProgress+=1;Object.assign(car,track.pointAt(car.pitTrackProgress,track.pit.lane(car.pitTrackProgress)));}
    now+=[7,20,13][frame%3];renderer.update(race.cars,car,false);camera.updateMatrixWorld(true);
    const projected=new THREE.Vector3(car.x,track.heightAt(car.x,car.y)+3,car.y).project(camera);
    assert(Math.abs(projected.x)<.002&&Math.abs(projected.y)<.002,'Pit camera must keep the moving car anchored between uneven render/physics frames');
  }
}
console.log('OK: clear pit camera, stable entry, complete crew wheels and immediate dry/wet mounting on all circuits.');
