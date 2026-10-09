const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const catalog = require('./catalog.cjs');
const { databaseUrl } = require('./startup-config.cjs');
const fail = (status, message) => Object.assign(new Error(message), { status });
function createPool(env = process.env) {
  const url = databaseUrl(env);
  // Mantém a validação TLS; parâmetros da URL não podem sobrescrever o SSL.
  for (const name of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(name);
  return new Pool({ connectionString: url.toString(), max: 5, connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: true, ...(env.DATABASE_CA?.trim()
      ? { ca: env.DATABASE_CA.trim().replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n') } : {}) } });
}
class CloudStore {
  constructor(pool) { this.pool = pool; }
  async init() { await this.pool.query(fs.readFileSync(path.join(__dirname, 'cloud-schema.sql'), 'utf8')); }
  async transaction(fn) {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async find(username) { return (await this.pool.query('SELECT * FROM neurodrive.players WHERE lower(username)=lower($1)', [username])).rows[0]; }
  async create(username, passwordHash, salt) {
    try {
      return await this.transaction(async (db) => {
        const user = (await db.query('INSERT INTO neurodrive.players(username,password_hash,salt) VALUES($1,$2,$3) RETURNING id', [username, passwordHash, salt])).rows[0];
        await db.query("INSERT INTO neurodrive.inventory VALUES($1,'original')", [user.id]);
        return user;
      });
    } catch (err) { if (err.code === '23505') throw fail(409, 'Esse nome já está em uso.'); throw err; }
  }
  async profile(id) {
    const player = (await this.pool.query('SELECT username, nickname, driver_number, avatar, coins, equipped, last_bonus FROM neurodrive.players WHERE id=$1', [id])).rows[0];
    if (!player) throw fail(401, 'Conta não encontrada.');
    const owned = (await this.pool.query('SELECT skin FROM neurodrive.inventory WHERE player_id=$1', [id])).rows.map((row) => row.skin);
    const stats = (await this.pool.query('SELECT count(*)::int AS races, count(*) FILTER(WHERE place=1)::int AS wins, count(*) FILTER(WHERE place<=3)::int AS podiums, count(*) FILTER(WHERE pole)::int AS poles FROM neurodrive.results WHERE player_id=$1', [id])).rows[0];
    const bestLaps = (await this.pool.query('SELECT track, min(best_lap) AS time FROM neurodrive.results WHERE player_id=$1 AND best_lap>0 AND track IS NOT NULL GROUP BY track', [id])).rows;
    return { username: player.username, nickname: player.nickname || player.username, number: player.driver_number, avatar: player.avatar, coins: player.coins, equipped: player.equipped, owned, stats, bestLaps,
      nextBonusAt: Number(player.last_bonus) ? Number(player.last_bonus) + 86400000 : 0 };
  }
  async updatePilot(id, data) {
    await this.pool.query('UPDATE neurodrive.players SET nickname=$1,driver_number=$2 WHERE id=$3', [data.nickname, data.number, id]);
  }
  async updateAvatar(id, url) { await this.pool.query('UPDATE neurodrive.players SET avatar=$1 WHERE id=$2', [url, id]); }
  async session(tokenHash) { return (await this.pool.query('SELECT player_id FROM neurodrive.sessions WHERE token_hash=$1 AND expires>$2', [tokenHash, Date.now()])).rows[0]?.player_id; }
  async newSession(tokenHash, id, oldHash) {
    await this.transaction(async (db) => {
      await db.query('DELETE FROM neurodrive.sessions WHERE token_hash=$1 OR expires<=$2', [oldHash, Date.now()]);
      await db.query('INSERT INTO neurodrive.sessions VALUES($1,$2,$3)', [tokenHash, id, Date.now() + 604800000]);
    });
  }
  async logout(tokenHash) { await this.pool.query('DELETE FROM neurodrive.sessions WHERE token_hash=$1', [tokenHash]); }
  async changePassword(id, passwordHash, salt) {
    await this.transaction(async (db) => {
      await db.query('UPDATE neurodrive.players SET password_hash=$1,salt=$2 WHERE id=$3', [passwordHash, salt, id]);
      await db.query('DELETE FROM neurodrive.sessions WHERE player_id=$1', [id]);
    });
  }
  async limit(key) {
    const now = Date.now();
    const row = (await this.pool.query(`INSERT INTO neurodrive.auth_limits VALUES($1,1,$2)
      ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN neurodrive.auth_limits.expires<$3 THEN 1 ELSE neurodrive.auth_limits.attempts+1 END,
      expires=CASE WHEN neurodrive.auth_limits.expires<$3 THEN $2 ELSE neurodrive.auth_limits.expires END RETURNING attempts`, [key, now + 900000, now])).rows[0];
    if (row.attempts > 20) throw fail(429, 'Muitas tentativas. Aguarde 15 minutos.');
    await this.pool.query('DELETE FROM neurodrive.auth_limits WHERE expires<$1', [now]);
  }
  async buy(id, skinId, purchase) {
    const skin = catalog.find((item) => item.id === skinId);
    if (!skin) throw fail(400, 'Skin inválida.');
    await this.transaction(async (db) => {
      const player = (await db.query('SELECT coins FROM neurodrive.players WHERE id=$1 FOR UPDATE', [id])).rows[0];
      const owned = (await db.query('SELECT skin FROM neurodrive.inventory WHERE player_id=$1 AND skin=$2', [id, skin.id])).rowCount;
      if (!owned) {
        if (!purchase) throw fail(403, 'Compre essa skin antes de equipar.');
        if (player.coins < skin.price) throw fail(409, 'Moedas insuficientes.');
        await db.query('UPDATE neurodrive.players SET coins=coins-$1 WHERE id=$2', [skin.price, id]);
        await db.query('INSERT INTO neurodrive.inventory VALUES($1,$2)', [id, skin.id]);
      }
      await db.query('UPDATE neurodrive.players SET equipped=$1 WHERE id=$2', [skin.id, id]);
    });
  }
  async bonus(id) {
    const row = await this.pool.query('UPDATE neurodrive.players SET coins=coins+100,last_bonus=$1 WHERE id=$2 AND last_bonus<=$3', [Date.now(), id, Date.now() - 86400000]);
    if (!row.rowCount) throw fail(409, 'Bônus já resgatado. Aguarde 24 horas.');
  }
  async award(id, raceId, laps, place, mode = 'race', performance = {}) {
    return this.transaction(async (db) => {
      await db.query('SELECT id FROM neurodrive.players WHERE id=$1 FOR UPDATE', [id]);
      const existing = (await db.query('SELECT reward FROM neurodrive.results WHERE id=$1 AND player_id=$2', [raceId, id])).rows[0];
      if (existing) return existing.reward;
      const now = Date.now();
      const paid = (await db.query('SELECT COALESCE(sum(reward),0)::int AS total FROM neurodrive.results WHERE player_id=$1 AND finished>=$2', [id, Math.floor(now / 86400000) * 86400000])).rows[0].total;
      const podiumBonus = mode === 'tournament' ? ({ 1: 90, 2: 60, 3: 30 }[place] || 0) : 0;
      const reward = Math.max(0, Math.min(200, 50 + 20 * laps + podiumBonus, 500 - paid));
      await db.query('INSERT INTO neurodrive.results(id,player_id,reward,place,finished,track,best_lap,pole) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [raceId, id, reward, place, now, performance.track || null, Number.isFinite(performance.bestLap) && performance.bestLap > 0 ? performance.bestLap : null, performance.pole === true]);
      await db.query('UPDATE neurodrive.players SET coins=coins+$1 WHERE id=$2', [reward, id]);
      return reward;
    });
  }
}
module.exports = { CloudStore, createPool };
