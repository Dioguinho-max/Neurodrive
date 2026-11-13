const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = {};
for (const name of ['neuro-pista-track.js','neurodrive-race-engine.js']) new Function('window',fs.readFileSync(path.join(__dirname,'..',name),'utf8'))(api);
const track = api.createNeuroTrack('serra');
function race(weather,session='race') {
  const r=api.createNeuroRace(track,'normal',{weather,session,laps:3});
  r.cars.slice(1).forEach(car=>car.done=true);
  for(let n=0;n<181;n++)r.step();
  return r;
}
const dry=race('dry'),wet=race('rain'),qualifying=race('rain','qualifying');
assert(dry.cars[0].progressionTicks>0);
assert.equal(dry.cars[0].progressionRainTicks,undefined);
assert.equal(wet.cars[0].progressionRainTicks,wet.cars[0].progressionTicks);
assert.equal(qualifying.cars[0].progressionTicks,undefined);
dry.recoverPlayer();assert.equal(dry.cars[0].progressionIncident,true);
const collision=race('dry'),a=collision.cars[0],b=collision.cars[1];
Object.assign(b,{done:false,cooldown:0,pitState:null,x:a.x+3,y:a.y,speed:0});collision.step();
assert.equal(a.progressionIncident,true);assert.equal(b.progressionIncident,true);
const off=race('dry');Object.assign(off.cars[0],track.pointAt(300,track.halfWidth+25));off.step();assert.equal(off.cars[0].progressionIncident,true);
console.log('OK: server race telemetry tracks rain, excludes qualifying, and rejects collisions, off-track driving and resets.');
