'use strict';
const modes = ['sprint','lap-challenge','drift-challenge'];
function createChallenge(engine, track, mode, peers) {
  const timed = mode !== 'sprint', drift = mode === 'drift-challenge';
  let ended=false, ticks=0;
  const runs=timed ? peers.map((peer,index)=>{
    const race=engine.createNeuroRace(track,'normal',{mode:drift?'drift':'race',laps:20,challengeSolo:true,vehicle:peer.vehicle,transmission:peer.manual?'manual':'automatic',driftSetup:'stable',weather:'dry'});
    const car=race.cars[0];car.id=index+1;car.ghostChallenge=true;
    // Separate starting spots; each driver has an isolated simulation.
    Object.assign(car,race.pointAt(120+index*24),{tyreWearEnabled:false});
    return race;
  }) : [engine.createNeuroRace(track,'normal',{online:true,humans:peers.map((_,i)=>i+1),laps:1,weather:'dry'})];
  if(!timed) {runs[0].cars.forEach(c=>c.tyreWearEnabled=false);runs[0].cars.slice(peers.length).forEach(c=>{c.done=true;c.alive=false;c.disconnected=true;});}
  const cars=timed?runs.map(r=>r.cars[0]):runs[0].cars.slice(0,peers.length);
  const rank=()=>[...cars].sort((a,b)=>Number(!!a.disconnected)-Number(!!b.disconnected)||(drift?(b.challengeScore||0)-(a.challengeScore||0):timed?(a.challengeBest??Infinity)-(b.challengeBest??Infinity):(a.place||99)-(b.place||99)||b.progress-a.progress)||a.id-b.id);
  function finish(){
    ended=true;
    if(drift)runs.forEach((race,i)=>{cars[i].challengeScore=race.driftScore.total+Math.floor(race.driftScore.combo);cars[i].challengeCombo=0;});
    const ranked=rank();
    ranked.forEach((car,i)=>{
      const valid=!car.disconnected&&(drift?car.challengeScore>0:timed?car.challengeBest>0:car.finishTime!==null);
      const previous=ranked[i-1];
      const tied=timed&&i>0&&valid&&!previous.disconnected&&(drift?car.challengeScore===previous.challengeScore:car.challengeBest===previous.challengeBest);
      car.place=valid?(tied?previous.place:i+1):null;
      car.done=true;car.speed=0;car.rpm=900;
    });
  }
  return {
    cars,laps:1,qualifying:false,
    get phase(){return ended?'finished':(timed?ticks<180:runs[0].phase==='countdown')?'countdown':'racing';},
    get elapsed(){return timed?Math.min(120,Math.max(0,(ticks-180)/60)):runs[0].elapsed;},
    get countdown(){return timed?Math.max(0,Math.ceil((180-ticks)/60)):runs[0].countdown;}, get startLights(){return timed?Math.min(5,Math.floor(ticks/36)+1):runs[0].startLights;},
    standings:rank, requestPit:()=>false,
    recoverCar(id){const index=cars.findIndex(c=>c.id===id);if(index>=0){if(timed)runs[index].recoverPlayer();else runs[0].recoverCar(id);}},
    step(inputs){
      if(ended)return;
      ticks++;
      if(!timed){runs[0].step(inputs);if(runs[0].phase==='finished')finish();return;}
      runs.forEach((race,i)=>{
        const car=cars[i];if(car.disconnected)return;
        race.step(inputs[car.id]||{});
        if(drift){car.challengeScore=race.driftScore.total;car.challengeCombo=Math.floor(race.driftScore.combo);car.challengeMultiplier=race.driftScore.multiplier;}
        else if(car.recordLap?.milliseconds>0)car.challengeBest=Math.min(car.challengeBest??Infinity,car.recordLap.milliseconds/1000);
      });
      if(runs.every((r,i)=>cars[i].disconnected||r.phase==='finished')||ticks>=7380)finish();
    },
  };
}
function scoreSession(room) {
  if(room.sessionScored===room.raceId)return;
  room.sessionScores ||= new Map();
  const challenge=modes.includes(room.mode);
  for(const car of room.race.cars.filter(c=>c.player&&c.accountId)){
    const entry=room.sessionScores.get(car.accountId)||{id:car.accountId,name:car.name,points:0,wins:0,played:0};
    const valid=!car.disconnected&&car.place>0&&(challenge||car.finishTime!=null);
    entry.name=car.name;entry.played++;entry.points+=valid?([10,7,5,3,2,1][car.place-1]||0):0;
    if(valid&&car.place===1)entry.wins++;
    room.sessionScores.set(car.accountId,entry);
  }
  room.sessionScored=room.raceId;
}
module.exports={modes,createChallenge,scoreSession};
