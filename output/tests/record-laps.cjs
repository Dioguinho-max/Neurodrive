const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api={};
for(const file of ['neuro-pista-track.js','neurodrive-race-engine.js'])new Function('window',fs.readFileSync(path.join(__dirname,'..',file),'utf8'))(api);
function setup(){
 const track=api.createNeuroTrack('veloz'),race=api.createNeuroRace(track,'normal',{laps:5});
 race.cars.slice(1).forEach(car=>car.done=true);
 for(let i=0;i<540;i++)race.step();
 const car=race.cars[0];car.recordLapStarted=true;car.recordLapInvalid=false;
 return {track,race,car};
}
function cross({track,race,car}){
 const s=track.length-1,segment=track.segments.at(-1),t=(s-segment.start)/segment.size;
 Object.assign(car,{x:segment.a.x+segment.dx*t,y:segment.a.y+segment.dy*t,angle:Math.atan2(segment.dy,segment.dx),speed:3,
   progress:track.length*2-1,checkpoint:23,completedLaps:1,lapStart:0,cooldown:0});
 race.step({accelerate:true});
 assert.equal(car.completedLaps,2,'Fixture crosses finish');
}
let test=setup();cross(test);assert(test.car.recordLap?.milliseconds>1000,'Full clean flying lap produces record');
test=setup();test.car.recordLapStarted=false;cross(test);assert.equal(test.car.recordLap,null,'First crossing only arms flying lap');
test=setup();test.race.recoverPlayer();cross(test);assert.equal(test.car.recordLap,null,'Recovery disqualifies lap');
test=setup();test.car.x+=10000;test.race.step();cross(test);assert.equal(test.car.recordLap,null,'Off-track driving disqualifies lap');
test=setup();test.car.cooldown=1;test.race.step();cross(test);assert.equal(test.car.recordLap,null,'Assisted repositioning disqualifies lap');
test=setup();test.car.angle+=Math.PI;test.car.speed=3;test.race.step({accelerate:true});cross(test);assert.equal(test.car.recordLap,null,'Reverse progress disqualifies lap');
test=setup();test.car.pitState='service';test.car.pitTimer=100;test.car.pitTrackProgress=0;test.race.step();test.car.pitState=null;cross(test);assert.equal(test.car.recordLap,null,'Pit service disqualifies lap');
test=setup();const nearest=test.track.nearest;let calls=0;test.track.nearest=(x,y)=>{const point=nearest(x,y);return ++calls>6?{...point,progress:point.progress+100}:point;};test.race.step();test.track.nearest=nearest;cross(test);assert.equal(test.car.recordLap,null,'Discontinuous progress disqualifies lap');
console.log('OK: clean flying lap, first crossing, recovery, off-track, cooldown and reverse validity.');
