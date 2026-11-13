const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(touch=false,unsupported=false){
 const nodes=new Map();let timer,frames=[],requests=0,removed=false;
 const get=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,disabled:false,dataset:{},textContent:'',open:false,showModal(){this.open=true},close(){this.open=false},remove(){removed=true},focus(){},querySelector(){return null},addEventListener(){}});return nodes.get(id)};
 const classes=new Set(['game-booting']);
 const root={classList:{remove:k=>classes.delete(k)},requestFullscreen:async()=>{requests++;if(unsupported)throw Error('denied')}};
 const document={documentElement:root,fullscreenEnabled:true,getElementById:get};
 const window={matchMedia:()=>({matches:touch})};
 vm.runInNewContext(fs.readFileSync('output/neurodrive-boot.js','utf8'),{window,document,localStorage:{getItem:()=>null},setTimeout:f=>{timer=f;return 1},clearTimeout(){},requestAnimationFrame:f=>frames.push(f),location:{reload(){}}});
 return {get,window,classes,requests:()=>requests,removed:()=>removed,timer:()=>timer(),flush:()=>{while(frames.length)frames.shift()()}};
}
(async()=>{
 const desktop=setup();assert(desktop.classes.has('game-booting'));desktop.window.NeuroBoot.ready();desktop.flush();assert(desktop.removed());assert.equal(desktop.requests(),0);
 const mobile=setup(true);mobile.window.NeuroBoot.ready();assert(!mobile.get('boot-enter').hidden);assert(!mobile.removed());await mobile.get('boot-enter').onclick();assert.equal(mobile.requests(),1);assert(mobile.removed());
 const blocked=setup(true,true);blocked.window.NeuroBoot.ready();await blocked.get('boot-enter').onclick();assert(!blocked.removed());assert(!blocked.get('boot-browser').hidden);blocked.get('boot-browser').onclick();assert(blocked.removed());
 const stalled=setup();stalled.timer();assert(!stalled.get('boot-retry').hidden);assert(!stalled.removed());
 console.log('OK: ready-gated desktop startup, fullscreen on mobile gesture, denied fullscreen fallback and slow-load retry.');
})().catch(e=>{console.error(e);process.exitCode=1});
