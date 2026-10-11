const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer, WebSocket } = require('ws');
const catalog = require('./catalog.cjs');
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
    if (peer.ws.readyState === WebSocket.OPEN && peer.ws.bufferedAmount < 256000) peer.ws.send(JSON.stringify(data));
  };
  function lobby(room) {
    const data = { type: 'lobby', code: room.code, track: room.track, laps: room.laps, weather: room.weather, mode: room.mode, owner: room.owner,
      players: [...room.peers].map((p) => ({ id: p.id, name: (p.profile.nickname || p.profile.username), ready: p.ready })) };
    room.peers.forEach((p) => send(p, data));
  }
  function leave(peer) {
    const room = peer.room;
    if (!room) return;
    peer.room = null;
    room.peers.delete(peer);
    if (room.race) {
      const car = room.race.cars.find((c) => c.accountId === peer.id);
      if (car && (room.stage !== 'race' || !car.done)) Object.assign(car, { disconnected: true, done: true, speed: 0 });
      const gridEntry = room.grid?.find(item => item.id === peer.carId);
      if (gridEntry && room.stage === 'waiting') gridEntry.disconnected = true;
    } else {
      if (room.owner === peer.id) room.owner = [...room.peers][0]?.id;
      lobby(room);
    }
    if (!room.peers.size) { clearInterval(room.timer); rooms.delete(room.code); }
  }
  function snapshot(room) {
    const race = room.race;
    const cars = race.cars.map((car) => ({ ...car, checkpointTimes: undefined, accountId: undefined, recordLap: undefined,
      reward: room.rewards.get(car.id)?.amount, rewardPending: room.stage === 'race' && car.done && car.finishTime !== null && !car.disconnected && car.player && !room.rewards.get(car.id)?.saved }));
    for (const peer of room.peers) send(peer, { type: 'state', cars, stage: room.stage, grid: room.grid, raceId:room.raceId,
      recordNotice:room.recordNotices.get(String(peer.id)),recordSummary:room.recordSummaries.get(`${peer.id}:${room.stage==='waiting'?'qualifying':room.stage}`),
      waiting: room.stage === 'waiting' ? Math.ceil(room.waitTicks / 60) : 0,
      phase: room.stage === 'waiting' ? 'waiting' : race.phase, countdown: race.countdown,
      startLights: race.startLights, mode: room.mode, elapsed: race.elapsed, laps: race.laps, track: room.track, self: peer.carId });
  }
  function start(room) {
    if (room.race) throw new Error('A prova já começou.');
    if (room.peers.size < 2 || [...room.peers].some((p) => !p.ready)) throw new Error('São necessários dois pilotos, e todos precisam marcar Pronto.');
    room.raceId = crypto.randomUUID();
    const peers = [...room.peers];
    room.stage = 'qualifying';
    room.race = engine.createNeuroRace(engine.createNeuroTrack(room.track), 'normal', { online: true, humans: peers.map((_, i) => i + 1), session: 'qualifying', pitStart: true, weather: room.weather });
    room.rewards = new Map();
    room.recordSeen = new Map();
    room.recordSummaries = new Map(); room.recordNotices = new Map();
    peers.forEach((peer, index) => {
      peer.carId = index + 1;
      const car = room.race.cars[index];
      Object.assign(car, { accountId: peer.id, name: (peer.profile.nickname || peer.profile.username), manual: peer.manual,
        skin: catalog.find((s) => s.id === peer.profile.equipped) });
    });
    let ticks = 0;
    room.timer = setInterval(() => {
      const inputs = {};
      for (const peer of room.peers) inputs[peer.carId] = Date.now() - peer.lastInput < 500 ? peer.input : { brake: true };
      if (room.stage === 'waiting') {
        if (--room.waitTicks <= 0) {
          const qualifiers = room.race.cars;
          room.race = engine.createNeuroRace(engine.createNeuroTrack(room.track), 'normal', {
            online: true, humans: qualifiers.filter(car => car.player).map(car => car.id),
            laps: room.laps, grid: room.grid.map(car => car.id), weather: room.weather,
          });
          for (const car of room.race.cars) {
            const prior = qualifiers.find(item => item.id === car.id);
            Object.assign(car, { accountId: prior.accountId, name: prior.name, manual: prior.manual, skin: prior.skin });
            if (prior.disconnected) Object.assign(car, { disconnected: true, done: true, speed: 0 });
          }
          room.stage = 'race';
          room.peers.forEach(peer => { peer.input = {}; peer.lastInput = 0; });
        }
      } else room.race.step(inputs);
      for (const car of room.race.cars) {
        if (!store.saveRecord || !car.player || car.disconnected || !car.recordLap || room.recordSeen.get(car.id) === car.recordLap) continue;
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
        if (room.stage !== 'race' || !car.player || !car.done || car.disconnected || car.finishTime === null) continue;
        const status = room.rewards.get(car.id) || {};
        if (status.saved || status.pending || Date.now() < (status.retry || 0)) continue;
        status.pending = true;
        room.rewards.set(car.id, status);
        store.award(car.accountId, room.raceId, room.laps, car.place, room.mode, { track: room.track, bestLap: car.bestLap, pole: room.grid?.[0]?.id === car.id && room.grid[0].bestLap > 0 }).then((amount) => {
          Object.assign(status, { amount, saved: true });
        }).catch(() => { status.retry = Date.now() + 5000; }).finally(() => { status.pending = false; });
      }
      if (++ticks % 3 === 0) snapshot(room);
      if (room.stage === 'race' && room.race.phase === 'finished') {
        room.finishedAt ||= Date.now();
        if (Date.now() - room.finishedAt > 300000) {
          room.peers.forEach((p) => { send(p, { type: 'error', message: 'Sala encerrada. Crie uma nova disputa.' }); p.ws.close(); });
        }
      }
    }, tickMs);
    snapshot(room);
  }
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/online' || req.headers.origin !== origin || wss.clients.size >= 120) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
  });
  wss.on('connection', (ws) => {
    const peer = { ws, id: null, room: null, ready: false, input: {}, lastInput: 0, messages: 0, window: Date.now() };
    const timeout = setTimeout(() => { if (!peer.id) ws.close(1008, 'Autenticação necessária'); }, 5000);
    const lifetime = setTimeout(() => ws.close(1000, 'Sessão online encerrada'), 3600000);
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
        if (msg.type === 'create') {
          if (peer.room) throw new Error('Saia da sala atual primeiro.');
          if (rooms.size >= 20) throw new Error('Servidor cheio. Tente mais tarde.');
          if (!['serra', 'veloz', 'tecnico'].includes(msg.track) || ![1, 3, 5, 10].includes(msg.laps)) throw new Error('Circuito ou voltas inválidos.');
          let code;
          do { code = crypto.randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
          const mode = msg.mode === 'tournament' ? 'tournament' : 'race';
          const room = { weather: ['dry', 'rain', 'changing'].includes(msg.weather) ? msg.weather : 'dry', code, owner: peer.id, track: msg.track, mode, laps: mode === 'tournament' ? 3 : msg.laps, peers: new Set([peer]) };
          peer.room = room; peer.ready = false; rooms.set(code, room); lobby(room);
        } else if (msg.type === 'join') {
          if (peer.room) throw new Error('Saia da sala atual primeiro.');
          const room = rooms.get(typeof msg.code === 'string' ? msg.code.toUpperCase() : '');
          if (!room || room.race || room.peers.size >= 6) throw new Error('Sala indisponível ou já em corrida.');
          peer.room = room; peer.ready = false; room.peers.add(peer); lobby(room);
        } else if (msg.type === 'ready' && peer.room && !peer.room.race) {
          peer.ready = msg.ready === true; peer.manual = msg.manual === true; lobby(peer.room);
        } else if (msg.type === 'start' && peer.room?.owner === peer.id) start(peer.room);
        else if (msg.type === 'input' && peer.room?.race) {
          peer.input = Object.fromEntries(['accelerate', 'brake', 'left', 'right', 'shiftUp', 'shiftDown'].map((key) => [key, msg[key] === true]));
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
    close() { clearInterval(recordTimer); rooms.forEach((room) => clearInterval(room.timer)); wss.clients.forEach((ws) => ws.terminate()); wss.close(); },
  };
}
module.exports = { attachOnline };
