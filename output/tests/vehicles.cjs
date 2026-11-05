const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api={};
for(const file of ['neuro-pista-track.js','neurodrive-race-engine.js'])new Function('window',fs.readFileSync(path.join(__dirname,'..',file),'utf8'))(api);
const straight={length:1e8,halfWidth:100,contains:()=>true,nearest:(x,y)=>({x,y:0,tx:1,ty:0,distance:Math.abs(y),progress:x})};
function car(vehicle='balanced'){
 const c=api.createNeuroRace(api.createNeuroTrack('veloz'),'normal',{vehicle}).cars[0];
 return Object.assign(c,{x:0,y:0,angle:0,driftHeading:0,launchTicks:0});
}
const results={};
for(const id of Object.keys(api.NeuroVehicles)){
 const c=car(id);
 for(let i=0;i<900;i++)api.predictNeuroCar(straight,c,{accelerate:true});
 const acceleration=c.speed;
 for(let i=0;i<5000;i++)api.predictNeuroCar(straight,c,{accelerate:true});
 results[id]={acceleration,top:c.speed*54};
 assert(c.speed*54<=api.NeuroVehicles[id].speed+.001);
 assert(c.speed*54>api.NeuroVehicles[id].speed-1,'Must reach intended top speed');
}
assert(results.agile.acceleration>results.power.acceleration,'Agile accelerates better');
assert(results.power.top>results.agile.top+15,'Speedster trades handling for top speed');
function corner(id){const c=car(id);Object.assign(c,{speed:3.3,steering:.7,gear:6});api.predictNeuroCar(straight,c,{right:true});return c;}
assert(Math.abs(corner('agile').angle)>Math.abs(corner('power').angle),'Agile holds tighter fast corners');
const follower=Object.assign(car(),{speed:3,gear:5}),leader=Object.assign(car(),{x:60,speed:3,gear:5});
assert(api.neuroDraftTarget(follower,[follower,leader])>.8);
for(const patch of [{y:35},{angle:Math.PI},{pitState:'service'},{done:true},{disconnected:true},{offRoad:true},{x:-60},{x:400}]){
 assert.equal(api.neuroDraftTarget(follower,[follower,{...leader,...patch}]),0,JSON.stringify(patch));
}
const solo={...follower},tow={...follower};
for(let i=0;i<180;i++){tow.draftTarget=1;api.predictNeuroCar(straight,tow,{accelerate:true});api.predictNeuroCar(straight,solo,{accelerate:true});}
assert(tow.speed>solo.speed,'Reduced drag increases speed gradually');
const before=tow.slipstream;tow.draftTarget=0;api.predictNeuroCar(straight,tow,{});assert(tow.slipstream<before&&tow.slipstream>0);
for(let i=0;i<30;i++)api.predictNeuroCar(straight,tow,{});assert.equal(tow.slipstream,0);
assert.equal(api.neuroVehicleId('__proto__'),'balanced');
assert.equal(api.neuroVehicleId(999),'balanced');
for(const vehicle of Object.keys(api.NeuroVehicles)){
 const track=api.createNeuroTrack('serra'),race=api.createNeuroRace(track,'normal',{vehicle,transmission:'manual'});
 race.cars.slice(1).forEach(c=>c.done=true);for(let i=0;i<180;i++)race.step();
 for(let i=0;i<400;i++){
  const input={accelerate:true,steering:i>200?.25:0,shiftUp:i%100===0};
  const predicted={...race.cars[0]};api.predictNeuroCar(track,predicted,input);race.step(input);
  for(const key of ['x','y','speed','angle','gear','rpm'])assert.equal(predicted[key],race.cars[0][key],vehicle+': '+key);
 }
}
console.log('OK: distinct vehicle tradeoffs, drafting geometry, progressive gain/loss and identical prediction.',results);
