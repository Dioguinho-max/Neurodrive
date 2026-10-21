const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../neurodrive-i18n.js'), 'utf8');
function boot(saved, blocked = false) {
  const storage = new Map([['neurodrive-language', saved]]), events = {};
  const window = { addEventListener: (type, fn) => { events[type] = fn; }, dispatchEvent() {} };
  const document = { documentElement: { nodeType: 0 }, querySelectorAll: () => [] };
  vm.runInNewContext(source, {
    window, document, CustomEvent: class {}, MutationObserver: class { observe() {} disconnect() {} },
    localStorage: { getItem: key => { if (blocked) throw Error('Blocked'); return storage.get(key); }, setItem: (key, value) => { if (blocked) throw Error('Blocked'); storage.set(key, value); } },
  });
  return { api: window.NeuroI18n, document, storage, events };
}
const game = boot(null);
assert.equal(game.api.language, 'pt-BR');
assert.equal(game.api.t('Troca de pneus · 4 s'), 'Troca de pneus · 4 s');
game.api.setLanguage('en-US');
assert.equal(game.document.documentElement.lang, 'en-US');
assert.equal(game.storage.get('neurodrive-language'), 'en-US');
assert.equal(game.api.t('Iniciar classificação'), 'Start qualifying');
assert.equal(game.api.t('Troca de pneus · 4 s'), 'Changing tires · 4 s');
assert.equal(game.api.t('Chuva · 72%'), 'Wet · 72%');
assert.equal(game.api.t('CORRIDA · 10 VOLTAS'), 'RACE · 10 LAPS');
assert.equal(game.api.t('Seco · dono · pronto'), 'Seco · host · ready', 'Nickname is preserved in lobby messages');
assert.equal(game.api.t('Sala abc123 · 3 volta(s)'), 'Room abc123 · 3 lap(s)');
const driftTranslations = [
  ['Freio de mão', 'Handbrake'],
  ['Drift · desafio de 2 minutos', 'Drift · 2-minute challenge'],
  ['4.435 guardados', '4.435 banked'],
  ['PRÓXIMO ×3', 'NEXT ×3'],
  ['Bronze · Prata: 800 restantes', 'Bronze · Silver: 800 to go'],
  ['Prata · Ouro: 1.200 restantes', 'Silver · Gold: 1.200 to go'],
  ['✓ Ouro', '✓ Gold'],
  ['Ouro conquistado!', 'Gold earned!'],
  ['Recorde local: 4.435 pontos', 'Local best: 4.435 points'],
  ['Recorde neste dispositivo: —', 'Local best: —'],
  ['Seu recorde: 600 pontos · Bronze', 'Your best: 600 points · Bronze'],
  ['Bronze · 600 pontos   /   Prata · 1.800 pontos   /   Ouro · 4.000 pontos', 'Bronze · 600 points / Silver · 1.800 points / Gold · 4.000 points'],
  ['Faltam 800 pontos para Prata.', '800 more points for Silver.'],
  ['+200 pontos · Salvo neste navegador', '+200 points · Saved in this browser'],
  ['Serra Verde · Desafio Drift · 2 minutos', 'Serra Verde · Drift Challenge · 2 minutes'],
];
for (const [pt, en] of driftTranslations) assert.equal(game.api.t(pt), en, pt);
game.api.setLanguage('pt-BR');
for (const [pt] of driftTranslations) assert.equal(game.api.t(pt), pt);
game.api.setLanguage('en-US');
assert.equal(game.api.t('<img src=x onerror=alert(1)>'), '<img src=x onerror=alert(1)>', 'Translation returns text without interpreting markup');
assert.equal(boot('en-US').api.language, 'en-US', 'Shared persisted preference');
game.events.storage({ key: 'neurodrive-language', newValue: 'pt-BR' });
assert.equal(game.api.t('Jogar'), 'Jogar', 'Other tabs can restore Portuguese');
game.api.setLanguage('unsupported');
assert.equal(game.api.language, 'pt-BR');
const privateMode = boot('en-US', true);
privateMode.api.setLanguage('en-US');
assert.equal(privateMode.api.t('Próxima troca'), 'Next tire change', 'Selection works without localStorage');
console.log('OK: PT/EN, persistence, safe fallback, dynamic race and pit messages, unchanged player names.');
