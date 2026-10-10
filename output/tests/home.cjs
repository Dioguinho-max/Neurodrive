const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const nodes = new Map();
const get = id => { if (!nodes.has(id)) nodes.set(id, { hidden: false, textContent: '', replaceChildren() {}, append() {} }); return nodes.get(id); };
const menu = get('race-menu'); menu.open = true;
let observe, scheduled = 0, disposed = 0, created = 0, currentSkin;
const events = {}, window = { matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {} };
const document = { hidden: false, getElementById: get, createElement: () => ({}), addEventListener: (name, fn) => events[name] = fn };
vm.runInNewContext(fs.readFileSync('output/neurodrive-home.js', 'utf8'), {
 window, document, MutationObserver: class { constructor(fn) { observe = fn; } observe() {} }, ResizeObserver: class { observe() {} },
 requestAnimationFrame: () => { scheduled++; return scheduled; }, cancelAnimationFrame() {},
});
window.NeuroHome.setFactory(() => { created++; return { setSkin(s) { currentSkin = s; }, dispose() { disposed++; }, draw() {} }; });
assert.equal(created, 1); assert.equal(get('home-car-canvas').hidden, false);
window.NeuroHome.update({ username: 'Piloto', coins: 200, equipped: 'rubi' }, [{ id: 'rubi', name: 'Rubi' }]);
assert.equal(currentSkin.id, 'rubi'); assert.equal(get('home-pilot-coins').textContent, '200 moedas');
window.NeuroHome.setPage('store'); assert.equal(disposed, 1); assert.equal(get('home-car-canvas').hidden, true);
window.NeuroHome.setPage('race'); assert.equal(created, 2);
menu.open = false; observe(); assert.equal(disposed, 2);
menu.open = true; observe(); assert.equal(created, 3);
document.hidden = true; events.visibilitychange(); assert.equal(disposed, 3);
window.NeuroHome.setFactory(null); assert.equal(created, 3);
assert(scheduled > 0);
console.log('OK: equipped skin, home/store transitions, closed menu and hidden tab release the preview.');
