'use strict';
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const {CloudStore}=require('../../server/cloud-store.cjs');
const {DatabaseSync}=require('node:sqlite');
const progression=require('../../server/progression.cjs');
class TestPool {
  constructor() { this.db = new PGlite(); this.tail = Promise.resolve(); }
  async lock() { let release; const previous = this.tail; this.tail = new Promise((resolve) => { release = resolve; }); await previous; return release; }
  async execute(sql, params) {
    const result = params ? await this.db.query(sql, params) : (await this.db.exec(sql)).at(-1);
    return { ...result, rowCount: result.rowCount ?? (result.rows?.length || result.affectedRows || 0) };
  }
  async query(sql, params) { const release = await this.lock(); try { return await this.execute(sql, params); } finally { release(); } }
  async connect() { const release = await this.lock(); return { query: this.execute.bind(this), release }; }
}

(async()=>{
 const pool=new TestPool(),store=new CloudStore(pool);
 try {
 await store.init();await store.init();
 const {id}=await store.create('challenge_driver','hash','salt');
 assert.equal((await store.profile(id)).tutorialComplete,false);
 await store.completeTutorial(id);await store.completeTutorial(id);
 assert.equal((await store.profile(id)).tutorialComplete,true);
 await assert.rejects(store.buy(id,'storm-exclusive',true),e=>e.status===403);
 await store.award(id,'legacy',1,1);
 assert((await store.profile(id)).progression.every(g=>g.progress===0));
 const event={progression:true,clean:true,rain:true,track:'serra'};
 const first=await Promise.all([store.award(id,'one',1,1,'race',event),store.award(id,'one',1,1,'race',event)]);
 assert.deepEqual(first,[420,420]);
 let p=await store.profile(id);assert.equal(p.coins,990);assert(p.owned.includes('storm-exclusive'));assert.equal(p.progression.find(g=>g.code==='podiums').progress,1);
 await store.award(id,'two',1,2,'race',{progression:true});
 await store.award(id,'three',1,3,'race',{progression:true});
 p=await store.profile(id);assert(p.progression.every(g=>g.achieved));assert(p.owned.includes('podium-exclusive'));
 const before=p.coins;await store.award(id,'three',1,1,'race',event);assert.equal((await store.profile(id)).coins,before);
 await store.buy(id,'podium-exclusive',false);assert.equal((await store.profile(id)).equipped,'podium-exclusive');
 await store.init();assert((await store.profile(id)).progression.every(g=>g.achieved));
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE players(id INTEGER PRIMARY KEY,coins INTEGER);INSERT INTO players VALUES(1,0);CREATE TABLE inventory(player_id INTEGER,skin TEXT,PRIMARY KEY(player_id,skin))');
 const local=progression.local(db);assert.equal(local.award(1,4,{progression:true},123),0);
 assert.equal(local.award(1,1,event,123),350);assert.equal(local.award(1,2,event,124),0);assert.equal(local.award(1,3,event,125),250);assert.equal(local.award(1,1,event,126),0);
 assert.equal(db.prepare('SELECT coins FROM players').get().coins,600);assert(progression.local(db).profile(1).every(g=>g.achieved));db.close();
 console.log('OK: SQLite/PostgreSQL progression, concurrent retry, exclusive purchase protection, persistence, one-time grants and no historical credit.');
 }finally{await pool.db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
