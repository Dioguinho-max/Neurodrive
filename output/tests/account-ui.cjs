const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../corrida.html'), 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'No duplicate IDs after organizing the account');
const nodes = Object.fromEntries(ids.map(id => [id, { hidden: false, value: '', attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }, focus() { this.focused = true; } }]));
const window = {};
new Function('window','document', fs.readFileSync(path.join(__dirname, '../neurodrive-account.js'), 'utf8'))(window, { getElementById: id => nodes[id] });
const active = name => {
  for (const page of ['overview','achievements','edit','security']) {
    assert.equal(nodes['account-'+page].hidden, page !== name);
    assert.equal(nodes['account-tab-'+page].attributes['aria-selected'], String(page === name));
    assert.equal(nodes['account-tab-'+page].tabIndex, page === name ? 0 : -1);
  }
};
active('overview');
window.NeuroAccount.setPlayer('tester');
nodes['account-tab-edit'].onclick(); active('edit');
nodes['pilot-nickname'].value = 'Unsaved nickname';
nodes['account-tab-achievements'].onclick(); active('achievements');
nodes['account-tab-edit'].onclick(); assert.equal(nodes['pilot-nickname'].value, 'Unsaved nickname', 'Switching sections preserves edits');
window.NeuroAccount.setPlayer('tester'); active('edit');
let prevented = false;
nodes['account-tab-edit'].onkeydown({ key:'ArrowRight', preventDefault() { prevented = true; }, stopPropagation() {} });
active('security'); assert(prevented); assert(nodes['account-tab-security'].focused);
window.NeuroAccount.setPlayer(null); active('overview');
window.NeuroAccount.show('invalid'); active('overview');
console.log('OK: account sections, keyboard navigation, preserved edits and reset on sign-out.');
