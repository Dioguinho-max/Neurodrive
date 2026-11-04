'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const nodes={'radio-sound':{checked:false},'radio-voice':{checked:true},'radio-volume':{value:'45'},'radio-test':{},
 'radio-speaker':{options:[],value:'',replaceChildren(...v){this.options=v;},append(v){this.options.push(v);}}};
const events={},audios=[],timers=new Map(),saved=new Map();let counter=0,modal=false,mutation;
const window={NeuroI18n:{language:'pt-BR',t:s=>s},addEventListener:(k,f)=>events[k]=f,
 Audio:class {constructor(src){this.src=src;audios.push(this);}play(){this.onplaying?.();return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){this.src='';}load(){}}};
const document={hidden:false,documentElement:{},getElementById:id=>nodes[id],querySelector:()=>modal,
 createElement:()=>({setAttribute(){}}),addEventListener:(k,f)=>events[k]=f};
new Function('window',fs.readFileSync(path.join(root,'neurodrive-radio-clips.js'),'utf8'))(window);
new Function('window','document','localStorage','MutationObserver','setTimeout','clearTimeout',fs.readFileSync(path.join(root,'neurodrive-radio-audio.js'),'utf8'))(
 window,document,{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)},class{constructor(f){mutation=f;}observe(){}},f=>{timers.set(++counter,f);return counter;},id=>timers.delete(id));
const radio=window.createNeuroRadioAudio(),flush=()=>{for(const [id,f]of timers){timers.delete(id);f();}};
assert.equal(nodes['radio-speaker'].value,'neural','Neural voice defaults on without operating system speech');
modal=true;nodes['radio-test'].onclick();assert.match(audios.at(-1).src,/pt-BR\/preview.wav$/);
assert.equal(audios.at(-1).volume,.45);assert.equal(window.NeuroRadioSpeaking,true);
const first=audios.at(-1);mutation();assert(first.paused);assert.equal(window.NeuroRadioSpeaking,false);
first.onplaying();assert.equal(window.NeuroRadioSpeaking,false,'Late events cannot revive cancelled speech');
modal=false;radio.play('Pneu furado. Reduza e entre nos boxes.');radio.play('Última volta. Mantenha o ritmo!');flush();
assert.match(audios.at(-1).src,/last-lap.wav$/);assert.equal(audios.length,2,'Pending messages are replaced');
audios.at(-1).onerror();assert.equal(window.NeuroRadioSpeaking,false,'Failure restores engine level without system fallback');
window.NeuroI18n.language='en-US';events['neurodrive:language']();nodes['radio-test'].onclick();assert.match(audios.at(-1).src,/en-US\/preview.wav$/);
nodes['radio-voice'].checked=false;nodes['radio-voice'].onchange();const count=audios.length;radio.play('Pneu furado. Reduza e entre nos boxes.');flush();assert.equal(audios.length,count);
nodes['radio-voice'].checked=true;document.hidden=true;nodes['radio-test'].onclick();assert.equal(audios.length,count);
document.hidden=false;window.NeuroI18n.language='pt-BR';events['neurodrive:language']();
nodes['radio-speaker'].value='neural:faber';nodes['radio-speaker'].onchange();nodes['radio-test'].onclick();
assert.match(audios.at(-1).src,/pt-BR-faber\/preview.wav$/);
events['neurodrive:language']();assert.equal(nodes['radio-speaker'].value,'neural:faber','Alternate neural voice persists');
let bytes=0,files=0;
for(const clips of [...Object.values(window.NeuroRadioClips),...Object.values(window.NeuroRadioVariants.faber)]) for(const file of Object.values(clips)){
 files++;
 const data=fs.readFileSync(path.join(root,file));bytes+=data.length;
 assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WAVE');
 assert.equal(data.readUInt16LE(22),1,'Mono');assert.equal(data.readUInt32LE(24),22050);assert.equal(data.readUInt16LE(34),16);
 assert(data.length>20000&&data.length<450000);let peak=0;for(let i=44;i+1<data.length;i+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(i)));
 assert(peak>500&&peak<32767,'Audible signal without full-scale clipping');
}
assert.equal(Object.keys(window.NeuroRadioClips).length,7);assert.equal(files,21);
console.log(`OK: 21 neural clips (${(bytes/1024/1024).toFixed(2)} MiB), PT/EN, voice choice, default, preview, cancellation, stale events, errors, mute and engine ducking flag.`);
