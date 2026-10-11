const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
async function setup({touch=true,support=true,reject=false}={}){
 const events={},children={};let played=0,paused=0,requests=0,locked=0;
 const gate={open:false,setAttribute(){},querySelector(id){return children[id]||=( {hidden:false,focus(){}});},showModal(){this.open=true;},close(){this.open=false;},addEventListener(name,fn){this[name]=fn;}};
 const document={fullscreenElement:null,fullscreenEnabled:support,body:{append(){}},createElement:()=>gate,addEventListener:(name,fn)=>events[name]=fn,getElementById:()=>({click(){paused++;}})};
 document.documentElement={async requestFullscreen(){requests++;if(reject)throw Error('denied');document.fullscreenElement={};events.fullscreenchange();}};
 const screen={orientation:{async lock(){locked++;}}};
 vm.runInNewContext(fs.readFileSync('output/neurodrive-fullscreen.js','utf8'),{window:{matchMedia:()=>({matches:touch})},document,screen});
 const target={id:'race-menu-play',isConnected:true,disabled:false,click(){let stopped=false;events.click({target:{closest:()=>target},preventDefault(){},stopImmediatePropagation(){stopped=true;}});if(!stopped)played++;}};
 return {target,gate,children,document,events,counts:()=>({played,paused,requests,locked})};
}
const flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const a=await setup();a.target.click();await flush();assert.deepEqual(a.counts(),{played:1,paused:0,requests:1,locked:1});
 a.document.fullscreenElement=null;a.events.fullscreenchange();assert.equal(a.counts().paused,1);
 const b=await setup({reject:true});b.target.click();await flush();assert(b.gate.open);assert.equal(b.counts().played,0);b.children['#mobile-screen-fallback'].onclick();assert.equal(b.counts().played,1);assert(!b.gate.open);
 const c=await setup({support:false});c.target.click();await flush();assert(c.children['#mobile-screen-enter'].hidden);assert.equal(c.counts().requests,0);c.gate.cancel();c.children['#mobile-screen-fallback'].onclick();assert.equal(c.counts().played,0);
 const d=await setup({touch:false});d.target.click();assert.equal(d.counts().played,1);assert.equal(d.counts().requests,0);
 console.log('OK: mobile fullscreen, exit to menu, denial, unsupported fallback, cancel and desktop.');
})().catch(e=>{console.error(e);process.exitCode=1;});
