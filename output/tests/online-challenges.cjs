const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {once}=require('node:events'),{createRequire}=require('node:module'),{WebSocket}=require('ws');
const filename=path.resolve(__dirname,'../../server/online.cjs'),mod={exports:{}};let timer,now=0,current;
new Function('require','module','__dirname','setInterval','clearInterval','performance',fs.readFileSync(filename,'utf8')+'\nmodule.exports.engine=engine;')(createRequire(filename),mod,path.dirname(filename),(fn,ms)=>{timer=()=>{now+=ms;fn();};return 1;},()=>{},{now:()=>now});
const create=mod.exports.engine.createNeuroRace;mod.exports.engine.createNeuroRace=(...args)=>(current=create(...args));
(async()=>{
 const server=http.createServer(),clients=[];let awards=0,records=0;
 const online=mod.exports.attachOnline(server,{origin:'http://test',store:{profile:async id=>({username:id}),award:async()=>{awards++;},saveRecord:async()=>{records++;}}});
 try{
  server.listen(0,'127.0.0.1');await once(server,'listening');
  async function connect(id){const ws=new WebSocket(`ws://127.0.0.1:${server.address().port}/online`,{origin:'http://test'}),queue=[];clients.push(ws);
   ws.on('message',raw=>{queue.push(JSON.parse(raw));if(queue.length>100)queue.shift();});
   const peer={send:data=>ws.send(JSON.stringify(data)),next:async test=>{for(let i=0;i<300;i++){const index=queue.findIndex(test);if(index>=0)return queue.splice(index,1)[0];await new Promise(r=>setTimeout(r,5));}throw Error('Missing '+test);}};
   await once(ws,'open');peer.send({type:'auth',ticket:online.issue(id)});await peer.next(m=>m.type==='auth');return peer;
  }
  const a=await connect('a'),b=await connect('b');
  async function advance(n){for(let i=0;i<n;i++){timer();if(i%50===0)await new Promise(r=>setImmediate(r));}}
  for(const mode of ['sprint','lap-challenge','drift-challenge']){
   a.send({type:'create',mode,track:'serra',laps:3,weather:'rain'});const lobby=await a.next(m=>m.type==='lobby'&&m.mode===mode&&!m.reset);assert.equal(lobby.mode,mode);assert.equal(lobby.weather,'dry');
   b.send({type:'join',code:lobby.code});await a.next(m=>m.type==='lobby'&&m.mode===mode&&m.code===lobby.code&&m.players.length===2);
   a.send({type:'ready',ready:true,vehicle:'drift'});b.send({type:'ready',ready:true});await a.next(m=>m.type==='lobby'&&m.mode===mode&&m.code===lobby.code&&m.players.every(p=>p.ready));
   a.send({type:'start'});const initial=await a.next(m=>m.type==='state'&&m.mode===mode&&m.stage==='race');assert.equal(initial.cars.length,2);
   a.send({type:'input',score:99999999,handbrake:true});await new Promise(r=>setImmediate(r));
   if(mode==='sprint'){await advance(185);current.cars.filter(c=>c.player).forEach((c,i)=>Object.assign(c,{done:true,finishTime:50+i,place:i+1}));await advance(6);}
   else await advance(7390);
   const result=await a.next(m=>m.type==='state'&&m.mode===mode&&m.phase==='finished');assert.equal(result.sessionStandings.length,2);assert(result.cars.every(c=>!c.rewardPending));
   if(mode==='drift-challenge')assert(result.cars.every(c=>c.challengeScore===0),'Forged scores ignored');
   b.send({type:'rematch',track:'serra'});await b.next(m=>m.type==='error');
   a.send({type:'rematch',track:'serra'});const rematch=await a.next(m=>m.type==='lobby'&&m.mode===mode&&m.reset);assert.equal(rematch.code,lobby.code);assert.deepEqual(rematch.sessionStandings,result.sessionStandings);assert(rematch.players.every(p=>!p.ready));
   a.send({type:'leave'});b.send({type:'leave'});await a.next(m=>m.type==='left');await b.next(m=>m.type==='left');
  }
  assert.equal(awards,0);assert.equal(records,0);
  console.log('OK: real WebSocket challenges, two players, fixed rules, server scores, no coin/record farming and owner-only rematch retaining standings.');
 }finally{clients.forEach(ws=>ws.terminate());online.close();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});
