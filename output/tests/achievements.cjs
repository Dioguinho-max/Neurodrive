const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
function element(){return {children:[],dataset:{},append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},setAttribute(){}};}
const host={},nodes={},document={createElement:element};let now=100;
new Function('window','document','Date',fs.readFileSync(path.join(__dirname,'../neurodrive-achievements.js'),'utf8'))(host,document,class extends Date{static now(){return now;}});
const {improvement,render}=host.NeuroAchievements;
assert.match(improvement(33000,32000),/1\.000 s/);assert.match(improvement(null,32000),/Primeira/);
assert.match(improvement(33000,null),/Nenhuma/);assert.match(improvement(33000,34000),/Sem melhoria/);
const grid=element(),history=element();render(grid,history,[{code:'first_win',achieved:1000},{code:'record_holder',achieved:2000,track:'veloz',season:'beta-1'}]);
assert.equal(grid.children.length,3);assert.equal(grid.children.filter(item=>item.dataset.earned==='true').length,2);
assert.equal(history.children[0].children[0].textContent,'Recordista');
for(const id of ['record-celebration','record-celebration-title','record-celebration-detail'])nodes[id]=element();
const notice=host.createNeuroRecordNotice(id=>nodes[id]);
const event={id:'session:lap1',track:'veloz',milliseconds:32000,previous:33000,improvement:1000,circuit:true};
notice.show(event);assert.equal(nodes['record-celebration'].dataset.circuit,'true');
now=10101;notice.update();assert.equal(nodes['record-celebration'].hidden,true);
notice.show(event);assert.equal(nodes['record-celebration'].hidden,true,'Snapshots cannot repeat notification');
notice.show({...event,id:'session:lap2',circuit:false});assert.equal(nodes['record-celebration'].hidden,false);
notice.clear();assert.equal(nodes['record-celebration'].hidden,true);
console.log('OK: medal states, history order, result comparison, ten-second notice and deduplication.');
