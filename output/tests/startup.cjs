const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { startupConfig, startupMessage } = require('../../server/startup-config.cjs');
const { createPool } = require('../../server/cloud-store.cjs');
const certificate = require('node:tls').rootCertificates[0].trim();
const env = { NODE_ENV: 'production', FRONTEND_ORIGIN: 'https://game.example/', BACKEND_ORIGIN: 'https://api.example/', DATABASE_URL: 'postgresql://user:private-test-password@db.example/postgres' };
assert.equal(startupConfig(env).frontendOrigin, 'https://game.example');
assert.throws(() => startupConfig({}), /FRONTEND_ORIGIN, BACKEND_ORIGIN, DATABASE_URL/);
assert.throws(() => startupConfig({ ...env, DATABASE_URL: 'https://project.supabase.co' }), /postgres/);
assert.throws(() => startupConfig({ ...env, BACKEND_ORIGIN: 'https://api.example/path' }), /sem caminho/);
assert.throws(() => startupConfig({ ...env, FRONTEND_ORIGIN: 'http://game.example' }), /HTTPS/);
assert.throws(() => startupConfig({ ...env, PORT: 'NaN' }), /PORT/);
assert.match(startupMessage({ code: '28P01', message: env.DATABASE_URL }), /Autenticação/);
assert(!startupMessage({ message: env.DATABASE_URL }).includes('private-test-password'));
assert.match(startupMessage({ message: 'Connection terminated due to connection timeout' }), /esgotado/);
for (const value of [certificate, certificate.replace(/\n/g, '\\n'), certificate.replace(/\n/g, '\\r\\n')]) {
  const pool = createPool({ ...env, DATABASE_CA: value });
  assert.equal(pool.options.ssl.ca, certificate, 'PEM multilinha ou com quebras escapadas deve chegar intacto ao driver');
  assert.equal(pool.options.ssl.rejectUnauthorized, true);
  pool.end();
}
const child = spawnSync(process.execPath, [path.join(__dirname, '../../server/cloud.cjs')], {
  env: { ...process.env, FRONTEND_ORIGIN: '', BACKEND_ORIGIN: '', DATABASE_URL: '' }, encoding: 'utf8', timeout: 15000,
});
assert.equal(child.status, 1);
assert.match(child.stderr, /Variáveis ausentes.*FRONTEND_ORIGIN, BACKEND_ORIGIN, DATABASE_URL/);
console.log('OK: validação de configuração e diagnóstico de inicialização sem expor credenciais.');
