const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const nodes={'radio-sound':{checked:true},'radio-voice':{checked:true},'radio-volume':{value:'45'}};
nodes['radio-speaker']={options:[],value:'',replaceChildren(...options){this.options=options;},append(option){this.options.push(option);}};
nodes['radio-test']={};
const events={},spoken=[],timers=new Map();let sequence=0,cancels=0,tones=0,modal=false,mutation;
const window={addEventListener:(key,fn)=>events[key]=fn,NeuroI18n:{language:'en-US',t:()=> 'Final lap!'},SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},
speechSynthesis:{getVoices:()=>[{lang:'en-US',localService:true}],speak:value=>spoken.push(value),cancel:()=>cancels++},
AudioContext:class{state='running';currentTime=0;destination={};resume(){}close(){}createGain(){return {connect(){},disconnect(){},gain:{setValueAtTime(){},linearRampToValueAtTime(){}}};}createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(){tones++;},stop(){}};}}};
const document={documentElement:{},hidden:false,getElementById:id=>nodes[id],querySelector:()=>modal,addEventListener:(key,fn)=>events[key]=fn};
document.createElement=()=>({setAttribute(){}});
const saved=new Map();
let voices=[{lang:'en-US',name:'Basic',voiceURI:'basic',localService:true},{lang:'en-US',name:'Natural',voiceURI:'natural',localService:false},{lang:'pt-BR',name:'Natural PT',voiceURI:'pt'}];
window.speechSynthesis.getVoices=()=>voices;
window.speechSynthesis.addEventListener=(key,fn)=>events[key]=fn;
new Function('window','document','localStorage','MutationObserver','setTimeout','clearTimeout',fs.readFileSync(path.join(__dirname,'../neurodrive-radio-audio.js'),'utf8'))(window,document,{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)},class{constructor(fn){mutation=fn;}observe(){}},fn=>{timers.set(++sequence,fn);return sequence;},id=>timers.delete(id));
const audio=window.createNeuroRadioAudio();
function flush(){for(const [id,fn] of timers){timers.delete(id);fn();}}
(async()=>{
 await events.pointerdown();audio.play('Última volta');flush();
 assert.equal(tones,1);assert.equal(spoken[0].text,'Final lap!');assert.equal(spoken[0].lang,'en-US');assert.equal(spoken[0].volume,.45);
 audio.play('Pneus');audio.play('Furo');flush();assert.equal(spoken.length,2,'New warning replaces pending speech');
 modal=true;mutation();assert(cancels>0);audio.play('hidden');flush();assert.equal(spoken.length,2);
 modal=false;nodes['radio-voice'].checked=false;nodes['radio-voice'].onchange();audio.play('silent voice');flush();assert.equal(spoken.length,2);assert.equal(tones,4);
 nodes['radio-volume'].value='0';audio.play('mute');flush();assert.equal(tones,4);
 assert.equal(spoken[0].voice.voiceURI,'natural');assert.equal(spoken[0].rate,.96);
 assert.equal(nodes['radio-speaker'].options.length,3,'Only matching language voices plus automatic');
 nodes['radio-volume'].value='45';nodes['radio-voice'].checked=true;modal=true;
 nodes['radio-speaker'].value='basic';nodes['radio-speaker'].onchange();nodes['radio-test'].onclick();
 assert.equal(spoken.at(-1).voice.voiceURI,'basic','Preview respects saved selection inside settings');
 window.NeuroI18n.language='pt-BR';events['neurodrive:language']();nodes['radio-test'].onclick();
 assert.equal(spoken.at(-1).voice.voiceURI,'pt','Voice choice is scoped to language');
 voices=[];events.voiceschanged();assert.equal(nodes['radio-speaker'].options.length,1);
 voices=[{lang:'pt-BR',name:'Loaded later',voiceURI:'late'}];events.voiceschanged();nodes['radio-test'].onclick();
 assert.equal(spoken.at(-1).voice.voiceURI,'late');
 document.hidden=true;const before=spoken.length;nodes['radio-test'].onclick();assert.equal(spoken.length,before);
 console.log('OK: radio cue, translated voice, volume, replacement, menu cancellation and mute.');
})().catch(error=>{console.error(error);process.exitCode=1;});
