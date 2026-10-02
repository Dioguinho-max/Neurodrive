// Verifica o comportamento da IA sem renderização: node output/tests/driving.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const read = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const windowMock = {};
new Function('window', read('neuro-pista-track.js'))(windowMock);
const source = read('neuro-pista.js').trim();
const core = source.slice(0, source.indexOf('  const colors = {};'))
  + 'return {tick,get:()=>({generation,population,record,totalFinishes})};})();';
const simulation = new Function('window', 'document', 'return ' + core)(
  windowMock, { getElementById: () => ({ querySelector: () => ({}) }) },
);
for (let step = 0; step < 300; step++) simulation.tick();
const survivors = simulation.get().population.filter((car) => car.alive).length;
assert(survivors >= 30, 'A maioria dos carros deve sobreviver aos primeiros 300 passos.');
for (let step = 300; step < 1800; step++) simulation.tick();
assert(simulation.get().totalFinishes > 0, 'Ao menos um carro deve completar uma volta.');
assert(simulation.get().population.every((car) => Number.isFinite(car.speed) && Math.abs(car.steering) <= 1));
console.log(`OK: ${survivors}/40 ativos aos 300 passos; ${simulation.get().totalFinishes} voltas completas aos 1800 passos.`);
