const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const nodes = new Map();
const get = id => { if (!nodes.has(id)) nodes.set(id, { open: false, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }, focus() {}, showModal() { this.open = true; }, close() { this.open = false; }, addEventListener(name, fn) { this[name] = fn; } }); return nodes.get(id); };
let reduced = false, camera, clears = 0;
const window = { matchMedia: () => ({ matches: reduced }) }, document = { hidden: false };
vm.runInNewContext(fs.readFileSync('output/neurodrive-intro.js','utf8'), { window, document });
const cues = []; let stops = 0;
const intro = window.createNeuroIntro(get, p => camera = p, () => clears++, () => ({
  playIntro: (...args) => cues.push(args), stopIntro: () => stops++,
}));
intro.start({ name: 'Serra Verde' }, true); assert(intro.active); assert.equal(camera, 0);
intro.tick(2000); assert(camera > 0 && camera < 1);
document.hidden = true; const before = camera; intro.tick(3000); assert.equal(camera, before);
document.hidden = false; get('race-intro-skip').onclick(); assert(!intro.active); assert.equal(camera, null); assert(!get('race-intro').open);
intro.start({name:'Veloz'},false);
assert.equal(get('intro-forecast').hidden,true);
intro.tick(2399); assert.equal(get('race-intro').attributes['data-shot'],'overview');
assert.equal(get('intro-forecast').hidden,true);
intro.tick(1); assert.equal(get('race-intro').attributes['data-shot'],'flyby');
assert.equal(cues.at(-1)[0], 'forecast');
const cueCount = cues.length; intro.tick(1); assert.equal(cues.length,cueCount,'Forecast plays once');
assert.equal(get('intro-forecast').hidden,false);
intro.tick(3599); assert.equal(get('race-intro').attributes['data-shot'],'car');
assert.equal(get('intro-forecast').hidden,true,'Forecast clears the car closeup');
assert.equal(intro.active,true);
intro.tick(2000); assert(!intro.active); assert.equal(camera,null);
assert.equal(get('intro-forecast').hidden,true);
for (const weather of ['dry','rain','changing']) for (const qualifying of [true,false]) {
  intro.start({name:'Veloz'},qualifying,weather);
  assert.equal(get('intro-forecast').attributes['data-weather'],weather);
  assert.equal(get('intro-forecast-qualifying-now').hidden,!qualifying);
  assert.equal(get('intro-forecast-race-now').hidden,qualifying);
  assert.equal(get('intro-forecast-qualifying-condition').textContent,get('intro-forecast-race-condition').textContent);
  assert.equal(get('intro-forecast-tyres').textContent,weather==='rain'?'Largada: pneus de chuva':'Largada: pneus de seco');
  if(weather==='changing') assert(get('intro-forecast-race-detail').textContent.includes('chuva gradual'));
  intro.finish();
}
intro.start({name:'Veloz'},false,'invalid'); assert.equal(get('intro-forecast').attributes['data-weather'],'dry');
reduced = true; intro.start({name:'Veloz'},false); assert(!intro.active); assert(clears >= 4);
assert(stops > 0); assert(cues.some(([shot, mode]) => shot === 'overview' && mode === 'rain'));
console.log('OK: intro duration, skip, hidden tab and reduced motion.');
