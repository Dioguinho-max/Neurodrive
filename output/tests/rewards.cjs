const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../../server/server.cjs');
let now = Date.UTC(2026, 9, 3, 12);
const server = createApp({ database: ':memory:', clock: () => now });
(async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie;
  async function post(route, body, session = cookie) {
    const response = await fetch(base + '/api/' + route, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', Cookie: session || '' }, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  try {
    cookie = (await post('register', { username: 'reward_test', password: 'SenhaTeste_12345' })).cookie;
    assert.equal((await post('races/start', { track: 'fake', laps: 10 })).status, 400);
    let ticket = (await post('races/start', { track: 'serra', laps: 10 })).data.ticket;
    const finish = () => ({ ticket, elapsed: 900, completedLaps: 10, place: 2 });
    assert.equal((await post('races/finish', finish())).status, 400, 'Recibo antes do tempo mínimo deve falhar');
    now += 1000000;
    assert.equal((await post('races/finish', { ...finish(), completedLaps: 1 })).status, 400);
    const claimed = await Promise.all([post('races/finish', finish()), post('races/finish', finish())]);
    assert(claimed.every((result) => result.data.reward === 200 && result.data.player.coins === 700));
    const another = await post('register', { username: 'other_test', password: 'SenhaTeste_12345' }, '');
    assert.equal((await post('races/finish', finish(), another.cookie)).status, 404);
    for (const expected of [200, 100, 0]) {
      ticket = (await post('races/start', { track: 'serra', laps: 10 })).data.ticket;
      now += 1000000;
      const result = await post('races/finish', finish());
      assert.equal(result.data.reward, expected);
    }
    const old = (await post('races/start', { track: 'serra', laps: 1 })).data.ticket;
    await post('races/start', { track: 'veloz', laps: 1 });
    assert.equal((await post('races/finish', { ...finish(), ticket: old })).status, 404);
    console.log('OK: recompensas, resgate único, tempo mínimo, isolamento de conta e teto diário.');
  } finally { await new Promise((resolve) => server.close(resolve)); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
