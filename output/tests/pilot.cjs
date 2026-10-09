const assert = require('node:assert/strict');
const { avatar, storage } = require('../../server/pilot.cjs');
(async () => {
  assert.equal(avatar(null), null);
  for (const value of ['', 'https://example.com', 'data:image/svg+xml;base64,AAAA', 'data:image/jpeg;base64,AAAA']) assert.throws(() => avatar(value));
  assert.throws(() => avatar('data:image/jpeg;base64,' + Buffer.alloc(200001).toString('base64')), /200 KB/);
  let captured;
  const client = storage({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-key' }, async (url, options) => { captured={url,options}; return { ok: true }; });
  const url = await client.upload(42, Buffer.from('image'));
  assert(url.startsWith('https://test.supabase.co/storage/v1/object/public/neurodrive-avatars/42/avatar.jpg'));
  assert.equal(captured.options.headers['Content-Type'], 'image/jpeg');
  assert.equal(captured.options.headers.Authorization, 'Bearer test-key');
  await client.remove(42);
  assert.deepEqual(JSON.parse(captured.options.body).prefixes, ['42/avatar.jpg']);
  await assert.rejects(storage({}).upload(42, Buffer.from('image')), /configurado/);
  await assert.rejects(storage({SUPABASE_URL:'https://test',SUPABASE_SERVICE_ROLE_KEY:'test'},async()=>({ok:false})).upload(42,Buffer.from('image')), /salvar/);
  console.log('OK: avatar validation, isolated Storage paths, missing configuration and upload failure.');
})().catch(error => { console.error(error); process.exitCode=1; });
