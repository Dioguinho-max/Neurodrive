const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),api={};
for(const name of ['neuro-pista-track.js','neurodrive-race-engine.js'])new Function('window',fs.readFileSync(path.join(__dirname,'..',name),'utf8'))(api);
const track={length:1e8,halfWidth:100,contains:()=>true,nearest:(x,y)=>({x,y:0,tx:1,ty:0,distance:Math.abs(y),progress:x})};
function car(speed){return Object.assign(api.createNeuroRace(api.createNeuroTrack('veloz'),'normal').cars[0],{x:0,y:0,angle:0,speed,launchTicks:0});}
const low=car(.6),fast=car(3.6);
for(let i=0;i<4;i++){api.predictNeuroCar(track,low,{right:true});api.predictNeuroCar(track,fast,{right:true});}
assert(low.steering>fast.steering,'Low speed responds sooner');assert(low.steering<.15,'Steering still builds progressively');
low.steering=.3;for(let i=0;i<7;i++)api.predictNeuroCar(track,low,{left:true});assert(low.steering<0,'Countersteering crosses center promptly');
for(let i=0;i<10;i++)api.predictNeuroCar(track,low,{});assert.equal(low.steering,0,'Release centers without oscillation');
console.log('OK: progressive low-speed steering, stable high speed, prompt countersteer and centering.');
