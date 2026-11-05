const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createChallenge,scoreSession}=require('../../server/challenges.cjs');
const engine={};for(const file of ['neuro-pista-track.js','neurodrive-race-engine.js'])new Function('window',fs.readFileSync(path.join(__dirname,'..',file),'utf8'))(engine);
const peers=[{vehicle:'drift'},{vehicle:'agile'}];
for(const mode of ['lap-challenge','drift-challenge','sprint']){
 const race=createChallenge(engine,engine.createNeuroTrack('serra'),mode,peers);
 assert.equal(race.cars.length,2);assert.equal(race.phase,'countdown');
 for(let i=0;i<180;i++)race.step({});assert.equal(race.phase,'racing');
 if(mode==='sprint'){
  assert.equal(race.laps,1);race.cars[0].done=true;race.cars[0].finishTime=55;race.cars[0].place=1;
  race.cars[1].disconnected=true;race.cars[1].done=true;race.step({});
 }else{
  assert(race.cars.every(c=>c.ghostChallenge&&!c.tyreWearEnabled));
  // The leaderboard only accepts engine-produced valid flying-lap records.
  if(mode==='lap-challenge'){
   race.cars[0].bestLap=1;race.step({});assert.equal(race.cars[0].challengeBest,undefined);
   race.cars[0].recordLap={milliseconds:42000};race.step({});assert.equal(race.cars[0].challengeBest,42);
   race.cars[0].recordLap={milliseconds:43000};race.step({});assert.equal(race.cars[0].challengeBest,42);
   race.cars[1].recordLap={milliseconds:42000};
  }
  for(let i=0;i<7400&&race.phase!=='finished';i++)race.step({});
  assert.equal(race.elapsed,120);
  if(mode==='lap-challenge')assert(race.cars.every(c=>c.place===1),'Valid equal laps tie');
  else assert(race.cars.every(c=>!c.place),'Zero drift score cannot win');
 }
 assert.equal(race.phase,'finished');
 race.cars.forEach((c,i)=>Object.assign(c,{accountId:String(i),player:true}));
 const room={mode,race,raceId:'one'};scoreSession(room);const scores=JSON.stringify([...room.sessionScores]);scoreSession(room);assert.equal(JSON.stringify([...room.sessionScores]),scores,'No duplicate session points');
 room.raceId='two';scoreSession(room);assert.equal(room.sessionScores.get('0').played,2);
}
const disconnected=createChallenge(engine,engine.createNeuroTrack('serra'),'drift-challenge',peers);
disconnected.cars[0].disconnected=true;disconnected.cars[0].done=true;
for(let i=0;i<7380;i++)disconnected.step({});assert.equal(disconnected.phase,'finished');assert.equal(disconnected.elapsed,120);
console.log('OK: timed challenges, fixed sprint, valid lap source, ties, no-score results, session deduplication and disconnected clock.');
const track=engine.createNeuroTrack('serra');
const duel=createChallenge(engine,track,'drift-challenge',peers);
const solo=engine.createNeuroRace(track,'normal',{mode:'drift',vehicle:'drift',driftSetup:'stable'});
Object.assign(solo.cars[0],duel.cars[0]);
for(let tick=0;tick<7380;tick++){
 const input={accelerate:tick%160<120,steering:Math.sin(tick/60)*.65,handbrake:tick%100<10};
 duel.step({1:input});solo.step(input);
}
assert.equal(duel.cars[0].challengeScore,solo.driftScore.total+Math.floor(solo.driftScore.combo));
assert(duel.cars[0].challengeScore>0,'Real driving produces a server-side drift score');
console.log('OK: online Drift matches solo scoring, including the final unbanked combo.');
