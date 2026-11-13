'use strict';
const goals = [
  { code: 'clean', target: 1, coins: 150, skin: null },
  { code: 'podiums', target: 3, coins: 250, skin: 'podium-exclusive' },
  { code: 'rain', target: 1, coins: 200, skin: 'storm-exclusive' },
];
function list(rows = []) {
  return goals.map(goal => { const row = rows.find(r => r.code === goal.code); return { ...goal, progress: Math.min(goal.target, Number(row?.progress || 0)), achieved: row?.achieved ? Number(row.achieved) : null }; });
}
function advance(rows, place, performance, now) {
  const eligible = performance?.progression === true;
  const qualifies = { clean: eligible && performance.clean === true, podiums: eligible && place >= 1 && place <= 3, rain: eligible && place === 1 && performance.rain === true };
  return list(rows).map(goal => {
    const progress = Math.min(goal.target, goal.progress + Number(!goal.achieved && !!qualifies[goal.code]));
    const unlocked = !goal.achieved && progress >= goal.target;
    return { ...goal, progress, achieved: goal.achieved || (unlocked ? now : null), unlocked };
  });
}
function local(db) {
  db.exec('CREATE TABLE IF NOT EXISTS progression (player_id INTEGER NOT NULL REFERENCES players(id), code TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0, achieved INTEGER, PRIMARY KEY(player_id,code))');
  const rows = id => db.prepare('SELECT code,progress,achieved FROM progression WHERE player_id=?').all(id);
  return {
    profile: id => list(rows(id)),
    award(id, place, performance, now) {
      let bonus = 0;
      for (const goal of advance(rows(id), place, performance, now)) {
        db.prepare('INSERT INTO progression VALUES(?,?,?,?) ON CONFLICT(player_id,code) DO UPDATE SET progress=excluded.progress,achieved=excluded.achieved').run(id, goal.code, goal.progress, goal.achieved);
        if (!goal.unlocked) continue;
        bonus += goal.coins;
        if (goal.skin) db.prepare('INSERT OR IGNORE INTO inventory VALUES(?,?)').run(id, goal.skin);
      }
      if (bonus) db.prepare('UPDATE players SET coins=coins+? WHERE id=?').run(bonus,id);
      return bonus;
    },
  };
}
module.exports = { list, advance, local };
