const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const host = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) new Function('window', read(file))(host);
const session = host.createNeuroRace(host.NeuroTrack);
const player = session.cars[0];
const startX = player.x, startY = player.y;
for (let tick = 0; tick < 100; tick++) session.step({ accelerate: true });
assert.equal(player.speed, 0);
assert.equal(player.x, startX);
assert.equal(player.y, startY);
assert.equal(player.gear, 1);
assert(player.rpm >= 6700 && player.limiter);
for (let tick = 0; tick < 30; tick++) session.step();
assert(player.rpm < 4500 && !player.limiter);
for (let tick = 0; tick < 50; tick++) session.step({ accelerate: true });
session.step({ accelerate: true });
assert.equal(player.gear, 1, 'Giro livre na largada não deve pular marchas');
assert(player.speed > 0 && player.speed < 0.1);

session.cars.slice(1).forEach((car) => { car.done = true; });
let changes = 0;
for (let tick = 0; tick < 2000 && player.gear < 6; tick++) {
  Object.assign(player, session.pointAt(player.progress));
  const previous = { gear: player.gear, rpm: player.rpm, limiter: player.limiter };
  session.step({ accelerate: true });
  if (player.gear > previous.gear) {
    assert(previous.rpm >= 6780 && previous.limiter, 'Troca só após atingir o corte');
    assert(player.rpm < previous.rpm);
    assert(player.shiftTicks > 0);
    changes++;
  }
}
assert.equal(changes, 5);

const oscillators = [], gains = [];
let contexts = 0;
function parameter() {
  return { value: 0, setTargetAtTime(value) { this.value = value; },
    setValueAtTime(value) { this.value = value; this.lastAttack = value; }, linearRampToValueAtTime(value) { this.value = value; },
    exponentialRampToValueAtTime(value) { this.value = value; }, cancelScheduledValues() {} };
}
function node() { return { connect() {}, disconnect() {} }; }
class FakeAudioContext {
  constructor() { contexts++; this.currentTime = 1; this.state = 'running'; this.destination = node(); }
  resume() { return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
  createGain() { const result = { ...node(), gain: parameter() }; gains.push(result); return result; }
  createDynamicsCompressor() { return node(); }
  createBiquadFilter() { return { ...node(), frequency: parameter(), Q: parameter() }; }
  get sampleRate() { return 44100; }
  createBuffer() { return { getChannelData: () => new Float32Array(44100) }; }
  createBufferSource() { return { ...node(), start() {} }; }
  createPeriodicWave(real, imaginary) { return { real, imaginary }; }
  createOscillator() { const result = { ...node(), frequency: parameter(), start() {}, stop() {}, setPeriodicWave(wave) { this.wave = wave; } }; oscillators.push(result); return result; }
}
host.AudioContext = FakeAudioContext;
new Function('window', read('neurodrive-audio.js'))(host);
(async () => {
  const audio = host.createNeuroAudio();
  assert.equal(contexts, 0, 'Não deve tocar antes de um gesto do usuário');
  assert.equal(await audio.unlock(), true);
  await audio.unlock();
  assert.equal(contexts, 1);
  const race = { phase: 'countdown', countdown: 3 };
  const car = { rpm: 6800, throttle: 1, limiter: true, shiftTicks: 0 };
  audio.update(car, race, true);
  assert(Math.abs(oscillators[0].frequency.value - 6800 / 60) < 0.001);
  assert.equal(oscillators[0].type, 'triangle');
  assert(oscillators[1].wave);
  assert(Math.abs(oscillators[1].frequency.value - 6800 / 30) < 0.001);
  for (const count of [2, 1, 0]) { race.countdown = count; if (!count) race.phase = 'racing'; audio.update(car, race, true); }
  assert.equal(oscillators.length, 6, 'Dois osciladores de motor e quatro bipes');
  const beforeLights = oscillators.length;
  for (let stage = 1; stage <= 5; stage++) {
    for (let snapshot = 0; snapshot < 3; snapshot++) {
      audio.update(car, { phase: 'countdown', startLights: stage, countdown: 3 }, true);
    }
  }
  audio.update(car, { phase: 'racing', elapsed: 0 }, true);
  assert.equal(oscillators.length - beforeLights, 6, 'Cinco luzes e sinal de largada, sem repetir bipes em snapshots online');
  car.speed = 3; car.gripUsage = 1.6;
  audio.update(car, { phase: 'racing' }, true);
  assert(gains[4].gain.value > 0, 'Pneus audíveis perto do limite de aderência');
  car.offRoad = true;
  audio.update(car, { phase: 'racing' }, true);
  assert.equal(gains[4].gain.value, 0, 'Sem chiado de asfalto na grama');
  car.offRoad = false; car.gripUsage = 0.3;
  audio.update(car, { phase: 'racing' }, true);
  assert.equal(gains[4].gain.value, 0, 'Curva leve não chia');
  car.impact = 0.8;
  audio.update(car, { phase: 'racing' }, true);
  assert(gains[5].gain.lastAttack > 0.4, 'Impacto forte tem ataque proporcional');
  car.impact = 0;
  audio.update(car, { phase: 'racing' }, true);
  car.impact = 0.2;
  audio.update(car, { phase: 'racing' }, true);
  assert(gains[5].gain.lastAttack < 0.2, 'Raspada tem ataque menor');
  audio.setEnabled(false);
  audio.update(car, race, true);
  assert.equal(gains[0].gain.value, 0);
  audio.setEnabled(true);
  audio.setVolume(0.5);
  audio.update(car, race, true);
  assert.equal(gains[0].gain.value, 0.5);
  audio.update(car, race, false);
  assert.equal(gains[0].gain.value, 0);
  audio.dispose();
  console.log('OK: giro parado, alívio do acelerador, cinco trocas no corte, áudio por gesto, bipes, volume e silêncio na pausa.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
