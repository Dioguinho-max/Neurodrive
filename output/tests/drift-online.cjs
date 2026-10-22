const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { createDriftService } = require('../../server/drift.cjs');
const api = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(api);
(async () => {
  let clock = 0, saved, submitted;
  const service = createDriftService({ saveDrift: (id, result) => { saved = { id, ...result }; } }, () => clock);
  const client = {};
  async function fetch(url, options) {
    const data = JSON.parse(options.body);
    const result = url.endsWith('/start') ? service.start(5, data) : await service.finish(5, { ...(submitted = data), score:99999999 });
    return { ok:true, json: async () => result };
  }
  new Function('window', 'fetch', fs.readFileSync(path.join(__dirname, '../neurodrive-drift-online.js'), 'utf8'))(client, fetch);
  assert.throws(() => service.start(5, {track:'invalid',setup:'stable'}));
  const arena = api.createNeuroTrack('arena');
  assert(arena.halfWidth > api.createNeuroTrack('serra').halfWidth);
  const grip = setup => {
    const race = api.createNeuroRace(arena,'normal',{mode:'drift',driftSetup:setup});
    for(let i=0;i<180;i++) race.step();
    const point=arena.pointAt(900);
    Object.assign(race.cars[0],point,{speed:1.5,angle:point.angle+.5,driftHeading:point.angle});
    race.step({accelerate:true});
    return race.cars[0].driftRearGrip;
  };
  assert(grip('stable') > grip('loose'), 'Stable setup recovers more grip');
  for (const setup of ['stable','loose']) {
    const race = api.createNeuroRace(api.createNeuroTrack('arena'), 'normal', {mode:'drift',driftSetup:setup});
    const attempt = client.NeuroDriftOnline.start(race, 'arena', setup);
    for (let tick=0;race.phase !== 'finished';tick++) {
      if (tick===600) race.recoverPlayer();
      if (tick===1100) race.setTransmission('manual');
      if (tick===1500) race.setTransmission('automatic');
      race.step({ accelerate:tick%160<120, steering:Math.sin(tick/60)*.65, handbrake:tick%100<10, shiftUp:tick%90===0 });
    }
    clock+=130000;
    const result=await attempt.finish();
    assert.equal(result.score,race.driftScore.total);
    assert.equal(result.combo,race.driftScore.best);
    assert.equal(saved.setup,setup);
    assert.equal(saved.id,5);
    assert.equal(submitted.score,undefined,'Client sends commands, not a score');
    await assert.rejects(service.finish(5,submitted),/expirada/);
    assert.deepEqual(await attempt.finish(), result, 'Result review does not submit again');
  }
  const ticket=service.start(5,{track:'arena',setup:'stable'});
  await assert.rejects(service.finish(6,{...ticket,frames:[]}),/expirada/);
  await assert.rejects(service.finish(5,{...ticket,frames:[]}),/incompleta/);
  clock+=130000;
  await assert.rejects(service.finish(5,{...ticket,frames:Array(7381).fill([2,0,0,0,0]),score:999999}),/inválida/);
  console.log('OK: full client/server drift replay, setups, manual shifts, recovery, tokens and invalid inputs.');
})().catch(error=>{console.error(error);process.exitCode=1;});
