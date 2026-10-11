const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api={};for(const file of ['neuro-pista-track.js','neurodrive-race-engine.js'])new Function('window',fs.readFileSync(path.join(__dirname,'..',file),'utf8'))(api);
const track=api.createNeuroTrack('serra');
const race=api.createNeuroRace(track,'normal',{weather:'changing',laps:3});race.cars.slice(1).forEach(car=>car.done=true);
for(let i=0;i<180+34*60;i++)race.step();assert.equal(race.cars[0].wetness,0);
for(let i=0;i<22*60;i++)race.step();assert(race.cars[0].wetness>0 && race.cars[0].wetness<.3);assert(race.cars[0].rainIntensity>0 && race.cars[0].rainIntensity<1);assert.equal(race.cars[0].tyreCompound,'dry');assert(race.cars[0].tyreWearEnabled);
for(let i=0;i<75*60;i++)race.step();assert(race.cars[0].wetness>.99);
for(let i=0;i<180*60;i++)race.step();assert(race.cars[0].wetness<.01);assert.equal(race.cars[0].rainIntensity,0);
const wetRace=api.createNeuroRace(track,'normal',{weather:'rain',laps:3});
assert(wetRace.cars.every(car=>car.tyreCompound==='wet'&&car.wetness===1));
const template=wetRace.cars[0];
const slick={...structuredClone(template),speed:3.5,steering:.4,tyreCompound:'dry'},wet=structuredClone(slick);wet.tyreCompound='wet';
const start=slick.angle;
api.predictNeuroCar(track,slick,{right:true});api.predictNeuroCar(track,wet,{right:true});
assert(Math.abs(wet.angle-start)>Math.abs(slick.angle-start)*2,'Pneu de chuva recupera capacidade de fazer curvas');
const dryBrake={...structuredClone(template),speed:2,brake:1,tyreCompound:'dry'},wetBrake=structuredClone(dryBrake);wetBrake.tyreCompound='wet';
api.predictNeuroCar(track,dryBrake,{brake:true});api.predictNeuroCar(track,wetBrake,{brake:true});assert(wetBrake.speed<dryBrake.speed,'Pneu seco freia pior no molhado');
for(let i=0;i<180;i++)wetRace.step();const car=wetRace.cars[0];wetRace.cars.slice(1).forEach(other=>other.done=true);
Object.assign(car,track.pointAt(21),{speed:1,tyreCompound:'dry'});
assert.equal(wetRace.requestPit(1,'invalid'),false);assert(wetRace.requestPit(1,'wet'));assert.equal(car.tyreCompound,'dry');
for(let i=0;i<2400 && !car.pitStops;i++)wetRace.step({accelerate:true});
assert.equal(car.pitStops,1);assert.equal(car.tyreCompound,'wet');assert.equal(car.tyreLife,1);
const aiRace=api.createNeuroRace(track,'normal',{weather:'rain',laps:5});for(let i=0;i<180;i++)aiRace.step();aiRace.cars[1].tyreCompound='dry';aiRace.step();assert(aiRace.cars[1].pitRequested||aiRace.cars[1].pitState);assert.equal(aiRace.cars[1].pitCompound,'wet');
console.log('OK: chuva progressiva, secagem, aderência, frenagem, troca validada nos boxes e estratégia da IA.');

// A umidade inicial não deve tornar o carro inguiável. Mesmo comando e mesma velocidade.
const turnAt = wetness => {
  const car = {...structuredClone(api.createNeuroRace(track).cars[0]), speed:3.5, steering:.4, tyreCompound:'dry', wetness};
  const angle = car.angle; api.predictNeuroCar(track,car,{right:true});
  return Math.abs(car.angle-angle);
};
assert(turnAt(.2)>turnAt(0)*.95, 'Pista levemente úmida mantém quase toda a aderência');
assert(turnAt(.8)<turnAt(.4), 'Slick perde aderência conforme a água acumula');
// Percurso controlado de três voltas, sem depender de colisões ou de atalhos da IA.
for(const session of ['qualifying','race']) for(const compound of ['dry','wet']) {
  const event=api.createNeuroRace(track,'normal',{weather:'changing',laps:3,session});
  const car=structuredClone(event.cars[0]);
  Object.assign(car,{pitExit:false,tyreCompound:compound,wetness:0});
  let distance=0;
  while(distance<track.length*3) {
    Object.assign(car,track.pointAt(200),{speed:2,steering:0});
    api.predictNeuroCar(track,car,{accelerate:true});distance+=car.speed;
  }
  assert(!car.tyreBurst && car.tyreLife>.5, `${session}/${compound}: três voltas não estouram pneus novos`);
}
console.log('OK: aderência gradual e desgaste reduzido na classificação e nas corridas curtas.');

for (const session of ['qualifying', 'race']) {
  const event = api.createNeuroRace(track, 'normal', { weather: 'changing', laps: 3, session, pitStart: session === 'qualifying' });
  event.cars[0].player = false;
  event.cars[0].driver = event.cars[1].driver;
  for (let tick = 0; tick < 24000 && event.phase !== 'finished'; tick++) event.step();
  assert.equal(event.phase, 'finished', `${session}: sessão com clima variável termina`);
  assert(event.cars.every(car => !car.tyreBurst), `${session}: nenhum estouro prematuro no grid`);
}
console.log('OK: grid completa classificação e corrida com clima variável sem estouros prematuros.');
