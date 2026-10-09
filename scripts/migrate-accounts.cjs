// Migração explícita e transacional, preserva senhas scrypt e não importa sessões.
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { CloudStore, createPool } = require('../server/cloud-store.cjs');
(async () => {
  if (process.argv[2] !== '--confirm') throw new Error('Faça backup e pare o servidor local. Execute novamente com --confirm.');
  const source = path.resolve(process.argv[3] || 'server/data/neurodrive.sqlite');
  if (!fs.existsSync(source)) throw new Error('Banco local não encontrado.');
  const sqlite = new DatabaseSync(source, { readOnly: true });
  const pool = createPool();
  try {
    const store = new CloudStore(pool); await store.init();
    await store.transaction(async (db) => {
      await db.query('LOCK TABLE neurodrive.players IN ACCESS EXCLUSIVE MODE');
      if ((await db.query('SELECT id FROM neurodrive.players LIMIT 1')).rowCount) throw new Error('Destino já contém contas; importação cancelada.');
      for (const user of sqlite.prepare('SELECT * FROM players').all()) {
        await db.query('INSERT INTO neurodrive.players(id,username,password_hash,salt,coins,equipped,last_bonus) VALUES($1,$2,$3,$4,$5,$6,$7)', [user.id, user.username, user.password_hash, user.salt, user.coins, user.equipped, user.last_bonus]);
      }
      for (const row of sqlite.prepare('SELECT * FROM inventory').all()) await db.query('INSERT INTO neurodrive.inventory VALUES($1,$2)', [row.player_id, row.skin]);
      if (sqlite.prepare("SELECT name FROM sqlite_master WHERE name='races'").get()) {
        for (const row of sqlite.prepare('SELECT * FROM races WHERE claimed IS NOT NULL').all()) await db.query('INSERT INTO neurodrive.results(id,player_id,reward,place,finished) VALUES($1,$2,$3,$4,$5)', ['local-' + row.id, row.player_id, row.reward, row.place, row.claimed]);
      }
      await db.query("SELECT setval(pg_get_serial_sequence('neurodrive.players','id'),COALESCE((SELECT MAX(id) FROM neurodrive.players),1), EXISTS(SELECT 1 FROM neurodrive.players))");
    });
    console.log('Contas, inventário e histórico importados. Faça login novamente no site.');
  } finally { sqlite.close(); await pool.end(); }
})().catch((error) => { console.error('Migração cancelada:', error.code || error.message); process.exitCode = 1; });
