const assert=require('node:assert/strict'),fs=require('node:fs');
const sources=[],gains=[];
const param=()=>({value:0,setTargetAtTime(value){this.value=value;}});
const node=()=>({connect(){},disconnect(){}});
const context={currentTime:0,decodeAudioData:async()=>({duration:.7}),
 createGain(){const n={...node(),gain:param()};gains.push(n);return n;},
 createBufferSource(){const n={...node(),playbackRate:param(),start(){this.started=true;},stop(){this.stopped=true;this.onended?.();}};sources.push(n);return n;}};
const host={};let requests=0;
new Function('window','document','fetch',fs.readFileSync('output/neurodrive-engine-samples.js','utf8'))(host,
 {currentScript:{src:'http://localhost/neurodrive-engine-samples.js'}},async()=>{requests++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};});
(async()=>{
 const engine=host.createNeuroSampleEngine(context,node(),node());
 assert.equal(engine.update({rpm:1000}),false);
 await engine.loading;assert.equal(requests,5);assert.equal(sources.length,4);
 const car={rpm:6000,throttle:1,gear:2,shiftTicks:0};
 for(let i=0;i<40;i++){context.currentTime=i*.05;assert(engine.update(car));}
 assert(gains[1].gain.value>0&&gains[2].gain.value>0,'Crossfade between adjacent RPM layers');
 assert(sources.every(s=>s.loop&&s.started));
 car.throttle=0;context.currentTime+=.05;engine.update(car);
 assert.equal(sources.length,5,'Lift plays recorded release');
 for(let i=0;i<10;i++){context.currentTime+=.05;engine.update(car);}
 assert.equal(sources.length,5,'No duplicate release');assert.equal(requests,5,'No streaming per frame');
 const beforeRates=sources.slice(0,4).map(source=>source.playbackRate.value);
 const coastBefore=gains[3].gain.value;
 car.rpm=2500;context.currentTime+=.05;engine.update(car);
 assert(sources.slice(0,4).every((source,i)=>source.playbackRate.value<beforeRates[i]),'Every layer follows falling RPM without a rate floor');
 assert(gains[3].gain.value>.9,'Throttle lift exposes the coasting recording');
 car.throttle=1;context.currentTime+=.05;engine.update(car);
 assert(gains[3].gain.value<coastBefore,'Throttle restores loaded engine');
 engine.silence();assert(gains.slice(0,4).every(g=>g.gain.value===0));assert(sources[4].stopped);
 engine.dispose();assert(sources.every(s=>s.stopped));
 const pending=host.createNeuroSampleEngine(context,node(),node());pending.dispose();await pending.loading;
 assert.equal(sources.length,5,'Disposed loading cannot start late sources');
 console.log('OK: recorded engine loading, RPM crossfade, release, pause and disposal.');
})().catch(e=>{console.error(e);process.exitCode=1;});
