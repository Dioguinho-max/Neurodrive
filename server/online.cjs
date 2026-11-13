const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer, WebSocket } = require('ws');
const catalog = require('./catalog.cjs');
const {modes:challengeModes,createChallenge,scoreSession}=require('./challenges.cjs');
const { createOnlineClock } = require('./online-clock.cjs');
const engine = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) new Function('window', fs.readFileSync(path.join(__dirname, '../output', file), 'utf8'))(engine);

function attachOnline(server, { origin, store, tickMs = 1000 / 60 }) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048, perMessageDeflate: false });
  const tickets = new Map(), rooms = new Map(), users = new Map();
  const recordQueue = new Map();
  function flushRecords() {
    for (const [key, entry] of recordQueue) {
      if (entry.pending || Date.now() < (entry.retryAt || 0)) continue;
      entry.pending = true;
      const record = entry.record;
      Promise.resolve().then(() => store.saveRecord(entry.id, record)).then(result => {
        const peer=users.get(String(entry.id));
        if(result && peer?.room?.raceId===record.raceId){
          const room=peer.room,key=`${entry.id}:${record.stage}`;
          const prior=room.recordSummaries.get(key);
          const summary={previous:prior?prior.previous:result.previous,milliseconds:result.milliseconds};
          room.recordSummaries.set(key,summary);
          const notice={...result,id:record.eventId,raceId:record.raceId,stage:record.stage};
          room.recordNotices.set(String(entry.id),notice);
          send(peer,{type:'record',...notice,summary});
        }
        if (entry.record === record) recordQueue.delete(key);
      }).catch(() => { entry.retryAt = Date.now() + 5000; }).finally(() => { entry.pending = false; });
    }
  }
  const recordTimer = setInterval(flushRecords, 5000);
  recordTimer.unref?.();
  const send = (peer, data) => {
    if (peer.ws.readyState === WebSocket.OPEN && peer.ws.bufferedAmount < 256000) peer.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
  };
  const players = room => [...room.peers].map(p => ({ id: p.id, name: p.profile.nickname || p.profile.username,
    ready: p.ready, loading: Boolean(p.loading), ping: p.rtt == null ? null : Math.round(p.rtt) }));
  const circuits = ['serra', 'veloz', 'tecnico', 'urbano'];
  function rules(room) { return { difficulty:room.difficulty || 'normal', tyreWear:room.tyreWear || 'normal', weather:room.weather, laps:room.laps }; }
  function raceStats(room) {
    if (challengeModes.includes(room.mode) || room.stage !== 'race' || room.race?.phase !== 'finished') return null;
    if (room.stats) return room.stats;
    const cars = room.race.cars;
    const winner = cars.find(c => c.place === 1 && Number.isFinite(c.finishTime) && !c.disconnected);
    const fastest = cars.filter(c=>Number.isFinite(c.bestLap)&&c.bestLap>0).sort((a,b)=>a.bestLap-b.bestLap)[0];
    return room.stats = { fastest:fastest ? {name:fastest.name,time:fastest.bestLap} : null,
      drivers:cars.map(c=>{
        const grid = (room.grid?.findIndex(g=>g.id===c.id) ?? -1)+1;
        const finished = c.done && !c.disconnected && Number.isFinite(c.finishTime) && c.place > 0;
        return {id:c.id,name:c.name,grid,place:finished?c.place:null,bestLap:c.bestLap,
          gained:finished&&grid ? grid-c.place:null,gap:finished&&winner?Math.max(0,c.finishTime-winner.finishTime):null};
      }).sort((a,b)=>(a.place??99)-(b.place??99)) };
  }
  function eventData(room) {
    const standings = [...(room.championship?.scores.values() || [])].sort((a,b) => b.points-a.points || b.wins-a.wins || a.id.localeCompare(b.id));
    return { championship: room.championship ? { round: room.championship.round, total: 3,
      complete: room.championship.round === 3 && room.championship.scored === room.raceId, standings } : null,
      sessionStandings:[...(room.sessionScores?.values()||[])].sort((a,b)=>b.points-a.points||b.wins-a.wins||a.name.localeCompare(b.name)), votes: Object.fromEntries(room.votes || []), rules:rules(room), stats:raceStats(room) };
  }
  function scoreRound(room) {
    const c = room.championship;
    if (!c || c.scored === room.raceId) return;
    for (const car of room.race.cars) {
      if (!car.player) continue;
      const score = c.scores.get(car.accountId);
      if (!score) continue;
      const valid = car.done && !car.disconnected && car.finishTime != null && car.place > 0;
      const points = valid ? [25,18,15,12,10,8][car.place-1] || 0 : 0;
      score.points += points;
      (score.history ||= []).push({round:c.round,points,place:valid?car.place:null});
      if (valid && car.place === 1) score.wins++;
    }
    c.scored = room.raceId;
  }
  function presence(room) {
    const data = { type: 'presence', code: room.code, owner: room.owner, players: players(room), ...eventData(room) };
    room.peers.forEach(p => send(p, data));
  }
  const heartbeat = setInterval(() => {
    for (const peer of users.values()) {
      if (peer.pingAt && Date.now() - peer.pingAt > 15000) { peer.ws.terminate(); continue; }
      if (!peer.pingAt && peer.ws.readyState === WebSocket.OPEN) { peer.pingAt = Date.now(); peer.ws.ping(); }
    }
    rooms.forEach(presence);
  }, 3000);
  heartbeat.unref?.();
  function lobby(room, reset = false, reason = null) {
    const data = { type: 'lobby', code: room.code, track: room.track, laps: room.laps, weather: room.weather, mode: room.mode, owner: room.owner,
      reset, reason, players: players(room), ...eventData(room) };
    room.peers.forEach((p) => send(p, data));
  }
  function leave(peer) {
    const room = peer.room;
    if (!room) return;
    peer.room = null;
    room.peers.delete(peer);
    room.votes?.delete(peer.id);
    if (room.owner === peer.id) room.owner = [...room.peers][0]?.id;
    if (room.race) {
      const car = room.race.cars.find((c) => c.accountId === peer.id);
      if (car && (room.stage !== 'race' || !car.done)) Object.assign(car, { disconnected: true, done: true, speed: 0 });
      const gridEntry = room.grid?.find(item => item.id === peer.carId);
      if (gridEntry && room.stage === 'waiting') gridEntry.disconnected = true;
      presence(room);
    } else {
      if (room.owner === peer.id) room.owner = [...room.peers][0]?.id;
      lobby(room);
    }
    if (!room.peers.size) { clearInterval(room.timer); rooms.delete(room.code); }
  }
  function rematch(peer, msg) {
    const room = peer.room;
    if (!room || room.owner !== peer.id) throw new Error('Somente o dono pode preparar a revanche.');
    if (!room.race || room.stage !== 'race' || room.race.phase !== 'finished') throw new Error('Aguarde todos terminarem a corrida.');
    if (!challengeModes.includes(room.mode) && room.race.cars.some(car => car.player && car.done && !car.disconnected && car.finishTime !== null && !room.rewards.get(car.id)?.saved))
      throw new Error('Aguarde o salvamento das recompensas.');
    const track = msg.track || room.track;
    if (!['serra','veloz','tecnico','urbano'].includes(track)) throw new Error('Circuito inválido.');
    const counts = circuits.map(id => [...(room.votes?.values() || [])].filter(v => v === id).length);
    if (Math.max(...counts) && counts[circuits.indexOf(track)] !== Math.max(...counts)) throw new Error('Escolha uma das pistas mais votadas.');
    if (room.championship) {
      if (room.championship.round === 3) throw new Error('Campeonato encerrado. Crie uma nova sala para disputar outro.');
      room.championship.round++;
    }
    room.votes = new Map();
    clearInterval(room.timer);
    room.race = null; room.stage = null; room.grid = null; room.finishedAt = null; room.track = track;
    room.peers.forEach(p => { p.ready = false; p.loading = false; p.input = {}; p.lastInput = 0; });
    lobby(room, true);
  }
  function snapshot(room) {
    const race = room.race;
    const cars = race.cars.map((car) => ({ ...car, checkpointTimes: undefined, accountId: undefined, recordLap: undefined,
      reward: room.rewards.get(car.id)?.amount, rewardPending: !challengeModes.includes(room.mode) && room.stage === 'race' && car.done && car.finishTime !== null && !car.disconnected && car.player && !room.rewards.get(car.id)?.saved }));
    // Serialize the common state once per room, not once per connected player.
    const common = JSON.stringify({ type: 'state', cars, stage: room.stage, grid: room.grid, raceId:room.raceId,
      waiting: room.stage === 'waiting' ? Math.ceil(room.waitTicks / 60) : 0,
      phase: room.stage === 'waiting' ? 'waiting' : race.phase, countdown: race.countdown,
      startLights: race.startLights, mode: room.mode, elapsed: race.elapsed, laps: race.laps, track: room.track,
      ...(race.phase === 'finished' ? eventData(room) : {}) });
    for (const peer of room.peers) {
      // Do not enqueue old positions behind a congested connection; the next snapshot is complete.
      if (peer.ws.bufferedAmount > 0) continue;
      const personal = JSON.stringify({ self: peer.carId,
        recordNotice: room.recordNotices.get(String(peer.id)),
        recordSummary: room.recordSummaries.get(`${peer.id}:${room.stage === 'waiting' ? 'qualifying' : room.stage}`) });
      send(peer, common.slice(0, -1) + ',' + personal.slice(1));
    }
  }
  function start(room) {
    if (room.race) throw new Error('A prova já começou.');
    if (room.peers.size < 2 || [...room.peers].some((p) => !p.ready || p.loading)) throw new Error('São necessários dois pilotos, e todos precisam marcar Pronto.');
    room.raceId = crypto.randomUUID();
    room.stats = null;
    const peers = [...room.peers];
    if (room.championship && !room.championship.scores.size) {
      peers.forEach(p => room.championship.scores.set(p.id, { id:p.id, name:p.profile.nickname || p.profile.username, points:0, wins:0 }));
    }
    const challenge=challengeModes.includes(room.mode);
    room.stage = challenge?'race':'qualifying';
    room.race = engine.createNeuroRace(engine.createNeuroTrack(room.track), room.difficulty || 'normal', { online: true, humans: peers.map((_, i) => i + 1), session: 'qualifying', pitStart: true, weather: room.weather, tyreWear:room.tyreWear });
    if(challenge) room.race=createChallenge(engine,engine.createNeuroTrack(room.track),room.mode,peers);
    room.rewards = new Map();
    room.recordSeen = new Map();
    room.recordSummaries = new Map(); room.recordNotices = new Map();
    peers.forEach((peer, index) => {
      peer.carId = index + 1;
      const car = room.race.cars[index];
      Object.assign(car, { accountId: peer.id, name: (peer.profile.nickname || peer.profile.username), manual: peer.manual, vehicle:engine.neuroVehicleId(peer.vehicle),
        skin: catalog.find((s) => s.id === peer.profile.equipped) });
    });
    let ticks = 0, snapshotDue = false;
    const advance = createOnlineClock(() => {
      const inputs = {};
      for (const peer of room.peers) inputs[peer.carId] = Date.now() - peer.lastInput < 500 ? peer.input : { brake: true, noReverse: true };
      if (room.stage === 'waiting') {
        if (--room.waitTicks <= 0) {
          const qualifiers = room.race.cars;
          room.race = engine.createNeuroRace(engine.createNeuroTrack(room.track), room.difficulty || 'normal', {
            online: true, humans: qualifiers.filter(car => car.player).map(car => car.id),
            laps: room.laps, grid: room.grid.map(car => car.id), weather: room.weather, tyreWear:room.tyreWear,
          });
          for (const car of room.race.cars) {
            const prior = qualifiers.find(item => item.id === car.id);
            Object.assign(car, { accountId: prior.accountId, name: prior.name, manual: prior.manual, vehicle:prior.vehicle, skin: prior.skin });
            if (prior.disconnected) Object.assign(car, { disconnected: true, done: true, speed: 0 });
          }
          room.stage = 'race';
          room.peers.forEach(peer => { peer.input = {}; peer.lastInput = 0; });
        }
      } else room.race.step(inputs);
      for (const car of room.race.cars) {
        if (challenge || room.track === 'urbano' || !store.saveRecord || !car.player || car.disconnected || !car.recordLap || room.recordSeen.get(car.id) === car.recordLap) continue;
        room.recordSeen.set(car.id, car.recordLap);
        const record = { track: room.track, milliseconds: car.recordLap.milliseconds, achieved: Date.now(), skin: car.skin?.id || 'original', raceId:room.raceId,stage:room.stage,eventId:`${room.raceId}:${room.stage}:${car.id}:${car.recordLap.lap}` };
        const key = `${car.accountId}:${room.track}`, queued = recordQueue.get(key);
        if (!queued) recordQueue.set(key, { id: car.accountId, record, pending: false });
        else if (record.milliseconds < queued.record.milliseconds) queued.record = record;
        flushRecords();
      }
      if (room.stage === 'qualifying' && room.race.phase === 'finished') {
        room.grid = room.race.standings().sort((a, b) => Number(Boolean(a.disconnected)) - Number(Boolean(b.disconnected)))
          .map(car => ({ id: car.id, name: car.name, bestLap: car.bestLap, disconnected: Boolean(car.disconnected) }));
        room.stage = 'waiting'; room.waitTicks = 600;
      }
      for (const car of room.race.cars) {
        if (challenge || room.stage !== 'race' || !car.player || !car.done || car.disconnected || car.finishTime === null) continue;
        if(room.track==='urbano'){room.rewards.set(car.id,{amount:0,saved:true});continue;}
        const status = room.rewards.get(car.id) || {};
        if (status.saved || status.pending || Date.now() < (status.retry || 0)) continue;
        status.pending = true;
        room.rewards.set(car.id, status);
        store.award(car.accountId, room.raceId, room.laps, car.place, room.mode, { progression: true, clean: car.progressionTicks > 0 && !car.progressionIncident, rain: car.progressionTicks > 0 && (car.progressionRainTicks || 0) / car.progressionTicks >= .25, track: room.track, bestLap: car.bestLap, pole: room.grid?.[0]?.id === car.id && room.grid[0].bestLap > 0 }).then((amount) => {
          Object.assign(status, { amount, saved: true });
        }).catch(() => { status.retry = Date.now() + 5000; }).finally(() => { status.pending = false; });
      }
      if (++ticks % 3 === 0) snapshotDue = true;
      if (room.stage === 'race' && room.race.phase === 'finished') {
        scoreRound(room); scoreSession(room);
        room.finishedAt ||= Date.now();
        if (Date.now() - room.finishedAt > 300000) {
          room.peers.forEach((p) => { send(p, { type: 'error', message: 'Sala encerrada. Crie uma nova disputa.' }); p.ws.close(); });
        }
      }
    }, tickMs, performance.now());
    room.timer = setInterval(() => {
      advance(performance.now());
      // A delayed callback sends only the latest state, never a burst of stale frames.
      if (snapshotDue) { snapshotDue = false; snapshot(room); }
    }, tickMs);
    snapshot(room);
  }
  server.on('upgrade', (req, socket, head) => {
    const allowed = typeof origin === 'function' ? origin(req) : req.headers.origin === origin;
    if (req.url !== '/online' || !allowed || wss.clients.size >= 120) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
  });
  wss.on('connection', (ws) => {
    const peer = { ws, id: null, room: null, ready: false, input: {}, lastInput: 0, messages: 0, window: Date.now() };
    const timeout = setTimeout(() => { if (!peer.id) ws.close(1008, 'Autenticação necessária'); }, 5000);
    const lifetime = setTimeout(() => ws.close(1000, 'Sessão online encerrada'), 3600000);
    ws.on('pong', () => {
      if (!peer.pingAt) return;
      const sample = Date.now() - peer.pingAt;
      peer.rtt = peer.rtt == null ? sample : peer.rtt * .7 + sample * .3;
      peer.pingAt = null;
    });
    ws.on('message', async (raw) => {
      try {
        if (Date.now() - peer.window > 1000) { peer.window = Date.now(); peer.messages = 0; }
        if (++peer.messages > 90) { ws.close(1008, 'Muitos comandos'); return; }
        const msg = JSON.parse(raw);
        if (!msg || typeof msg !== 'object') throw new Error('Mensagem inválida.');
        if (!peer.id) {
          if (peer.authenticating) return;
          const auth = typeof msg.ticket === 'string' && tickets.get(msg.ticket);
          if (msg.type !== 'auth' || !auth || auth.expires < Date.now()) { ws.close(1008, 'Acesso expirado'); return; }
          tickets.delete(msg.ticket);
          peer.authenticating = true;
          try { peer.profile = await store.profile(auth.id); }
          catch { send(peer, { type: 'error', message: 'Não foi possível carregar sua conta.' }); ws.close(); return; }
          if (ws.readyState !== WebSocket.OPEN) return;
          peer.id = String(auth.id);
          users.get(peer.id)?.ws.close(1000, 'Conta aberta em outra conexão');
          users.set(peer.id, peer);
          clearTimeout(timeout);
          send(peer, { type: 'auth', id: peer.id, name: (peer.profile.nickname || peer.profile.username) });
          return;
        }
        if (msg.type === 'ping' && Number.isFinite(msg.time)) { send(peer, { type: 'pong', time: msg.time }); return; }
        if (msg.type === 'leave') { leave(peer); send(peer, { type: 'left' }); return; }
        if (msg.type === 'rematch') { rematch(peer, msg); return; }
        if (msg.type === 'settings') {
          const room = peer.room;
          if (!room || room.owner !== peer.id) throw new Error('Somente o dono pode alterar as regras.');
          if (room.race) throw new Error('As regras só podem mudar antes da classificação.');
          if (!['easy','normal','hard'].includes(msg.difficulty) || !['reduced','normal','intense'].includes(msg.tyreWear)
            || !['dry','rain','changing'].includes(msg.weather) || ![1,3,5,10].includes(msg.laps)) throw new Error('Regras inválidas.');
          if(challengeModes.includes(room.mode)) throw new Error('As regras dos desafios são fixas.');
          Object.assign(room,{difficulty:msg.difficulty,tyreWear:msg.tyreWear,weather:msg.weather,laps:room.mode==='tournament'?3:msg.laps});
          room.peers.forEach(p=>{p.ready=false;p.loading=false;});
          lobby(room,true,'settings'); return;
        }
        if (msg.type === 'vote') {
          const room = peer.room;
          if (!room?.race || room.stage !== 'race' || room.race.phase !== 'finished' || eventData(room).championship?.complete)
            throw new Error('A votação abre ao terminar a corrida.');
          if (!circuits.includes(msg.track)) throw new Error('Circuito inválido.');
          room.votes ||= new Map(); room.votes.set(peer.id, msg.track); presence(room); return;
        }
        if (msg.type === 'create') {
          if (peer.room) throw new Error('Saia da sala atual primeiro.');
          if (rooms.size >= 20) throw new Error('Servidor cheio. Tente mais tarde.');
          if (!['serra', 'veloz', 'tecnico', 'urbano'].includes(msg.track) || ![1, 3, 5, 10].includes(msg.laps)) throw new Error('Circuito ou voltas inválidos.');
          let code;
          do { code = crypto.randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
          const mode = ['tournament','championship',...challengeModes].includes(msg.mode) ? msg.mode : 'race';
          const room = { weather: ['dry', 'rain', 'changing'].includes(msg.weather) ? msg.weather : 'dry', code, owner: peer.id, track: msg.track, mode, laps: mode === 'tournament' ? 3 : msg.laps, peers: new Set([peer]) };
          if(challengeModes.includes(mode)){room.weather='dry';room.laps=1;}
          room.difficulty = ['easy','normal','hard'].includes(msg.difficulty) ? msg.difficulty : 'normal';
          room.tyreWear = ['reduced','normal','intense'].includes(msg.tyreWear) ? msg.tyreWear : 'normal';
          room.votes = new Map();
          if (mode === 'championship') room.championship = { round:1, scores:new Map(), scored:null };
          peer.room = room; peer.ready = false; peer.loading = false; rooms.set(code, room); lobby(room);
        } else if (msg.type === 'join') {
          if (peer.room) throw new Error('Saia da sala atual primeiro.');
          const room = rooms.get(typeof msg.code === 'string' ? msg.code.toUpperCase() : '');
          if (!room || room.race || room.peers.size >= 6) throw new Error('Sala indisponível ou já em corrida.');
          if (room.championship?.scores.size && !room.championship.scores.has(peer.id)) throw new Error('Este campeonato já começou.');
          peer.room = room; peer.ready = false; peer.loading = false; room.peers.add(peer); lobby(room);
        } else if (msg.type === 'preparing' && peer.room && !peer.room.race) {
          peer.loading = msg.loading === true; peer.ready = false; lobby(peer.room);
        } else if (msg.type === 'ready' && peer.room && !peer.room.race) {
          peer.ready = msg.ready === true; peer.loading = false; peer.manual = msg.manual === true; peer.vehicle = engine.neuroVehicleId(msg.vehicle ?? peer.vehicle); lobby(peer.room);
        } else if (msg.type === 'start' && peer.room?.owner === peer.id) start(peer.room);
        else if (msg.type === 'input' && peer.room?.race) {
          peer.input = Object.fromEntries(['accelerate', 'brake', 'left', 'right', 'shiftUp', 'shiftDown', 'noReverse', 'handbrake'].map((key) => [key, msg[key] === true]));
          for (const key of ['steering', 'throttle', 'braking']) {
            peer.input[key] = Number.isFinite(msg[key]) ? Math.max(key === 'steering' ? -1 : 0, Math.min(1, msg[key])) : 0;
          }
          peer.lastInput = Date.now();
        } else if (msg.type === 'recover' && peer.room?.race) peer.room.race.recoverCar(peer.carId);
        else if (msg.type === 'pit' && peer.room?.race) peer.room.race.requestPit(peer.carId, msg.compound);
      } catch (error) { send(peer, { type: 'error', message: error.status ? error.message : ['SyntaxError'].includes(error.name) ? 'Mensagem inválida.' : error.message }); }
    });
    ws.on('error', () => {});
    ws.on('close', () => { clearTimeout(timeout); clearTimeout(lifetime); leave(peer); if (users.get(peer.id) === peer) users.delete(peer.id); });
  });
  return {
    issue(id) {
      for (const [key, ticket] of tickets) if (ticket.expires < Date.now() || String(ticket.id) === String(id)) tickets.delete(key);
      if (tickets.size >= 1000) throw new Error('Servidor ocupado.');
      const ticket = crypto.randomBytes(32).toString('hex');
      tickets.set(ticket, { id, expires: Date.now() + 60000 });
      return ticket;
    },
    disconnect(id) { users.get(String(id))?.ws.close(1000, 'Conta desconectada'); },
    close() { clearInterval(recordTimer); clearInterval(heartbeat); rooms.forEach((room) => clearInterval(room.timer)); wss.clients.forEach((ws) => ws.terminate()); wss.close(); },
  };
}
module.exports = { attachOnline };
