const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const host = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) {
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host);
}
for (const config of host.NeuroTracks) {
  const track = host.createNeuroTrack(config.id);
  for (const ai of [false, true]) {
    const race = host.createNeuroRace(track, 'normal', { laps: 5 });
    for (let i = 0; i < 180; i++) race.step({});
    const car = race.cars[ai ? 1 : 0];
    race.cars.forEach(other => { if (other !== car && other.id !== 1) other.done = true; });
    if (ai) Object.assign(race.cars[0], track.pointAt(1500));
    Object.assign(car, track.pointAt(21), { speed: 1, tyreLife: .35,
      progress: track.length * 2 + 21, completedLaps: 2, checkpoint: 24 });
    if (!ai) {
      assert(race.requestPit(car.id));
      assert(race.requestPit(car.id));
      assert.equal(car.pitRequested, false, 'Pode cancelar a chamada');
      race.requestPit(car.id);
    }
    let serviceTicks = 0, entered = false;
    for (let step = 0; step < 2200; step++) {
      const before = { x: car.x, y: car.y, state: car.pitState };
      race.step({ accelerate: true, left: true });
      if (car.pitState) entered = true;
      if (before.state || car.pitState) {
        assert(Math.hypot(car.x - before.x, car.y - before.y) <= track.pit.limit + 1e-6, 'Sem saltos nos boxes');
        assert(car.speed <= track.pit.limit + 1e-8);
        race.recoverCar(car.id);
      }
      if (before.state === 'service') {
        serviceTicks++;
        assert.equal(car.speed, 0);
        assert.equal(car.x, before.x);
        assert.equal(car.y, before.y);
      }
      if (car.pitStops && !car.pitState) break;
    }
    assert(entered, `${config.id}: ${ai ? 'IA' : 'jogador'} deve entrar`);
    assert.equal(serviceTicks, 480, 'Troca dura oito segundos');
    assert.equal(car.pitStops, 1);
    assert.equal(car.pitState, null);
    assert.equal(car.tyreLife, 1);
    assert.equal(car.completedLaps, 2, 'Parada não concede volta');
    assert(Math.abs(car.progress - (track.length * 2 + track.pit.exit)) < 1);
    assert(track.contains(car.x, car.y, 8));
  }
  for (const options of [{ laps: 3 }, { laps: 5, session: 'qualifying' }]) {
    const race = host.createNeuroRace(track, 'normal', options);
    for (let i = 0; i < 200; i++) race.step({ accelerate: true });
    assert.equal(race.requestPit(1), false);
    assert.equal(race.cars[0].tyreLife, 1);
  }
}
// Regressão: fila de seis carros no Veloz causava espera circular na saída.
const traffic = host.createNeuroRace(host.createNeuroTrack('veloz'), 'normal', { laps: 5 });
traffic.cars[0].player = false;
traffic.cars[0].driver = traffic.cars[1].driver;
for (let tick = 0; tick < 18000 && traffic.phase !== 'finished'; tick++) traffic.step({});
assert.equal(traffic.phase, 'finished', 'Tráfego dos boxes não deve bloquear a prova');
assert(traffic.cars.every(car => car.pitStops >= 1 && !car.pitState), 'Todos param e voltam à pista');
assert(traffic.cars.every(car => car.tyreLife < 1), 'Os pneus voltam a desgastar depois da troca');
console.log('OK: parada de 8 segundos, pneus novos, progresso preservado e IA nas três pistas; fila de seis carros sem bloqueio.');
