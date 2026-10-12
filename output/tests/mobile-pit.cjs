const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const nodes=new Map();
function element(){return {children:[],events:{},attrs:{},hidden:false,disabled:false,append(...children){this.children.push(...children);for(const child of children){child.parent=this;if(child.id)nodes.set(child.id,child);}},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,v){this.events[k]=v;},contains(n){return n===this||this.children.some(c=>c.contains(n));},click(){if(!this.disabled)this.onclick?.({detail:0});},closest(s){return s==='[data-drive]'&&this.drive?this:null;}};}
const panel=element();nodes.set('race-pit-panel',panel);const request=element(),choice=element();nodes.set('race-pit-request',request);nodes.set('race-pit-compound',choice);
let calls=0,now=0;request.onclick=()=>calls++;
const events={},window={matchMedia:()=>({addEventListener(){}})};
const document={getElementById:id=>nodes.get(id),createElement:element,addEventListener:(name,fn)=>events[name]=fn};
vm.runInNewContext(fs.readFileSync('output/neurodrive-mobile-pit.js','utf8'),{window,document,performance:{now:()=>now}});
const toggle=nodes.get('mobile-pit-toggle'),options=nodes.get('mobile-pit-options');
window.NeuroMobilePit.update({tyreLife:1},'racing');
function touch(target,pointerId=3){const e={pointerType:'touch',pointerId,isPrimary:false,target,preventDefault(){}};target.events.pointerdown?.(e);events.pointerdown(e);}
touch(toggle);assert.equal(options.hidden,false,'Non-primary finger opens options without click');
const pedal=element();pedal.drive=true;touch(pedal,1);assert.equal(options.hidden,false,'Pedals do not close options');
toggle.onclick({pointerType:'touch',detail:1});assert.equal(options.hidden,false,'Compatibility click cannot toggle twice');
touch(options.children[1]);assert.equal(choice.value,'wet');assert.equal(calls,1);assert.equal(options.hidden,true);
options.children[1].onclick({pointerType:'touch',detail:1});assert.equal(calls,1);
now=1200;window.NeuroMobilePit.update({tyreLife:1,pitRequested:true},'racing');touch(toggle);assert.equal(calls,2,'One touch cancels');
now=2400;window.NeuroMobilePit.update({tyreLife:1,pitState:'service'},'racing');touch(toggle);assert.equal(calls,2);
window.NeuroMobilePit.update({tyreLife:1},'racing');toggle.click();assert.equal(options.hidden,false,'Keyboard still opens options');
events.pointerdown({target:element()});assert.equal(options.hidden,true,'Outside tap closes');
console.log('OK: secondary touch, pedal changes, duplicate click, compound request, cancel, disabled service and keyboard.');
