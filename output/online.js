(() => {
  'use strict';
  const get = (id) => document.getElementById(id);
  const challengeUI=window.createNeuroChallengesUI?.(get);
  const social = window.NeuroOnlineSocial;
  const invites = window.createNeuroInvites?.(get);
  let spectatorId=null,lastSnapshot=0,lastHealth=0,lowFpsSince=null;
  let spectatorTargets=[], positions=new Map();
  function switchSpectator(direction){const list=social?.candidates(latest)||[];if(!list.length)return;const index=list.findIndex(c=>c.id===spectatorId);spectatorId=list[(Math.max(0,index)+direction+list.length)%list.length].id;}
  get('online-spectator-prev').onclick=()=>switchSpectator(-1);
  get('online-spectator-next').onclick=()=>switchSpectator(1);
  function menuPage(settings = false) {
    get('online-session-page').hidden = settings;
    get('online-preferences').hidden = !settings;
    get('online-tab-session').setAttribute('aria-pressed',String(!settings));
    get('online-tab-settings').setAttribute('aria-pressed',String(settings));
    get('online-lobby').scrollTop = 0;
  }
  get('online-preferences').append(get('online-language'));
  get('online-tab-session').onclick=()=>menuPage(false);
  get('online-tab-settings').onclick=()=>menuPage(true);
  const fpsDisplay = window.createNeuroFPS?.(get('show-fps'), get('game-fps'));
  const updateHUD = window.createRaceHUD(get);
  const teamRadio = window.createNeuroRadio?.(get('neuro-race'));
  const updateSignals = window.createRaceSignals(get);
  const recordNotice = window.createNeuroRecordNotice?.(get);
  let recordSummaries = {};
  function renderImprovement() {
    const stage = latest?.stage === 'waiting' ? 'qualifying' : latest?.stage || 'race';
    const summary = recordSummaries[stage];
    get('online-improvement').hidden = !latest || (!summary && latest.phase !== 'finished' && latest.stage !== 'waiting');
    get('online-improvement').textContent = summary ? (window.NeuroAchievements?.improvement(summary.previous, summary.milliseconds) || '') : 'Sem novo recorde competitivo confirmado nesta sessão.';
  }
  function receiveRecord(message) {
    if (!latest || message.raceId !== latest.raceId) return;
    recordNotice?.show(message);
    if (message.summary) recordSummaries[message.stage] = message.summary;
    renderImprovement();
  }
  let socket, self, room, latest, renderer, trackId, ready = false;
  const intro = window.createNeuroIntro?.(get, progress => renderer?.setIntro?.(progress), () => { keys.clear(); pointers.clear(); }, () => audio);
  let introSession = '', introPrevious = null;
  let prediction, rtt = 0, playerPosition = 1;
  let frames = 0, fps = 0, measuredAt = performance.now();
  const motion = window.createOnlineBuffer();
  let rankingKey = '', lastInput = '', lastInputAt = 0;
  let displayedFinish = false;
  let ceremonyElapsed = null, ceremonyPrevious = null;
  let finalRanking = [];
  const lapTime = value => Number.isFinite(value) ? `${Math.floor(value / 60)}:${(value % 60).toFixed(3).padStart(6, '0')}` : 'Sem tempo';
  const keys = new Set(), pointers = new Map();
  const actions = { KeyW: 'accelerate', ArrowUp: 'accelerate', KeyS: 'brake', ArrowDown: 'brake', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyQ: 'shiftDown', KeyE: 'shiftUp', Space:'handbrake' };
  const audio = window.createNeuroAudio?.();
  const easterEgg = window.createNeuroEasterEgg?.(get('neuro-race'), () => Boolean(latest && latest.phase === 'racing' && !latest.cars.find(car => car.id === latest.self)?.done && latest.cars.find(car => car.id === latest.self)?.pitState !== 'service' && !intro?.active && !get('online-lobby').open));
  const say = (message) => { get('online-message').textContent = message; };
  const send = (data) => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)); };
  let preparation = 0, preparing = false;
  let eventKey = '';
  let statsKey = '', rulesKey = '';
  const circuitNames = { urbano:'Distrito Neon (experimental)', serra:'Serra Verde', veloz:'Autódromo Veloz', tecnico:'Vale Técnico' };
  for (const id of Object.keys(circuitNames)) {
    const points = window.createNeuroTrack(id).points;
    const xs = points.map(p=>p.x), ys = points.map(p=>p.y);
    const minX=Math.min(...xs), minY=Math.min(...ys);
    const scale=Math.min(150/(Math.max(...xs)-minX),48/(Math.max(...ys)-minY));
    const shape=points.map(p=>`${15+(p.x-minX)*scale},${8+(p.y-minY)*scale}`).join(' ');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 65"><polyline points="${shape} ${shape.split(' ')[0]}" fill="none" stroke="#4b6c74" stroke-width="7" stroke-linejoin="round"/><polyline points="${shape} ${shape.split(' ')[0]}" fill="none" stroke="#98f1be" stroke-width="2"/></svg>`;
    get('online-vote-'+id).style.backgroundImage=`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  const translated = text => window.NeuroI18n?.t(text) || text;
  function renderRules() {
    const r=room?.rules;
    get('online-settings').hidden = !room || room.owner !== self || Boolean(latest) || Boolean(window.NeuroChallenges?.names[room?.mode]);
    if(!r) return;
    if(window.NeuroChallenges?.names[room.mode]){get('online-rules-summary').textContent=translated('Desafios com regras fixas: pista seca, sem moedas e sem desgaste.');return;}
    const key=JSON.stringify([r,room.owner,room.mode]);
    if(key===rulesKey) return;
    rulesKey=key;
    get('online-rule-weather').value=r.weather;
    get('online-rule-laps').value=String(r.laps);
    get('online-rule-laps').disabled=room.mode==='tournament';
    if(window.NeuroChallenges?.names[room.mode])get('online-settings').hidden=true;
    get('online-rule-difficulty').value=r.difficulty;
    get('online-rule-wear').value=r.tyreWear;
    const climate={dry:'Seco',rain:'Chuva',changing:'Variável'}, level={easy:'Fácil',normal:'Normal',hard:'Difícil'}, wear={reduced:'Reduzido · 60%',normal:'Normal · 100%',intense:'Intenso · 150%'};
    get('online-rules-summary').textContent=`${r.laps} ${translated('voltas')} · ${translated(climate[r.weather])} · ${translated('Dificuldade da IA')}: ${translated(level[r.difficulty])} · ${translated('Desgaste dos pneus')}: ${translated(wear[r.tyreWear])}`;
  }
  function renderStats() {
    const stats=room?.stats;
    get('online-statistics').hidden=!stats;
    const key=JSON.stringify(stats);
    if(key===statsKey) return;
    statsKey=key; get('online-stat-drivers').replaceChildren();
    if(!stats) return;
    get('online-fastest').textContent=stats.fastest?`${translated('Melhor volta')}: ${stats.fastest.name} · ${lapTime(stats.fastest.time)}`:translated('Nenhuma volta válida.');
    stats.drivers.forEach(p=>{
      const row=document.createElement('li'), name=document.createElement('strong'), detail=document.createElement('span');
      name.textContent=`${p.place??'—'} · ${p.name}`;name.setAttribute('translate','no');
      detail.textContent=`${translated('Grid')}: ${p.grid||'—'} · ${translated('Posições ganhas')}: ${p.gained==null?'—':p.gained>0?'+'+p.gained:p.gained} · ${translated('Diferença')}: ${p.gap==null?'—':'+'+p.gap.toFixed(3)+' s'} · ${translated('Melhor volta')}: ${lapTime(p.bestLap)}`;
      row.append(name,detail);get('online-stat-drivers').append(row);
    });
  }
  function renderEvent() {
    renderRules(); renderStats();
    const c = room?.championship, votes = room?.votes || {};
    const key = JSON.stringify([c, votes, self, window.NeuroI18n?.language]);
    if (key === eventKey) return;
    eventKey = key;
    get('online-championship').hidden = !c;
    get('online-scores').replaceChildren();
    if (c) {
      get('online-championship-title').textContent = `${translated(c.complete ? 'Campeonato encerrado' : 'Campeonato')} · ${c.round} / ${c.total}`;
      const leader = c.standings[0];
      const champions = leader?.points > 0 ? c.standings.filter(p => p.points === leader.points && p.wins === leader.wins) : [];
      get('online-champion').textContent = !c.complete ? translated('Classificação acumulada') : !champions.length ? translated('Sem campeão: nenhuma chegada válida.') : `${translated(champions.length > 1 ? 'Título compartilhado' : 'Campeão')}: ${champions.map(p => p.name).join(' · ')}`;
      c.standings.forEach(p => {
        const row = document.createElement('li');
        const name = document.createElement('strong'); name.textContent = p.name; name.setAttribute('translate','no');
        const points = document.createElement('span'); points.textContent = `${p.points} ${translated('pontos')} · ${p.wins} ${translated('vitórias')}`;
        row.dataset.self = String(p.id === self); row.append(name,points);
        if(p.history?.length) {const history=document.createElement('small');history.textContent=p.history.map(h=>`${translated('Etapa')} ${h.round}: +${h.points}`).join(' · ');row.append(history);}
        get('online-scores').append(row);
      });
    }
    for (const id of Object.keys(circuitNames)) {
      const button = get('online-vote-' + id);
      button.textContent = `${circuitNames[id]} · ${Object.values(votes).filter(v => v === id).length} ${translated('votos')}`;
      button.setAttribute('aria-pressed',String(votes[self] === id));
    }
    const counts = Object.keys(circuitNames).map(id=>Object.values(votes).filter(v=>v===id).length);
    const best = Math.max(...counts);
    if (best && counts[Object.keys(circuitNames).indexOf(get('online-rematch-track').value)] !== best)
      get('online-rematch-track').value = Object.keys(circuitNames)[counts.indexOf(best)];
  }
  function renderPlayers() {
    challengeUI?.room(room);
    if (!room) return;
    ready = room.players.find(p => p.id === self)?.ready || false;
    get('online-ready').textContent = preparing ? 'Preparando pista…' : ready ? 'Cancelar confirmação' : 'Estou pronto';
    get('online-ready').disabled = preparing || Boolean(latest);
    get('online-start').disabled = Boolean(latest) || room.owner !== self || room.players.length < 2 || room.players.some(p => !p.ready || p.loading);
    get('online-roster-summary').textContent = `${room.players.filter(p => p.ready && !p.loading).length} / ${room.players.length} · ${translated('Pilotos prontos')}`;
    get('online-players').replaceChildren();
    for (const p of room.players) {
      const li = document.createElement('li'); li.dataset.self = String(p.id === self);
      const name = document.createElement('strong'); name.textContent = p.name; name.setAttribute('translate', 'no');
      const status = document.createElement('span');
      status.textContent = translated(latest ? latest.phase === 'finished' ? 'Finalizado' : 'Em sessão' : p.loading ? 'Preparando pista…' : p.ready ? 'Pronto' : 'Aguardando confirmação');
      status.dataset.ready = String(p.ready && !p.loading);
      const ping = document.createElement('span'); ping.className = 'online-player-ping';
      ping.textContent = p.ping == null ? translated('Medindo conexão…') : `${p.ping} ms`;
      ping.dataset.quality = p.ping == null ? 'unknown' : p.ping < 80 ? 'good' : p.ping < 180 ? 'medium' : 'poor';
      li.append(name, status, ping);
      if (p.id === room.owner) { const owner = document.createElement('small'); owner.textContent = translated('Dono da sala'); li.append(owner); }
      get('online-players').append(li);
    }
    updateRematch();
  }
  function updateRematch() {
    renderEvent();
    const finished = latest?.stage === 'race' && latest?.phase === 'finished';
    get('online-rematch-panel').hidden = !finished;
    const owner = room?.owner === self;
    const pending = latest?.cars.some(c => c.rewardPending);
    const complete = room?.championship?.complete;
    get('online-voting').hidden = !finished || Boolean(complete);
    get('online-rematch-controls').hidden = !owner || Boolean(complete);
    get('online-rematch-same').disabled = get('online-rematch-change').disabled = !finished || pending;
    const votes = Object.values(room?.votes || {});
    const maxVotes = Math.max(0,...Object.keys(circuitNames).map(id=>votes.filter(v=>v===id).length));
    if (maxVotes && votes.filter(v=>v===room.track).length < maxVotes) get('online-rematch-same').disabled = true;
    get('online-rematch-change').textContent = room?.championship ? 'Confirmar próxima etapa' : 'Preparar outra pista';
    get('online-rematch-message').textContent = pending ? 'Salvando recompensas antes da próxima disputa…' : owner ? 'Mesma sala, mesmos amigos. Todos confirmam novamente antes de largar.' : 'Aguardando o dono preparar a próxima disputa.';
    if (complete) get('online-rematch-message').textContent = 'Campeonato encerrado. Crie uma nova sala para disputar outro.';
  }
  function prepareRenderer(id) {
    if (renderer && trackId === id) return;
    renderer?.dispose(); renderer = null;
    try {
      renderer = window.createNeuroTrack3D((key) => get('np-' + key), { track: window.createNeuroTrack(id), racePresentation: true, showNames: false, quality: get('online-quality').value || 'performance', speedEffects: !window.matchMedia('(prefers-reduced-motion: reduce)').matches });
      const preview = window.createNeuroRace(window.createNeuroTrack(id), 'normal', { session: 'qualifying', pitStart: true });
      renderer.update(preview.cars, preview.cars[0], false, preview.cars[0], false);
      trackId = id;
    } catch (error) {
      renderer?.dispose(); renderer = null; trackId = null;
      throw error;
    }
  }
  function clear() { keys.clear(); pointers.clear(); document.querySelectorAll('[data-drive]').forEach((button) => button.setAttribute('aria-pressed', 'false')); prediction?.input({ brake: true, noReverse: true }, performance.now()); send({ type: 'input', brake: true, noReverse: true }); }
  function menu() {
    menuPage(false);
    intro?.finish();
    clear();
    get('online-title').textContent = latest ? latest.stage === 'waiting' ? 'Grid definido' : latest.stage === 'qualifying' ? 'Classificação em andamento' : latest.phase === 'finished' ? 'Celebração no pódio' : 'Sua corrida continua' : room ? 'Prepare seu grid' : 'Dispute com seus amigos';
    if (!get('online-lobby').open) {
      get('online-lobby').showModal();
      get('online-lobby').scrollTop = 0;
    }
  }
  function resetRoom() {
    challengeUI?.state(null,false); challengeUI?.room(null);
    spectatorId=null;spectatorTargets=[];positions.clear();lastSnapshot=0;lowFpsSince=null;get('online-spectator').hidden=true;get('online-health').hidden=true;invites?.update(null);
    eventKey = ''; statsKey = ''; rulesKey = ''; get('online-championship').hidden = true;
    get('online-statistics').hidden = true;get('online-settings').hidden=true;
    preparation++; preparing = false;
    get('online-rematch-panel').hidden = true;
    easterEgg?.reset();
    intro?.finish(); introSession = ''; introPrevious = null;
    recordNotice?.clear(); recordSummaries = {}; get('online-improvement').hidden = true;
    get('neuro-race').setAttribute('data-ceremony', 'false');
    renderer?.setCeremony?.(null); ceremonyElapsed = null; ceremonyPrevious = null;
    finalRanking = []; get('online-podium').hidden = true; get('online-grid').hidden = true;
    get('race-pit-panel').hidden = true;
    get('online-hud').hidden = true;
    room = null; latest = null; ready = false; displayedFinish = false;
    motion.clear(); rankingKey = ''; lastInput = ''; lastInputAt = 0;
    prediction = null; rtt = 0;
    get('online-ready').disabled = false;
    get('online-ready').hidden = get('online-start').hidden = false;
    get('online-manual').disabled = false; get('online-vehicle-panel').disabled=false;
    get('online-recover').disabled = true;
    get('online-leave').textContent = 'Sair da sala';
    get('online-room').hidden = true; get('online-back').hidden = true;
    get('online-options').hidden = false; get('online-reward').textContent = ''; audio?.silence();
  }
  async function request(route, body) {
    const response = await fetch('/api/' + route, { credentials: 'same-origin', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível conectar.');
    return result;
  }
  get('online-connect').onclick = async () => {
    get('online-connect').disabled = true; say('Conectando…');
    try {
      const config = await request('config');
      invites?.configure(config);
      if (!config.online) throw new Error('Modo online disponível no backend cloud.');
      const auth = await request('online-ticket', {});
      socket = new WebSocket(config.websocketUrl);
      socket.onopen = () => send({ type: 'auth', ticket: auth.ticket });
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'auth') {
          self = message.id; get('online-connect').hidden = true; resetRoom(); say(`Conectado como ${message.name}. Crie uma sala ou informe o código.`);
        } else if (message.type === 'record') { receiveRecord(message);
        } else if (message.type === 'pong') {
          const measured = Math.max(0, performance.now() - message.time);
          rtt = rtt ? rtt * 0.7 + measured * 0.3 : measured;
          get('online-connection').textContent = `Conexão: ${Math.round(rtt)} ms · Imagem: ${fps} FPS${rtt > 250 ? ' · atraso alto na rede' : ''}`;
        } else if (message.type === 'error') say(message.message);
        else if (message.type === 'left') { resetRoom(); say('Você saiu da sala.'); menu(); }
        else if (message.type === 'lobby') {
          if (message.reset) resetRoom();
          room = message; get('online-options').hidden = true; get('online-room').hidden = false;
          invites?.update(room);
          try { window.sessionStorage?.removeItem('neurodrive-invite'); } catch {}
          get('online-rematch-track').value = room.track;
          get('online-room-code').textContent = `${room.mode === 'tournament' ? 'Copa Neuro' : 'Sala'} ${room.code} · ${room.laps} volta(s)`;
          if(window.NeuroChallenges?.names[room.mode])get('online-room-code').textContent=room.code+' - '+translated(window.NeuroChallenges.names[room.mode]);
          get('online-start').textContent=translated(window.NeuroChallenges?.names[room.mode]?'Iniciar desafio':'Iniciar classifica\u00e7\u00e3o');
          ready = room.players.find((p) => p.id === self)?.ready || false;
          get('online-ready').textContent = ready ? 'Cancelar confirmação' : 'Estou pronto';
          get('online-start').disabled = room.owner !== self || room.players.length < 2 || room.players.some((p) => !p.ready);
          renderPlayers();
          say(message.reason==='settings' ? 'Regras atualizadas. Confira e confirme novamente.' : message.reset ? 'Revanche preparada. Confirme quando estiver pronto.' : 'Compartilhe o código com seus amigos.');
          if (message.reset) menu();
        } else if (message.type === 'presence') {
          if (room?.code === message.code) { Object.assign(room, message, { type:'lobby' }); renderPlayers(); }
        } else if (message.type === 'state') {
          const stageChanged = latest && (message.stage || 'race') !== (latest.stage || 'race');
          if (!latest || stageChanged) get('race-pit-compound').value = message.cars.find(car => car.id === message.self)?.tyreCompound || 'dry';
          if (stageChanged) {
            motion.clear(); prediction = null; rankingKey = ''; clear();
            if (message.stage === 'race') { get('online-lobby').close(); get('online-grid').hidden = true; }
          }
          if (!latest) { get('online-lobby').close(); audio?.unlock(); get('online-back').hidden = false; get('online-ready').disabled = true; get('online-start').disabled = true; }
          latest = message;
          lastSnapshot=performance.now();
          if (room && message.championship !== undefined) { room.championship = message.championship; room.votes = message.votes; room.stats=message.stats; room.rules=message.rules; room.sessionStandings=message.sessionStandings; }
          if (message.recordSummary) recordSummaries[message.stage === 'waiting' ? 'qualifying' : message.stage || 'race'] = message.recordSummary;
          if (message.recordNotice) receiveRecord(message.recordNotice);
          renderImprovement();
          motion.push(message, performance.now());
          if (!renderer || trackId !== message.track) {
            try { prepareRenderer(message.track); }
            catch { renderer = null; say('Não foi possível iniciar WebGL.'); menu(); send({ type: 'leave' }); }
          }
          const player = latest.cars.find((car) => car.id === latest.self);
          const introKey = `${latest.raceId}:${latest.stage === 'waiting' ? 'race' : latest.stage}`;
          const safeIntro = latest.phase === 'countdown' && latest.countdown > 1
            || latest.stage === 'waiting'
            || latest.stage === 'qualifying' && player.pitExit && !player.done;
          const startIntro = latest.stage === 'waiting' ? latest.waiting <= 8 && latest.waiting >= 7
            : safeIntro;
          if (introSession !== introKey && startIntro && renderer && !document.hidden) {
            intro?.finish(); introSession = introKey; introPrevious = null;
            get('online-lobby').close();
            intro?.start(window.createNeuroTrack(trackId), latest.stage === 'qualifying', player.weatherMode || room?.weather || 'dry');
          }
          if (!safeIntro && intro?.active) intro.finish();
          document.querySelectorAll('.race-shift').forEach((button) => { button.hidden = !player.manual; });
          get('online-ready').hidden = get('online-start').hidden = true;
          get('online-manual').disabled = true; get('online-vehicle-panel').disabled=true;
          get('online-recover').disabled = latest.phase !== 'racing' || player.done || Boolean(player.cooldown || player.pitState);
          get('online-leave').textContent = latest.phase === 'finished' || player.done ? 'Voltar às salas' : 'Abandonar corrida';
          prediction ||= window.createOnlinePrediction(window.createNeuroTrack(trackId));
          prediction.receive(player, latest.phase, performance.now(), rtt);
          const qualifying = latest.stage === 'qualifying' || latest.stage === 'waiting';
          const ranking = window.NeuroChallenges?.names[latest.mode] ? window.NeuroChallenges.rank(latest.cars,latest.mode) : [...latest.cars].sort((a, b) => Number(Boolean(a.disconnected)) - Number(Boolean(b.disconnected)) || (qualifying
            ? (a.bestLap ?? Infinity) - (b.bestLap ?? Infinity) || a.id - b.id
            : (a.place || 99) - (b.place || 99) || b.progress - a.progress));
          const nextRankingKey = JSON.stringify(ranking.map((car) => [car.id, car.name, car.disconnected, car.done, car.completedLaps, car.bestLap,car.challengeScore,car.challengeBest]));
          if (rankingKey !== nextRankingKey) {
          rankingKey = nextRankingKey;
          get('online-ranking').replaceChildren();
          for (const car of ranking) { const li = document.createElement('li'); li.dataset.self = String(car.id === latest.self); li.textContent = `${car.name} · ${window.NeuroChallenges?.names[latest.mode] ? window.NeuroChallenges.value(car,latest.mode) : car.disconnected ? 'desconectado' : qualifying ? lapTime(car.bestLap) : car.done ? 'chegou' : `volta ${Math.min(latest.laps, car.completedLaps + 1)}/${latest.laps}`}`; get('online-ranking').append(li); }
          }
          get('online-hud').hidden = false;
          playerPosition = ranking.indexOf(player) + 1;
          positions=new Map(ranking.map((car,index)=>[car.id,index+1]));
          spectatorTargets=social?.candidates(latest)||[];
          if(!spectatorTargets.some(car=>car.id===spectatorId))spectatorId=spectatorTargets[0]?.id??null;
          const watched=latest.cars.find(car=>car.id===spectatorId)||player;
          updateHUD(watched, positions.get(watched.id)||playerPosition, ranking.length, latest.laps, latest.elapsed, latest.phase);
          get('race-banner').textContent = latest.stage === 'waiting' ? `Largada em ${latest.waiting} s`
            : qualifying && player.done ? 'Aguardando os tempos dos adversários…'
            : player.pitExit ? 'Saída automática dos boxes · classificação'
            : latest.phase === 'countdown' ? latest.countdown : latest.phase === 'finished' ? 'Prova encerrada'
            : qualifying ? player.completedLaps === 0 ? 'Classificação · aquecimento' : `Classificação · tentativa ${Math.min(2, player.completedLaps)}/2` : '';
          if (!qualifying) updateSignals(player, latest);
          if (latest.stage === 'waiting') {
            get('online-grid').hidden = false;
            get('online-grid-title').textContent = `Grid de largada · corrida em ${latest.waiting} s`;
            get('online-grid-rows').replaceChildren();
            for (const car of latest.grid || []) {
              const li = document.createElement('li'); li.textContent = `${car.name} · ${lapTime(car.bestLap)}${car.disconnected ? ' · desconectado' : ''}`;
              get('online-grid-rows').append(li);
            }
            if (stageChanged) menu();
          }
          if (!qualifying && latest.phase === 'finished' && !displayedFinish) {
            finalRanking = ranking; displayedFinish = true; get('online-lobby').close(); get('online-back').hidden = true;
            ceremonyElapsed = 0; ceremonyPrevious = null;
            get('neuro-race').setAttribute('data-ceremony', 'true');
            get('online-grid').hidden = false; get('online-grid-title').textContent = 'Classificação final';
            get('online-grid-rows').replaceChildren();
            for (const car of ranking) {
              const li = document.createElement('li'); li.textContent = `${car.name} · ${car.disconnected ? 'Desconectado' : car.finishTime !== null ? lapTime(car.finishTime) : 'Em pista ao encerrar'}`;
              get('online-grid-rows').append(li);
            }
          }
          get('online-reward').textContent = player.rewardPending ? 'Salvando recompensa…' : player.reward !== undefined ? `Recompensa: ${player.reward} moedas. Seu saldo foi salvo na conta.` : latest.phase === 'finished' && !player.done ? 'Prova encerrada pelo limite de tempo. Sem recompensa.' : '';
          if (qualifying) get('online-reward').textContent = 'A classificação define o grid e não concede moedas.';
          else if (player.done && player.place && !player.disconnected) get('online-reward').textContent = `🏁 Bandeirada · ${player.place}º lugar. ${get('online-reward').textContent}`;
          if(window.NeuroChallenges?.names[latest.mode] && latest.phase==='finished' && ceremonyElapsed!==null && !latest.cars.some(c=>c.place>0&&!c.disconnected)){ceremonyElapsed=null;renderer?.setCeremony?.(null);get('neuro-race').setAttribute('data-ceremony','false');menu();}
          challengeUI?.room(room);
          challengeUI?.state(latest,!get('online-lobby').open&&!intro?.active);
          if(latest.track==='urbano')get('online-reward').textContent=translated('Distrito Neon é experimental: sem moedas e sem ranking competitivo.');
          updateRematch();
        }
      };
      socket.onclose = () => { clear(); audio?.silence(); resetRoom(); get('online-options').hidden = true; get('online-connect').hidden = false; get('online-connect').disabled = false; say('Conexão encerrada. Reconecte para entrar em uma nova sala.'); menu(); };
      socket.onerror = () => say('Falha na conexão online. Verifique se o backend está ativo.');
    } catch (error) { say(error.message || 'Servidor indisponível.'); get('online-connect').disabled = false; }
  };
  get('online-mode').value = new URLSearchParams(window.location?.search || '').get('mode') === 'tournament' ? 'tournament' : 'race';
  get('online-mode').onchange = () => {
    const tournament = get('online-mode').value === 'tournament';
    get('online-cup-help').hidden = !tournament;
    get('online-championship-help').hidden = get('online-mode').value !== 'championship';
    const challenge=Boolean(window.NeuroChallenges?.names[get('online-mode').value]);
    get('online-challenge-help').hidden=!challenge;
    get('online-weather').disabled=challenge;
    get('online-laps').disabled = tournament||challenge;
    if(challenge){get('online-laps').value='1';get('online-weather').value='dry';}
    if (tournament) get('online-laps').value = '3';
  };
  get('online-mode').onchange();
  let invited=social?.roomCode(new URLSearchParams(window.location?.search||'').get('room'));
  try { if(invited)window.sessionStorage?.setItem('neurodrive-invite',invited);else invited=social?.roomCode(window.sessionStorage?.getItem('neurodrive-invite')); } catch {}
  if(invited)get('online-code').value=invited;
  get('online-create').onclick = () => send({ type: 'create', track: get('online-track').value,
    mode: get('online-mode').value, weather: get('online-weather').value, laps: Number(get('online-laps').value) });
  get('online-join').onsubmit = (event) => { event.preventDefault(); send({ type: 'join', code: get('online-code').value.trim().toUpperCase() }); };
  get('online-ready').onclick = async () => {
    if (!room || latest || preparing) return;
    audio?.unlock();
    if (ready) { send({ type: 'ready', ready: false }); return; }
    const ticket = ++preparation, id = room.track;
    preparing = true; send({ type: 'preparing', loading: true }); renderPlayers();
    await new Promise(resolve => setTimeout(resolve, 50));
    if (ticket !== preparation || !room) return;
    try {
      prepareRenderer(id);
      send({ type: 'ready', ready: true, manual: get('online-manual').checked, vehicle:get('online-vehicle').value });
    } catch { send({ type: 'preparing', loading: false }); say('Não foi possível preparar a pista. Tente o modo Desempenho.'); }
    finally { preparing = false; renderPlayers(); }
  };
  get('online-rematch-same').onclick = () => send({ type: 'rematch', track: room?.track });
  get('online-rematch-change').onclick = () => send({ type: 'rematch', track: get('online-rematch-track').value });
  for (const id of Object.keys(circuitNames)) get('online-vote-' + id).onclick = () => send({ type:'vote', track:id });
  window.addEventListener('neurodrive:language', () => { eventKey = ''; rulesKey='';statsKey=''; renderEvent(); });
  get('online-save-rules').onclick=()=>send({type:'settings', weather:get('online-rule-weather').value,laps:Number(get('online-rule-laps').value),difficulty:get('online-rule-difficulty').value,tyreWear:get('online-rule-wear').value});
  window.createNeuroVehiclePicker?.('online',()=>{ if(room && !latest) send({type:'ready',ready:false,vehicle:get('online-vehicle').value}); });
  get('online-manual').onchange = () => { if (room) send({ type: 'ready', ready: false, manual: get('online-manual').checked, vehicle:get('online-vehicle').value }); };
  get('online-start').onclick = () => send({ type: 'start' });
  get('online-leave').onclick = () => send({ type: 'leave' });
  get('race-pit-request').onclick = () => send({ type: 'pit', compound: get('race-pit-compound').value });
  get('online-recover').onclick = () => send({ type: 'recover' });
  get('online-menu').onclick = menu;
  get('online-back').onclick = () => get('online-lobby').close();
  get('online-lobby').oncancel = (event) => { event.preventDefault(); if (latest) get('online-lobby').close(); };
  get('online-sound').onchange = () => audio?.setEnabled(get('online-sound').checked);
  window.bindNeuroQuality(get('online-quality'), (quality) => renderer?.setQuality(quality));
  window.addEventListener('keydown', (event) => {
    easterEgg?.keydown(event);
    if (intro?.active) return;
    if (get('online-lobby').open || ['INPUT', 'SELECT'].includes(event.target.tagName)) return;
    if(social?.candidates(latest).length && ['BracketLeft','BracketRight'].includes(event.code)){event.preventDefault();switchSpectator(event.code==='BracketLeft'?-1:1);return;}
    if (actions[event.code]) { event.preventDefault(); keys.add(event.code); }
    if (event.code === 'Escape') menu();
    if (event.code === 'KeyB' && !event.repeat) send({ type: 'pit', compound: get('race-pit-compound').value });
    if (event.code === 'KeyR' && !event.repeat) send({ type: 'recover' });
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  document.querySelectorAll('[data-drive]').forEach((button) => {
    button.setAttribute('aria-pressed', 'false');
    button.oncontextmenu = (event) => event.preventDefault();
    button.onpointerdown = (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); pointers.set(event.pointerId, button.dataset.drive); button.setAttribute('aria-pressed', 'true'); };
    for (const name of ['onpointerup', 'onpointercancel', 'onlostpointercapture']) button[name] = (event) => { pointers.delete(event.pointerId); button.setAttribute('aria-pressed', String([...pointers.values()].includes(button.dataset.drive))); };
  });
  const gamepad = window.createNeuroGamepad?.({
    menu,
    back: () => { if (intro?.active) intro.finish(); else if (latest && latest.stage !== 'waiting') get('online-lobby').close(); },
    pit: () => { if (latest && !get('race-pit-request').disabled) send({ type: 'pit', compound: get('race-pit-compound').value }); },
    recover: () => { if (!get('online-recover').disabled) send({ type: 'recover' }); },
    disconnect: menu,
  });
  setInterval(() => {
    if (!latest || latest.phase === 'finished' || latest.cars.find(c=>c.id===latest.self)?.done) return;
    const input = { type: 'input' };
    if (!get('online-lobby').open && !intro?.active && !document.hidden) { Object.assign(input, gamepad?.input()); keys.forEach((key) => { input[actions[key]] = true; }); pointers.forEach((key) => { input[key] = true; }); }
    else { input.brake = true; input.noReverse = true; }
    const encoded = JSON.stringify(input), now = performance.now();
    prediction?.input(input, now);
    // Send changes promptly, with a heartbeat below the server's input timeout.
    if (encoded !== lastInput || now - lastInputAt >= 100) {
      send(input); lastInput = encoded; lastInputAt = now;
    }
  }, 16);
  setInterval(() => { if (socket?.readyState === WebSocket.OPEN && self) send({ type: 'ping', time: performance.now() }); }, 1000);
  let lastHudUpdate = -Infinity, lastRender = -Infinity;
  const sectorHUD=window.createNeuroSectorHUD?.(get('neuro-race'));
  const feedback=window.createNeuroDrivingFeedback?.('online',audio,()=>gamepad?.pad());
  function draw() {
    recordNotice?.update();
    const now = performance.now();
    sectorHUD?.(latest?.cars.find(c=>c.id===latest.self),latest?.cars||[],latest?.phase==='racing'&&latest.mode!=='drift-challenge'&&latest.mode!=='lap-challenge'&&!latest?.cars.find(c=>c.id===latest.self)?.done&&!get('online-lobby').open&&!intro?.active,now);
    feedback?.update(latest?.cars.find(c=>c.id===latest.self),latest?.cars||[],latest?.phase==='racing'&&!get('online-lobby').open&&!intro?.active,now);
    if(get('online-lobby').open || intro?.active)get('online-challenge-hud').hidden=true;
    if(now-lastHealth>=1000){
      lastHealth=now;
      const active=Boolean(latest&&latest.phase==='racing'&&!document.hidden&&!get('online-lobby').open&&!intro?.active);
      if(active&&fps>0&&fps<30)lowFpsSince??=now;else lowFpsSince=null;
      const text=social?.diagnose({connected:socket?.readyState===WebSocket.OPEN,age:now-lastSnapshot,rtt,fps:lowFpsSince!==null&&now-lowFpsSince>=2000?fps:60,active})||'';
      get('online-health').textContent=translated(text);
      get('online-health').hidden=!text||!active;
    }
    intro?.tick(introPrevious === null ? 0 : Math.min(100, Math.max(0, now - introPrevious)));
    introPrevious = now;
    if (now - measuredAt >= 1000) { fps = Math.round(frames * 1000 / (now - measuredAt)); frames = 0; measuredAt = now; }
    const budget = get('online-lobby').open ? 1000 / 15 : get('online-quality').value === 'performance' ? 1000 / 60 : 0;
    const renderFrame = latest && renderer && !document.hidden && now - lastRender >= budget - .5;
    if (renderFrame) {
      // Retain the fractional frame interval on 75/144 Hz displays.
      lastRender = budget && Number.isFinite(lastRender) ? now - ((now - lastRender) % budget) : now;
      frames++;
      if (ceremonyElapsed !== null) {
        if (ceremonyPrevious !== null && !get('online-lobby').open) ceremonyElapsed += Math.min(100, Math.max(0, now - ceremonyPrevious));
        ceremonyPrevious = now;
        renderer.setCeremony?.(finalRanking, ceremonyElapsed);
        get('race-banner').textContent = ceremonyElapsed < 5000 ? 'Chegada ao pódio' : finalRanking.filter(car => !car.disconnected).slice(0, 3).map((car, i) => `${i + 1}º ${car.name}`).join(' · ');
        if (ceremonyElapsed >= 12000) { ceremonyElapsed = null; renderer.setCeremony?.(null); get('neuro-race').setAttribute('data-ceremony', 'false'); menu(); }
      }
      const cars = motion.sample(performance.now());
      const index = cars.findIndex((car) => car.id === latest.self);
      const player = prediction?.sample(performance.now()) || cars[index];
      cars[index] = player;
      const targets=spectatorTargets;
      const spectator = cars.find(c=>c.id===spectatorId) || player;
      if (now - lastHudUpdate >= 50) {
        updateHUD(spectator, positions.get(spectator.id)||playerPosition, cars.length, latest.laps, latest.elapsed, latest.phase);
        lastHudUpdate = now;
      }
      teamRadio?.update(player, { key:`${latest.raceId}:${latest.stage}`, phase:latest.phase, laps:latest.laps, qualifying:latest.stage !== 'race', drift:latest.mode==='drift-challenge'||latest.mode==='lap-challenge', elapsed:latest.elapsed }, !get('online-lobby').open && !intro?.active && !document.hidden);
      get('online-spectator').hidden=!targets.length||get('online-lobby').open||Boolean(intro?.active)||ceremonyElapsed!==null;
      get('online-spectator-name').textContent=`${translated('Acompanhando')}: ${spectator.name}`;
      get('online-spectator-prev').disabled=get('online-spectator-next').disabled=targets.length<2;
      easterEgg?.update(renderer);
      renderer.update(cars, player, false, spectator, latest.phase === 'finished'); audio?.update(player, latest, !player.done && !document.hidden);
    }
    requestAnimationFrame(draw);
    if (renderFrame || !latest || document.hidden) fpsDisplay?.tick(now, Boolean(renderFrame));
  }
  menu(); requestAnimationFrame(draw);
})();
