'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { once } = require('node:events');
const { createRequire } = require('node:module');
const { WebSocket } = require('ws');
const filename = path.resolve(__dirname, '../../server/online.cjs'), mod = {exports:{}};
let tick, now = 0, current;
new Function('require','module','__dirname','setInterval','clearInterval','performance',fs.readFileSync(filename,'utf8')+'\nmodule.exports.engine=engine;')(
  createRequire(filename),mod,path.dirname(filename),(fn,ms)=>{tick=()=>{now+=ms;fn();};return 1;},()=>{},{now:()=>now});
const create = mod.exports.engine.createNeuroRace;
for (const [tyreWear,factor] of [['reduced',.6],['normal',1],['intense',1.5]]) {
  const race=create(mod.exports.engine.createNeuroTrack('serra'),'normal',{laps:1,tyreWear});
  assert.equal(race.cars[0].tyreWearRate,.08*factor);
  assert.equal(race.cars[0].tyreWearEnabled,true,'Explicit wear rules apply on short dry races too');
}
mod.exports.engine.createNeuroRace=(...args)=>(current=create(...args));
const pause=()=>new Promise(resolve=>setImmediate(resolve));
async function advance(n) { for(let i=0;i<n;i++){tick();if(i%15===0)await pause();} }
(async()=>{
  const server=http.createServer(), clients=[], awards=[];
  const online=mod.exports.attachOnline(server,{origin:'http://test',store:{profile:async id=>({username:id}),award:async(...args)=>{awards.push(args);return 10;}}});
  try {
    server.listen(0,'127.0.0.1');await once(server,'listening');
    async function connect(id){
      const ws=new WebSocket(`ws://127.0.0.1:${server.address().port}/online`,{origin:'http://test'}),queue=[];
      clients.push(ws);ws.on('message',raw=>queue.push(JSON.parse(raw)));
      const peer={send:data=>ws.send(JSON.stringify(data)),async next(test){
        for(let i=0;i<300;i++){const index=queue.findIndex(test);if(index>=0)return queue.splice(index,1)[0];await new Promise(r=>setTimeout(r,5));}
        throw Error('Missing message: '+test);
      }};
      await once(ws,'open');peer.send({type:'auth',ticket:online.issue(id)});await peer.next(m=>m.type==='auth');return peer;
    }
    const a=await connect('a'), b=await connect('b'), outsider=await connect('c');
    a.send({type:'create',mode:'championship',track:'serra',laps:1});
    const room=await a.next(m=>m.type==='lobby');assert.equal(room.championship.round,1);
    b.send({type:'join',code:room.code});await a.next(m=>m.type==='lobby'&&m.players.length===2);
    const settings={type:'settings',weather:'rain',laps:5,difficulty:'hard',tyreWear:'intense'};
    b.send(settings);assert.match((await b.next(m=>m.type==='error')).message,/dono/);
    a.send({...settings,tyreWear:'invalid'});assert.match((await a.next(m=>m.type==='error')).message,/inválidas/);
    a.send({type:'ready',ready:true});await a.next(m=>m.type==='lobby'&&m.players.some(p=>p.ready));
    a.send(settings);
    const configured=await a.next(m=>m.type==='lobby'&&m.reset);
    assert(configured.players.every(p=>!p.ready));assert.equal(configured.rules.difficulty,'hard');
    for(let round=1;round<=3;round++){
      a.send({type:'ready',ready:true,vehicle:'agile'});b.send({type:'ready',ready:true,vehicle:'power'});
      await a.next(m=>m.type==='lobby'&&m.players.every(p=>p.ready));a.send({type:'start'});
      await a.next(m=>m.type==='state'&&m.stage==='qualifying');
      assert.equal(current.cars[0].vehicle,'agile');assert.equal(current.cars[1].vehicle,'power');
      assert.equal(current.cars[2].aiPower,1.4);assert.equal(current.cars[0].tyreWearRate,.06*1.5);
      a.send(settings);assert.match((await a.next(m=>m.type==='error')).message,/antes/);
      a.send({type:'vote',track:'veloz'});assert.match((await a.next(m=>m.type==='error')).message,/votação/);
      current.cars.forEach((car,i)=>{car.bestLap=i===1?40:50+i;});
      current.endQualifying();await advance(603);await a.next(m=>m.stage==='race');
      assert.equal(current.cars[0].vehicle,'agile');assert.equal(current.cars[1].vehicle,'power');
      assert.equal(current.laps,5);assert.equal(current.cars[0].weatherMode,'rain');
      await advance(185);
      current.cars.forEach((car,i)=>Object.assign(car,{done:true,finishTime:100+i,place:i+1,bestLap:35+i}));
      if(round===2) Object.assign(current.cars[1],{finishTime:null,place:null});
      await advance(6);await pause();
      const finished=await a.next(m=>m.phase==='finished'&&m.stage==='race'&&m.championship?.round===round);
      assert.equal(finished.championship.standings.find(p=>p.id==='a').points,round*25);
      assert.equal(finished.championship.standings[0].history.length,round);
      assert.equal(finished.stats.fastest.time,35);
      assert.equal(finished.stats.drivers.find(p=>p.id===1).gained,1);
      assert.equal(finished.stats.drivers.find(p=>p.id===2).gap,round===2?null:1);
      assert.equal(finished.championship.standings.find(p=>p.id==='b').points,(round===1?1:round-1)*18,'Unfinished rounds earn no points');
      await advance(9);
      const repeat=await a.next(m=>m.phase==='finished'&&m.stage==='race'&&m.championship?.round===round);
      assert.deepEqual(repeat.championship.standings,finished.championship.standings,'No duplicate scoring');
      if(round===3){
        assert.equal(finished.championship.complete,true);
        a.send({type:'rematch',track:'serra'});assert.match((await a.next(m=>m.type==='error')).message,/encerrado/);break;
      }
      a.send({type:'vote',track:'invalid'});assert.match((await a.next(m=>m.type==='error')).message,/inválido/);
      a.send({type:'vote',track:'serra'});a.send({type:'vote',track:'veloz'});b.send({type:'vote',track:'veloz'});
      const voted=await a.next(m=>m.type==='presence'&&m.votes?.a==='veloz'&&m.votes?.b==='veloz');
      assert.equal(Object.keys(voted.votes).length,2,'Replacing a vote does not add votes');
      b.send({type:'rematch',track:'veloz'});assert.match((await b.next(m=>m.type==='error')).message,/dono/);
      a.send({type:'rematch',track:'serra'});assert.match((await a.next(m=>m.type==='error')).message,/votadas/);
      b.send({type:'vote',track:'serra'});
      await a.next(m=>m.type==='presence'&&m.votes?.a==='veloz'&&m.votes?.b==='serra');
      a.send({type:'rematch',track:'veloz'});
      const next=await a.next(m=>m.type==='lobby'&&m.reset);
      assert.equal(next.code,room.code);assert.equal(next.championship.round,round+1);
      assert.equal(next.track,'veloz');assert.deepEqual(next.votes,{});assert(next.players.every(p=>!p.ready));
      outsider.send({type:'join',code:room.code});assert.match((await outsider.next(m=>m.type==='error')).message,/começou/);
    }
    assert.equal(awards.length,5,'One reward per valid player finish');
    assert.equal(new Set(awards.map(a=>a[1])).size,3,'Distinct race IDs across rounds');
    console.log('OK: three rounds, server scores, no duplicate points/rewards, champion, vote replacement, majority, owner authorization and roster lock.');
  } finally { clients.forEach(ws=>ws.terminate());online.close();await new Promise(r=>server.close(r)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
