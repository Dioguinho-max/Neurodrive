const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const host = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) {
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(host);
}
const straight = { halfWidth: 44,
  contains: (x, y, margin = 0) => Math.abs(y) < 44 - margin,
  nearest: (x, y) => ({ x, y: 0, distance: Math.abs(y), tx: 1, ty: 0 }) };
const base = host.createNeuroRace(host.NeuroTrack).cars[0];
function probe(angle, side = 1) {
  const clearance = 8.2 * Math.abs(Math.sin(angle)) + 4.7 * Math.abs(Math.cos(angle));
  const car = structuredClone(base);
  Object.assign(car, { x: 0, y: side * (44 + 39 - clearance - 0.35), angle: angle * side, speed: 3 });
  host.predictNeuroCar(straight, car, {});
  assert(car.wallContact);
  assert(Math.abs(car.angle - angle * side) <= 0.056, 'Colisão não pode girar o carro bruscamente');
  const impactSpeed = car.speed;
  for (let i = 0; i < 120; i++) host.predictNeuroCar(straight, car, { accelerate: true });
  assert(car.x > 25, 'Carro deve continuar pela lateral em vez de ficar preso');
  assert(Math.abs(car.y) < 83);
  assert(Number.isFinite(car.speed));
  assert.equal(car.invalidLap, base.invalidLap);
  return impactSpeed;
}
const glancing = probe(0.2);
const frontal = probe(1.4);
assert(glancing > frontal + 0.8, 'Batida de frente deve perder mais velocidade que uma raspada');
assert(Math.abs(probe(0.2, -1) - glancing) < 1e-8, 'Resposta deve ser simétrica');
console.log('OK: raspada, impacto frontal, giro gradual, movimento contínuo e lados simétricos.');
