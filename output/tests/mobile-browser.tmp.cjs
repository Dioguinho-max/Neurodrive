const fs=require('fs'),{createApp}=require('../../server/server.cjs'),WS=require('ws');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const app=createApp({origin:'http://127.0.0.1:3098',database:':memory:'});const server=app.server||app;await new Promise(r=>server.listen(3098,'127.0.0.1',r));const tabs=await(await fetch('http://127.0.0.1:9237/json')).json();const ws=new WS(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.on('open',r));let id=0;const pending=new Map();ws.on('message',raw=>{const m=JSON.parse(raw);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}});const send=(method,params={})=>new Promise(r=>{pending.set(++id,r);ws.send(JSON.stringify({id,method,params}));});const run=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.result?.exceptionDetails)throw Error(JSON.stringify(r.result.exceptionDetails));return r.result?.result?.value;};
try{await send('Emulation.setTouchEmulationEnabled',{enabled:true});
for(const page of ['corrida','online']){
 await send('Page.navigate',{url:`http://127.0.0.1:3098/${page}.html`});for(let i=0;i<80;i++){await sleep(200);if(await run('document.readyState==="complete" && !!window.createRaceHUD'))break;}
 await run(`document.querySelectorAll('dialog[open]').forEach(d=>d.close());window.testHUD=createRaceHUD(id=>document.getElementById(id));testHUD({tyreWearEnabled:true,tyreLife:1,tyreCompound:'dry',speed:1,completedLaps:0,gear:1},1,6,3,0);`);
 for(const [width,height] of [[844,300],[740,360],[390,844]]){
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await sleep(350);
 const result=await run(`(()=>{const box=id=>document.getElementById(id).getBoundingClientRect();const p=box('race-pit-panel');const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;return {inside:p.left>=0&&p.right<=innerWidth&&p.top>=0&&p.bottom<=innerHeight,overlap:[...document.querySelectorAll('.race-touch button:not([hidden]),.drive-hud')].some(n=>overlap(p,n.getBoundingClientRect())),width:innerWidth,height:innerHeight};})()`);console.log(page,width,result);if(!result.inside||result.overlap)throw Error('HUD collision');
 if(width===740){const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`output/tests/mobile-${page}.tmp.png`,Buffer.from(shot.result.data,'base64'));}
 }
 await run(`document.getElementById('pit-tyre-wet').click()`);if(await run(`document.getElementById('race-pit-compound').value`)!=='wet')throw Error('Compound failed');
}
}finally{ws.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
