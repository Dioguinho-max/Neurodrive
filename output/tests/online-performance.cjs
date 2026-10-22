'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createOnlineClock } = require('../../server/online-clock.cjs');
const api = {};
for (const file of ['neuro-pista-track.js','neurodrive-race-engine.js'])
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(api);
let seed = 42;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
for (const id of ['serra','veloz','tecnico','arena']) {
  const track = api.createNeuroTrack(id), b = track.bounds;
  for (let i = 0; i < 5000; i++) {
    const x = b.minX - 150 + random() * (b.maxX - b.minX + 300);
    const y = b.minY - 150 + random() * (b.maxY - b.minY + 300);
    for (const margin of [-30,0,12,track.halfWidth,track.halfWidth + 1])
      assert.equal(track.contains(x,y,margin), track.nearest(x,y).distance < track.halfWidth - margin, `${id}: same drivable boundary`);
  }
}
let steps = 0;
const advance = createOnlineClock(() => steps++, 1000 / 60, 0);
for (let t = 16; t < 1000; t += 16) advance(t);
advance(1000); assert.equal(steps,60,'60 physics ticks per elapsed second, independent of timer rounding');
assert.equal(advance(1034),2,'Catch up small scheduling delays');
assert.equal(advance(5000),3,'Bound catch-up after a long stall');
assert.equal(advance(5000),0,'Do not keep an unlimited backlog');

function benchmark(legacy) {
  const track = api.createNeuroTrack('serra');
  if (legacy) track.contains = (x,y,margin=0) => track.nearest(x,y).distance < track.halfWidth-margin;
  const race = api.createNeuroRace(track,'normal',{online:true,humans:[1,2],laps:5});
  const timings=[];
  for(let i=0;i<2400;i++) {
    const start=performance.now(); race.step({1:{accelerate:true},2:{accelerate:true}});
    timings.push(performance.now()-start);
  }
  timings.sort((a,b)=>a-b);
  return {cars:race.cars, mean:timings.reduce((sum,n)=>sum+n,0)/timings.length,p95:timings[Math.floor(timings.length*.95)]};
}
const old=benchmark(true), fast=benchmark(false);
assert.deepEqual(fast.cars,old.cars,'Optimized sensors must preserve full race results');
console.log(`OK: track boundaries, identical simulation, bounded fixed clock. Tick mean ${old.mean.toFixed(3)} -> ${fast.mean.toFixed(3)} ms; p95 ${old.p95.toFixed(3)} -> ${fast.p95.toFixed(3)} ms.`);
