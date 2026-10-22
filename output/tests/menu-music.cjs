const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const menu={open:true}, button={setAttribute(name,value){this[name]=value;}}, volume={value:'20'};
const events={}, storage=new Map();
let observe, starts=0, stops=0, buffers=0;
class AudioContext {
  state='running';
  currentTime=0; destination={};
  async resume() {}
  close() {}
  createGain(){return {connect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}}};}
  createBuffer(channels,length){buffers++;const data=new Float32Array(length);return {getChannelData:()=>data};}
  createBufferSource(){return {connect(){},disconnect(){},start(){starts++;},stop(){stops++;}};}
}
const window={AudioContext,addEventListener(type,fn){events[type]=fn;}};
const document={hidden:false,getElementById:id=>({'race-menu':menu,'menu-music':button,'menu-music-volume':volume}[id]),addEventListener(type,fn){events[type]=fn;}};
const localStorage={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)};
new Function('window','document','localStorage','MutationObserver',fs.readFileSync(path.join(__dirname,'../neurodrive-menu-music.js'),'utf8'))(window,document,localStorage,class{constructor(fn){observe=fn;}observe(){}});
(async()=>{
  assert.equal(starts,0,'No autoplay before user activation');
  assert.equal(button['aria-pressed'],'true','Music defaults to enabled');
  await events.pointerdown({target:{closest:()=>button}});
  assert.equal(starts,0,'Pointer on the toggle is handled only by its click');
  await button.onclick(); assert.equal(starts,1,'First click starts default-enabled music'); assert.equal(buffers,1);
  menu.open=false;observe();assert.equal(stops,1,'Racing stops the menu music');
  menu.open=true;observe();assert.equal(starts,2);assert.equal(buffers,1,'Reuse the generated track');
  document.hidden=true;events.visibilitychange();assert.equal(stops,2);
  document.hidden=false;events.visibilitychange();assert.equal(starts,3);
  volume.value='12';volume.oninput();assert.equal(storage.get('neurodrive-menu-volume'),'12');
  await button.onclick();assert.equal(stops,3);assert.equal(button['aria-pressed'],'false');
  assert.equal(storage.get('neurodrive-menu-music'),'off');
  await events.keydown({target:{}});assert.equal(starts,3,'Interaction does not override mute');
  menu.open=false;observe();menu.open=true;observe();assert.equal(starts,3,'Disabled music stays disabled');
  await button.onclick();assert.equal(starts,4,'One click re-enables muted music');
  assert.equal(storage.get('neurodrive-menu-music'),'on');
  events.pagehide();
  console.log('OK: menu music activation, shared buffer, pause, gameplay, hidden tab, volume and teardown.');
})().catch(error=>{console.error(error);process.exitCode=1;});
