const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
function node() {
  return { value: '', children: [], style: { setProperty() {} }, setAttribute() {},
    append(...items) { this.children.push(...items); }, replaceChildren() { this.children = []; } };
}
function setup(protocol, fetcher) {
  const elements = Object.fromEntries([...read('corrida.html').matchAll(/id="([^"]+)"/g)].map((match) => [match[1], node()]));
  const host = { location: { protocol } };
  new Function('window', 'document', 'fetch', read('neurodrive-garage.js'))(host, {
    getElementById: (id) => elements[id], createElement: node,
  }, fetcher);
  return { elements, host };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
(async () => {
  const offline = setup('file:', () => { throw new Error('Não deve acessar API em file:'); });
  assert(offline.elements['garage-auth-fields'].disabled);
  assert(offline.elements['garage-status'].textContent.includes('Modo visitante'));
  const skins = require('../../server/catalog.cjs');
  let player = null, expired = false;
  const { elements: ui, host } = setup('http:', async (url, options) => {
    const route = url.split('/').pop();
    let status = 200;
    const data = options.body && JSON.parse(options.body);
    if (route === 'config') return { ok: true, status: 200, json: async () => ({ localRewards: true, online: false }) };
    if (url.endsWith('races/start')) return { ok: true, status: 200, json: async () => ({ ticket: 'ticket-teste' }) };
    if (url.endsWith('races/finish')) {
      player = { ...player, coins: 370 };
      return { ok: true, status: 200, json: async () => ({ player, reward: 70 }) };
    }
    if (route === 'register') player = { username: data.username, coins: 500, owned: ['original'], equipped: 'original', nextBonusAt: 0 };
    if (route === 'buy') {
      player = { ...player, coins: 300, owned: ['original', 'rubi'], equipped: data.skin };
    }
    if (route === 'logout') player = null;
    if ((route === 'me' && !player) || expired) status = 401;
    return { ok: status === 200, status, json: async () => status !== 200 ? { error: 'Sessão expirada' }
      : route === 'catalog' ? { skins } : { player } };
  });
  await tick();
  assert.equal(ui['garage-skins'].children.length, 4);
  assert(ui['garage-skins'].children[1].children[3].disabled);
  ui['garage-username'].value = 'piloto';
  ui['garage-password'].value = 'SenhaTeste_12345';
  ui['garage-confirm'].value = 'SenhaTeste_12345';
  ui['garage-auth'].onsubmit({ preventDefault() {}, submitter: { value: 'register' } });
  await tick();
  assert.equal(ui['garage-name'].textContent, 'piloto');
  assert.equal(ui['garage-password'].value, '');
  assert.equal(host.NeuroGarage.getSkin().id, 'original');
  ui['garage-skins'].children[1].children[3].onclick();
  await tick();
  assert.equal(host.NeuroGarage.getSkin().id, 'rubi');
  assert.equal(ui['garage-balance'].textContent, 300);
  assert.equal(ui['garage-skins'].children[1].children[3].textContent, 'Equipada');
  ui['menu-page-store'].onclick();
  assert.equal(ui['garage-store-screen'].hidden, false);
  assert.equal(ui['menu-race-screen'].hidden, true);
  ui['garage-filter'].value = 'owned';
  ui['garage-filter'].onchange();
  assert.equal(ui['garage-skins'].children.length, 2);
  host.NeuroGarage.beginRace({ track: 'serra', laps: 1 });
  await host.NeuroGarage.finishRace({ elapsed: 60, completedLaps: 1, place: 2 });
  assert(ui['race-reward'].textContent.includes('+70 moedas'));
  assert.equal(ui['garage-balance'].textContent, 370);
  expired = true;
  ui['garage-bonus'].onclick();
  await tick();
  assert.equal(host.NeuroGarage.getSkin(), null);
  assert.equal(ui['garage-auth'].hidden, false);
  console.log('OK: modo visitante, cadastro, compra, aplicação da skin e sessão expirada na interface.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
