const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const tracks = {};
new Function('window', fs.readFileSync(path.join(__dirname, '../output/neuro-pista-track.js'), 'utf8'))(tracks);
const error = (status, message) => Object.assign(new Error(message), { status });
module.exports = function createRewards(db, now = Date.now) {
  db.exec(`CREATE TABLE IF NOT EXISTS races (
    id TEXT PRIMARY KEY, player_id INTEGER NOT NULL REFERENCES players(id),
    track TEXT NOT NULL, laps INTEGER NOT NULL, started INTEGER NOT NULL,
    claimed INTEGER, reward INTEGER, place INTEGER
  ); CREATE INDEX IF NOT EXISTS races_player ON races(player_id);`);
  return {
    stats(id) {
      return db.prepare('SELECT COUNT(*) AS races, COALESCE(SUM(place=1),0) AS wins, COALESCE(SUM(place<=3),0) AS podiums, NULL AS poles FROM races WHERE player_id=? AND claimed IS NOT NULL').get(id);
    },
    start(id, data) {
      if (!['serra', 'veloz', 'tecnico'].includes(data.track) || ![1, 3, 5, 10, 20, 50].includes(data.laps)) throw error(400, 'Configuração de corrida inválida.');
      const ticket = crypto.randomBytes(16).toString('hex');
      db.prepare('DELETE FROM races WHERE player_id=? AND claimed IS NULL').run(id);
      db.prepare('INSERT INTO races(id, player_id, track, laps, started) VALUES (?,?,?,?,?)').run(ticket, id, data.track, data.laps, now());
      return ticket;
    },
    finish(id, data) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const race = db.prepare('SELECT * FROM races WHERE id=? AND player_id=?').get(typeof data.ticket === 'string' ? data.ticket : '', id);
        if (!race) throw error(404, 'Essa corrida não está vinculada à sua conta.');
        if (race.claimed !== null) { db.exec('COMMIT'); return race.reward; }
        const wallSeconds = (now() - race.started) / 1000;
        const minimum = tracks.createNeuroTrack(race.track).length * race.laps / (205 / 54) / 60 * 0.75;
        if (!Number.isFinite(data.elapsed) || data.elapsed < minimum || data.elapsed > wallSeconds + 5
          || wallSeconds > 21600 || data.completedLaps !== race.laps
          || !Number.isInteger(data.place) || data.place < 1 || data.place > 6) throw error(400, 'Tempo ou conclusão da corrida inválidos.');
        const dayStart = Math.floor(now() / 86400000) * 86400000;
        const paid = db.prepare('SELECT COALESCE(SUM(reward),0) AS total FROM races WHERE player_id=? AND claimed>=?').get(id, dayStart).total;
        const reward = Math.max(0, Math.min(200, 50 + 20 * race.laps, 500 - paid));
        db.prepare('UPDATE players SET coins=coins+? WHERE id=?').run(reward, id);
        db.prepare('UPDATE races SET claimed=?, reward=?, place=? WHERE id=?').run(now(), reward, data.place, race.id);
        db.exec('COMMIT');
        return reward;
      } catch (err) { db.exec('ROLLBACK'); throw err; }
    },
  };
};
