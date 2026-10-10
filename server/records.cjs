const CURRENT = 'beta-1';
const tracks = ['serra','veloz','tecnico'];
const fail = (status,message) => Object.assign(new Error(message),{status});
function filters(params) {
  const track = params.get('track') || 'serra', season = params.get('season') || CURRENT;
  const offset = Number(params.get('offset') || 0);
  if (!tracks.includes(track) || !/^[a-z0-9-]{1,40}$/.test(season) || !Number.isInteger(offset) || offset<0 || offset>100000) throw fail(400,'Filtro de recordes inválido.');
  return {track,season,offset};
}
async function save(pool,id,record) {
  if (!tracks.includes(record.track) || !Number.isInteger(record.milliseconds) || record.milliseconds<1000 || record.milliseconds>1800000) throw new Error('Invalid server lap');
  await pool.query(`INSERT INTO neurodrive.lap_records(season,track,player_id,milliseconds,achieved,skin) VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(season,track,player_id) DO UPDATE SET milliseconds=EXCLUDED.milliseconds,achieved=EXCLUDED.achieved,skin=EXCLUDED.skin
    WHERE EXCLUDED.milliseconds < neurodrive.lap_records.milliseconds`,[CURRENT,record.track,id,record.milliseconds,record.achieved,record.skin]);
}
async function board(pool,id,{track,season,offset}) {
  const seasons=(await pool.query('SELECT id,name FROM neurodrive.record_seasons ORDER BY id DESC')).rows;
  if (season!=='all' && !seasons.some(item=>item.id===season)) throw fail(400,'Temporada não encontrada.');
  // Pick one best per account before ranking, including in the historical view.
  const rows=(await pool.query(`WITH best AS (
    SELECT DISTINCT ON(player_id) * FROM neurodrive.lap_records WHERE track=$1 AND ($2='all' OR season=$2)
    ORDER BY player_id,milliseconds,achieved,season
  ), ranked AS (
    SELECT best.*, row_number() OVER(ORDER BY milliseconds,achieved,player_id)::int AS position,
      count(*) OVER()::int AS total, min(milliseconds) OVER() AS leader_time FROM best
  ) SELECT r.*,p.username,COALESCE(p.nickname,p.username) AS nickname,p.avatar,p.driver_number
    FROM ranked r JOIN neurodrive.players p ON p.id=r.player_id
    WHERE r.position=1 OR r.player_id=$3 OR (r.position>$4 AND r.position<=$4+20)
    ORDER BY r.position`,[track,season,id||null,offset])).rows;
  const entry=row=>({position:row.position,username:row.username,nickname:row.nickname,avatar:row.avatar,number:row.driver_number,
    milliseconds:row.milliseconds,gap:row.milliseconds-row.leader_time,achieved:Number(row.achieved),skin:row.skin,season:row.season,self:String(row.player_id)===String(id)});
  return {available:true,currentSeason:CURRENT,seasons,track,season,total:rows[0]?.total||0,offset,
    leader:rows[0]?.position===1?entry(rows[0]):null,
    own:rows.find(row=>String(row.player_id)===String(id)) ? entry(rows.find(row=>String(row.player_id)===String(id))) : null,
    entries:rows.filter(row=>row.position>offset&&row.position<=offset+20).map(entry)};
}
module.exports={CURRENT,filters,save,board};
