const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api={};for(const name of ['neuro-pista-track.js','neurodrive-race-engine.js'])new Function('window',fs.readFileSync(path.join(__dirname,'..',name),'utf8'))(api);
for(const {id} of api.NeuroTracks.filter(track=>!track.driftOnly)){
 const track=api.createNeuroTrack(id), race=api.createNeuroRace(track,'normal',{session:'qualifying',laps:3});race.cars[0].done=true;
 let sawDelta=false,reference=null;
 for(let tick=0;tick<18000&&race.phase!=='finished';tick++){
  race.step();
  const car=race.cars[1],timing=car.sectorTiming;
  if(timing.reference){reference=timing.reference.slice();assert.equal(reference.length,12);assert(reference.every((v,i)=>v>0&&(!i||v>reference[i-1])));}
  if(Number.isFinite(timing.delta))sawDelta=true;
 }
 assert(reference,`${id}: valid laps must establish a reference`);assert(sawDelta);
 assert(race.cars.slice(1).every(c=>c.sectorTiming.best.every(v=>v>0)),`${id}: all sectors recorded`);
 const invalid=api.createNeuroRace(track,'normal',{session:'qualifying'});invalid.cars[0].done=true;
 for(let tick=0;tick<11000&&invalid.phase!=='finished';tick++){invalid.cars[1].recordLapInvalid=true;invalid.step();}
 assert.equal(invalid.cars[1].sectorTiming.reference,null,'Invalid laps never replace a reference');
}
const urban=api.createNeuroTrack('urbano');assert.equal(urban.theme,'urban');assert(urban.experimental);assert(urban.length*.25>1700);
for(let d=900;d<1400;d+=10){const p=urban.pointAt(d);assert(urban.contains(p.x,p.y));assert(Math.abs(p.angle)<.04,'Tunnel stays on straight');}
console.log('OK: sectors on every racing circuit, valid references, live delta, invalid laps excluded and straight tunnel clearance.');
