const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(player){
 let shown=[],saved=0,page,fail=false;
 class Element{constructor(tag){this.tag=tag;this.children=[];this.events={}}append(...children){this.children.push(...children)}setAttribute(){}focus(){}showModal(){}close(){}remove(){}addEventListener(name,fn){this.events[name]=fn}}
 const status={};const document={documentElement:{lang:'pt-BR'},body:{append:d=>shown.push(d)},createElement:t=>new Element(t),getElementById:()=>status};
 const window={matchMedia:()=>({matches:false}),NeuroGarage:{getPlayer:()=>player,showPage:p=>page=p,completeTutorial:async()=>{if(fail)throw Error('offline');saved++;player.tutorialComplete=true}}};
 vm.runInNewContext(fs.readFileSync('output/neurodrive-presentation.js','utf8'),{window,document,navigator:{getGamepads:()=>[]}});
 return {run:review=>window.NeuroPresentation.instructions(review),shown,saved:()=>saved,page:()=>page,fail:v=>fail=v};
}
(async()=>{
 const guest=setup(null);assert.equal(await guest.run(),false);assert.equal(guest.page(),'account');assert.equal(guest.shown.length,0);
 const old=setup({username:'old',tutorialComplete:true});assert.equal(await old.run(),true);assert.equal(old.shown.length,0);
 const user=setup({username:'new',tutorialComplete:false});const pending=user.run();const actions=user.shown[0].children.at(-1);user.fail(true);await actions.children[1].onclick();assert.equal(user.saved(),0);assert.equal(actions.children[1].disabled,false);
 user.fail(false);await actions.children[1].onclick();assert.equal(await pending,true);assert.equal(user.saved(),1);assert.equal(await user.run(),true);assert.equal(user.shown.length,1);
 const review=user.run(true);await user.shown.at(-1).children.at(-1).children[1].onclick();assert.equal(await review,true);assert.equal(user.saved(),1);
 const cancel=setup({username:'cancel'});const p=cancel.run();cancel.shown[0].events.cancel({preventDefault(){}});assert.equal(await p,false);assert.equal(cancel.saved(),0);
 console.log('OK: login gate, account skip, retry after failed save, review without resaving and cancel.');
})().catch(e=>{console.error(e);process.exitCode=1});
