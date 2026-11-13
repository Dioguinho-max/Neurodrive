const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
function setup(mobile = false, saved = null) {
  let now = 0, redraws = 0, staticDraws = 0;
  const calls = [], store = new Map(saved === null ? [] : [['neurodrive-minimap', saved]]);
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.events = {}; this.hidden = false; this.checked = false; }
    append(...nodes) { this.children.push(...nodes); }
    appendChild(node) { this.children.push(node); return node; }
    setAttribute(key, value) { this[key] = value; }
    addEventListener(key, fn) { this.events[key] = fn; }
    remove() {}
    getContext() { return new Proxy({}, { get: (_, key) => (...args) => { calls.push([key, ...args]); if (key === 'drawImage') redraws++; if (key === 'stroke') staticDraws++; }, set: () => true }); }
  }
  const host = new Element('main'), toggle = new Element('input');
  const document = { hidden: false, createElement: tag => new Element(tag) };
  const window = { matchMedia: () => ({ matches: mobile }), addEventListener() {}, removeEventListener() {} };
  new Function('window', fs.readFileSync(path.join(__dirname, '../neuro-pista-track.js'), 'utf8'))(window);
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  new Function('window', 'document', 'localStorage', 'performance', fs.readFileSync(path.join(__dirname, '../neurodrive-minimap.js'), 'utf8'))(window, document, storage, { now: () => now });
  const map = window.createNeuroMinimap(host, toggle), panel = host.children[0];
  const cars = [{ id: 1, x: 0, y: 0, angle: 0 }, { id: 2, x: 20, y: 10, angle: 1 }];
  return { map, panel, toggle, cars, document, calls, store, tick: t => { now = t; }, redraws: () => redraws, staticDraws: () => staticDraws };
}
const desktop = setup();
desktop.map.update('serra', desktop.cars, 1, true);
assert.equal(desktop.panel.hidden, false); assert.equal(desktop.redraws(), 1);
const base = desktop.staticDraws();
desktop.tick(50); desktop.map.update('serra', desktop.cars, 1, true); assert.equal(desktop.redraws(), 1);
desktop.tick(100); desktop.map.update('serra', desktop.cars, 1, true); assert.equal(desktop.redraws(), 2); assert.equal(desktop.staticDraws(), base + 1, 'Only player outline, not cached circuit, is redrawn');
desktop.tick(200); desktop.map.update('urbano', desktop.cars, 1, true); assert(desktop.staticDraws() > base + 2);
desktop.map.update('urbano', desktop.cars, 1, false); assert(desktop.panel.hidden, 'Hidden during menus and intros');
desktop.document.hidden = true; desktop.map.update('urbano', desktop.cars, 1, true); assert(desktop.panel.hidden);
const mobile = setup(true); mobile.map.update('veloz', mobile.cars, 1, true); assert.equal(mobile.panel.hidden, false);
assert.equal(setup(true, 'false').toggle.checked, false, 'An explicit opt-out is preserved');
mobile.toggle.checked = true; mobile.toggle.events.change(); mobile.map.update('veloz', mobile.cars, 1, true);
assert.equal(mobile.panel.hidden, false); assert.equal(mobile.store.get('neurodrive-minimap'), 'true');
assert.equal(setup(true, 'true').toggle.checked, true, 'Mobile preference survives reload');
mobile.toggle.checked = false; mobile.toggle.events.change(); assert(mobile.panel.hidden);
console.log('OK: cached circuits, 10Hz, track changes, menu/visibility hiding and saved mobile opt-in.');
