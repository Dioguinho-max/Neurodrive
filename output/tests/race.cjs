// Execute: node output/tests/race.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const host = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) {
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host);
}
const track = host.NeuroTrack;
const race = host.createNeuroRace(track, 'normal');
const player = race.cars[0];
const initialX = player.x;
for (let i = 0; i < 179; i++) race.step({ accelerate: true });
assert.equal(race.phase, 'countdown');
assert.equal(player.x, initialX);
race.step();
assert.equal(race.phase, 'racing');
for (let i = 0; i < 30; i++) race.step({ accelerate: true });
assert(player.speed > 0 && player.x !== initialX);
race.recoverPlayer();
assert.equal(player.cooldown, 120);
const recovered = { x: player.x, y: player.y, progress: player.progress };
for (let i = 0; i < 119; i++) race.step({ accelerate: true });
assert.equal(player.x, recovered.x);
assert.equal(player.progress, recovered.progress);
race.step();
assert.equal(player.cooldown, 0);

// Um piloto de teste usa checkpoints para completar a prova via controles públicos.
// Os cinco adversários continuam usando seus próprios sensores e redes.
for (let tick = 0; tick < 30000 && race.phase !== 'finished'; tick++) {
  const target = race.pointAt(player.progress + 38);
  const difference = Math.atan2(Math.sin(Math.atan2(target.y - player.y, target.x - player.x) - player.angle),
    Math.cos(Math.atan2(target.y - player.y, target.x - player.x) - player.angle));
  const preview = race.pointAt(player.progress + 130);
  const bend = Math.abs(Math.atan2(Math.sin(preview.angle - target.angle), Math.cos(preview.angle - target.angle)));
  const curvature = bend / Math.max(20, Math.hypot(preview.x - target.x, preview.y - target.y));
  const safeSpeed = Math.min(2.8, Math.max(0.7, Math.sqrt(9.81 * 0.8 * 0.25 / Math.max(0.0001, curvature)) / 15));
  race.step({ accelerate: player.speed < safeSpeed, brake: player.speed > safeSpeed + 0.05,
    left: difference < -0.04, right: difference > 0.04 });
  if (player.stalled > 150) race.recoverPlayer();
}
assert.equal(race.phase, 'finished');
assert(player.checkpoint >= 36);
assert(player.finishTime > 0);
assert(player.place >= 1 && player.place <= 6);
assert(race.cars.some((car) => !car.player && car.progress > track.length));
assert(race.cars.every((car) => Number.isFinite(car.x) && Number.isFinite(car.speed)));
const finalTime = race.elapsed;
race.step({ accelerate: true });
assert.equal(race.elapsed, finalTime);

const collision = host.createNeuroRace(track);
for (let i = 0; i < 180; i++) collision.step();
Object.assign(collision.cars[1], { x: collision.cars[0].x, y: collision.cars[0].y });
collision.step();
assert(Math.hypot(collision.cars[0].x - collision.cars[1].x, collision.cars[0].y - collision.cars[1].y) > 0);
console.log(`OK: largada, direção, recuperação, colisão, 36 checkpoints, três voltas e chegada em ${player.finishTime.toFixed(1)} s.`);

// Regressão: a segunda IA não deve encostar no jogador durante a largada.
for (const accelerate of [false, true]) {
  const launch = host.createNeuroRace(track);
  for (let tick = 0; tick < 180; tick++) launch.step();
  for (let tick = 0; tick < 150; tick++) {
    launch.step({ accelerate });
    for (const opponent of launch.cars.slice(1)) {
      assert(Math.hypot(opponent.x - launch.cars[0].x, opponent.y - launch.cars[0].y) >= 17,
        'IA precisa respeitar o jogador na largada');
    }
  }
  if (accelerate) assert(launch.cars[0].speed > 1 && launch.cars[0].speed < 2.5,
    'A velocidade deve crescer progressivamente na largada');
}

const steeringTest = host.createNeuroRace(track);
for (let tick = 0; tick < 180; tick++) steeringTest.step();
steeringTest.cars[0].speed = 3.2;
steeringTest.step({ right: true, accelerate: true });
assert(Math.abs(steeringTest.cars[0].steering - 0.025) < 1e-8);

const contact = host.createNeuroRace(track);
for (let tick = 0; tick < 180; tick++) contact.step();
contact.cars.slice(2).forEach((car) => { car.done = true; });
const [front, rear] = contact.cars;
front.speed = 2;
front.gear = 4;
Object.assign(rear, { player: true, speed: 2, gear: 4, angle: front.angle,
  x: front.x - Math.cos(front.angle) * 16, y: front.y - Math.sin(front.angle) * 16 });
contact.step({ accelerate: true });
assert(front.speed > 2 && rear.speed > 2, 'Contato sem velocidade relativa não deve frear os carros');
console.log('OK: largada com jogador parado/acelerando, direção progressiva e contato sem frenagem artificial.');

// Aceleração em pista livre, alinhando o carro ao traçado para isolar o motor.
const acceleration = host.createNeuroRace(track);
for (let i = 0; i < 180; i++) acceleration.step();
acceleration.cars.slice(1).forEach((car) => { car.done = true; });
const vehicle = acceleration.cars[0];
let hundred = null, maximum = null, oneSecond = null, previousGear = 1, rpmDrops = 0;
for (let i = 1; i <= 1800 && maximum === null; i++) {
  Object.assign(vehicle, acceleration.pointAt(vehicle.progress));
  const previousRpm = vehicle.rpm;
  acceleration.step({ accelerate: true });
  if (vehicle.gear > previousGear && vehicle.rpm < previousRpm) rpmDrops++;
  previousGear = vehicle.gear;
  if (i === 60) oneSecond = vehicle.speed * 54;
  if (hundred === null && vehicle.speed * 54 >= 100) hundred = i / 60;
  if (vehicle.speed >= 205 / 54) maximum = i / 60;
}
assert(oneSecond < 70);
assert(hundred > 3 && hundred < 15);
assert(maximum > 8 && maximum < 30);
assert.equal(vehicle.gear, 6);
assert.equal(rpmDrops, 5);
assert(Math.abs(vehicle.speed * 54 - 205) < 0.001);
console.log(`Motor: 1 s = ${oneSecond.toFixed(0)} km/h; 0–100 em ${hundred.toFixed(1)} s; máxima em ${maximum.toFixed(1)} s; cinco quedas de RPM nas trocas.`);

// Encostar de lado deve reduzir a velocidade, manter a volta e permitir avançar.
const edgeRace = host.createNeuroRace(track, 'normal', { session: 'qualifying' });
for (let i = 0; i < 180; i++) edgeRace.step();
const edgeCar = edgeRace.cars[0];
const edgePoint = edgeRace.pointAt(150, track.halfWidth + 31.4);
Object.assign(edgeCar, edgePoint, { progress: 150, speed: 2.5, gear: 4, angle: edgePoint.angle + 0.4 });
edgeRace.step({ accelerate: true });
assert(edgeCar.speed < 2.5 && edgeCar.speed > 1.8);
assert(edgeCar.wallContact);
assert.equal(edgeCar.invalidLap, false);
assert(track.contains(edgeCar.x, edgeCar.y, -35));
const touchedProgress = edgeCar.progress;
for (let i = 0; i < 120; i++) edgeRace.step({ accelerate: true, right: true });
assert(edgeCar.progress > touchedProgress + 30, 'Contato contínuo não pode prender o carro');
assert(edgeCar.speed > 0.05);
assert.equal(edgeCar.invalidLap, false);
console.log('OK: contato com borda mantém movimento e volta válida.');
