const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const records=require('../../server/records.cjs');
(async()=>{
 const db=new PGlite();
 try {
  await db.exec(fs.readFileSync(path.join(__dirname,'../../server/cloud-schema.sql'),'utf8'));
  await db.exec(fs.readFileSync(path.join(__dirname,'../../server/cloud-schema.sql'),'utf8'));
  for(let i=1;i<=23;i++)await db.query("INSERT INTO neurodrive.players(id,username,password_hash,salt) VALUES($1,$2,'hidden','hidden')",[i,'pilot_'+i]);
  const mark=(id,time,achieved=1000)=>records.save(db,id,{track:'veloz',milliseconds:time,achieved,skin:'original'});
  for(let i=1;i<=23;i++)await mark(i,30000+i*100);
  await mark(1,35000); await mark(1,30100,9999);
  let board=await records.board(db,23,{track:'veloz',season:records.CURRENT,offset:0});
  assert.equal(board.total,23);assert.equal(board.entries.length,20);assert.equal(board.own.position,23);assert.equal(board.own.gap,2200);
  assert.equal(board.leader.achieved,1000,'Slower/equal laps cannot replace metadata');
  assert.equal(board.leader.coins,undefined);assert.equal(board.leader.player_id,undefined);
  await mark(23,29000,2000);await mark(22,29000,3000);
  board=await records.board(db,22,{track:'veloz',season:records.CURRENT,offset:20});
  assert.equal(board.leader.username,'pilot_23');assert.equal(board.own.position,2);assert.equal(board.entries.length,3);
  assert.equal(board.own.gap,0,'Tied times have zero time gap');
  await db.query("INSERT INTO neurodrive.record_seasons VALUES('beta-0','Historical')");
  await db.query("INSERT INTO neurodrive.lap_records VALUES('beta-0','veloz',1,28000,500,'rubi')");
  board=await records.board(db,1,{track:'veloz',season:'all',offset:0});
  assert.equal(board.total,23,'Historical view has one row per account');assert.equal(board.own.milliseconds,28000);assert.equal(board.leader.skin,'rubi');
  assert.equal((await records.board(db,1,{track:'veloz',season:records.CURRENT,offset:0})).own.milliseconds,30100);
  assert.equal((await records.board(db,1,{track:'serra',season:'all',offset:0})).total,0);
  await assert.rejects(records.board(db,1,{track:'serra',season:'unknown',offset:0}),/Temporada/);
  assert.throws(()=>records.filters(new URLSearchParams('track=bad')),/Filtro/);
  assert.throws(()=>records.filters(new URLSearchParams('offset=-1')),/Filtro/);
  await assert.rejects(mark(1,NaN),/Invalid/);
  console.log('OK: ranking deduplication, own position outside page, ties, seasons, history, privacy and invalid filters.');
 } finally {await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
