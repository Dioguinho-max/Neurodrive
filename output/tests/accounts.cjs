'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { DatabaseSync } = require('node:sqlite');
const { createApp } = require('../../server/server.cjs');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'neurodrive-test-'));
const database = path.join(directory, 'test.sqlite');
let server, base;
async function start() {
  server = createApp({ database });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
}
async function stop() { await new Promise((resolve) => server.close(resolve)); }
async function api(route, data, cookie = '', extra = {}) {
  const response = await fetch(base + '/api/' + route, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { Cookie: cookie, ...(data === undefined ? {} : { 'Content-Type': 'application/json', Origin: base }), ...extra },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie') };
}
(async () => {
  try {
    await start();
    assert.equal((await fetch(base)).status, 200);
    assert.equal((await fetch(base + '/server/data/neurodrive.sqlite')).status, 404);
    assert.equal((await api('catalog')).data.skins.length, 4);
    assert.equal((await api('me')).status, 401);
    assert.equal((await api('register', { username: 'piloto', password: 'curta' })).status, 400);
    const credentials = { username: 'piloto', password: 'SenhaTeste_12345' };
    const registration = await api('register', credentials);
    assert.equal(registration.status, 200);
    assert.equal(registration.data.player.coins, 500);
    assert.match(registration.cookie, /HttpOnly/);
    assert.match(registration.cookie, /SameSite=Strict/);
    let cookie = registration.cookie.split(';')[0];
    assert.equal((await api('register', { ...credentials, username: 'PILOTO' })).status, 409);
    assert.equal((await api('login', { ...credentials, password: 'SenhaErrada_123' })).status, 401);
    assert.equal((await api('buy', { skin: 'rubi' })).status, 401);
    assert.equal((await api('equip', { skin: 'ouro' }, cookie)).status, 403);
    assert.equal((await api('buy', { skin: 'inventada' }, cookie)).status, 400);
    assert.equal((await api('buy', { skin: 'rubi' }, cookie, { Origin: 'https://outro.example' })).status, 403);
    const purchases = await Promise.all([api('buy', { skin: 'rubi', price: -1000 }, cookie), api('buy', { skin: 'rubi' }, cookie)]);
    assert(purchases.every((result) => result.status === 200));
    assert.equal((await api('me', undefined, cookie)).data.player.coins, 300, 'Compra repetida deve cobrar uma vez');
    assert.equal((await api('buy', { skin: 'ouro', price: 0 }, cookie)).status, 409);
    const bonuses = await Promise.all([api('bonus', {}, cookie), api('bonus', {}, cookie)]);
    assert.deepEqual(bonuses.map((result) => result.status).sort(), [200, 409]);
    assert.equal((await api('me', undefined, cookie)).data.player.coins, 400);
    await stop();
    const db = new DatabaseSync(database);
    const row = db.prepare('SELECT * FROM players').get();
    assert.notEqual(row.password_hash, credentials.password);
    assert.equal(row.password_hash.length, 128);
    assert(!JSON.stringify(db.prepare('SELECT * FROM sessions').all()).includes(cookie.split('=')[1]));
    db.close();
    await start();
    const saved = await api('me', undefined, cookie);
    assert.equal(saved.data.player.equipped, 'rubi');
    assert.deepEqual(saved.data.player.owned, ['original', 'rubi']);
    assert.equal((await api('equip', { skin: 'original' }, cookie)).data.player.equipped, 'original');
    await api('logout', {}, cookie);
    assert.equal((await api('me', undefined, cookie)).status, 401);
    const login = await api('login', credentials);
    cookie = login.cookie.split(';')[0];
    assert.equal(login.data.player.coins, 400);
    const other = await api('register', { username: 'outro_piloto', password: 'OutraSenha_12345' });
    assert.equal((await api('equip', { skin: 'rubi' }, other.cookie.split(';')[0])).status, 403, 'Inventários devem ser isolados');
    for (let i = 0; i < 20; i++) await api('login', { ...credentials, password: 'SenhaErrada_123' });
    assert.equal((await api('login', credentials)).status, 429);
    assert.equal((await api('me', undefined, cookie)).status, 200, 'Limite de login não deve bloquear sessão ativa');
    console.log('OK: contas, sessão, logout, persistência, isolamento, compras atômicas, bônus, validação e limite de login.');
  } finally {
    if (server?.listening) await stop();
    // Diretório temporário exclusivo deste teste, criado acima por mkdtempSync.
    fs.rmSync(directory, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
