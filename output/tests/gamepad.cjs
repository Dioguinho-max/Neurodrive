const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let frame, scope = null, pads = [], hasFocus = true, menuCount = 0, disconnects = 0;
const listeners = {};
const doc = { hidden: false, hasFocus: () => hasFocus, activeElement: null,
  addEventListener() {}, querySelectorAll: () => scope ? [scope] : [], createElement: () => element() };
function element() { return { tagName: 'BUTTON', disabled: false, classList: { add() {}, remove() {} },
  getClientRects: () => [1], closest: () => null, setAttribute() {}, scrollIntoView() {},
  focus() { doc.activeElement = this; }, click() { this.clicks = (this.clicks || 0) + 1; },
  append(child) { child.parentElement = this; }, dispatchEvent() {},
}; }
doc.body = element();
const api = { addEventListener: (name, callback) => { listeners[name] = callback; } };
new Function('window','document','navigator','requestAnimationFrame','getComputedStyle', fs.readFileSync(path.join(__dirname,'../neurodrive-gamepad.js'),'utf8'))(
  api, doc, { getGamepads: () => pads }, fn => { frame = fn; }, () => ({ visibility: 'visible' }));
const pad = { connected: true, mapping: 'standard', index: 0, id: 'Xbox', axes: [0,0], buttons: Array.from({length:17},()=>({value:0,pressed:false})) };
const button = (index,value) => { pad.buttons[index] = {value,pressed:value>.5}; };
const controller = api.createNeuroGamepad({ menu: () => menuCount++, disconnect: () => disconnects++, back: () => { scope = null; } });
pads = [pad]; frame(0); frame(16);
pad.axes[0] = .1; assert.equal(api.readNeuroGamepad(pad).steering,0,'Dead zone');
pad.axes[0] = .59; button(7,.6); button(6,.2); frame(32);
assert.equal(controller.input().steering,.5); assert.equal(controller.input().throttle,.6); assert.equal(controller.input().braking,.2);
button(9,1); frame(48); frame(64); assert.equal(menuCount,1,'Start only once per press');
button(9,0); button(7,0); button(6,0); pad.axes[0]=0;
const first = element(), select = Object.assign(element(),{tagName:'SELECT', selectedIndex:0, options:[{},{}]});
scope = {querySelectorAll:()=>[first,select],contains:e=>[first,select].includes(e),append:doc.body.append};
frame(80); assert.equal(doc.activeElement,first); assert.deepEqual(controller.input(),{});
button(0,1); frame(96); frame(112); assert.equal(first.clicks,1,'No repeated confirmation');
button(0,0); button(13,1); frame(128); assert.equal(doc.activeElement,select);
button(13,0); button(15,1); frame(144); assert.equal(select.selectedIndex,1,'Adjust select');
button(15,0); button(1,1); frame(160); assert.equal(scope,null);
button(1,0); frame(176); pads=[]; frame(192); assert.equal(disconnects,1); assert.deepEqual(controller.input(),{});
pads=[pad]; button(7,1); frame(208); assert.deepEqual(controller.input(),{},'Reconnect requires neutral');
button(7,0); frame(224); button(7,1); frame(240); assert.equal(controller.input().throttle,1);
listeners.blur(); assert.deepEqual(controller.input(),{});
hasFocus=false; frame(256); assert.deepEqual(controller.input(),{});
console.log('OK: gamepad analog input, dead zone, menu navigation, repeat protection, disconnect and blur.');
