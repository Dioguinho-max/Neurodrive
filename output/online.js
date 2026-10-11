(() => {
  'use strict';
  const get = (id) => document.getElementById(id);
  const updateHUD = window.createRaceHUD(get);
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
  const intro = window.createNeuroIntro?.(get, progress => renderer?.setIntro?.(progress), () => { keys.clear(); pointers.clear(); });
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
  const actions = { KeyW: 'accelerate', ArrowUp: 'accelerate', KeyS: 'brake', ArrowDown: 'brake', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyQ: 'shiftDown', KeyE: 'shiftUp' };
  const audio = window.createNeuroAudio?.();
  const say = (message) => { get('online-message').textContent = message; };
  const send = (data) => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)); };
  function clear() { keys.clear(); pointers.clear(); document.querySelectorAll('[data-drive]').forEach((button) => button.setAttribute('aria-pressed', 'false')); prediction?.input({ brake: true }, performance.now()); send({ type: 'input', brake: true }); }
  function menu() {
    intro?.finish();
    clear();
    get('online-title').textContent = latest ? latest.stage === 'waiting' ? 'Grid definido' : latest.stage === 'qualifying' ? 'Classificação em andamento' : latest.phase === 'finished' ? 'Celebração no pódio' : 'Sua corrida continua' : room ? 'Prepare seu grid' : 'Dispute com seus amigos';
    if (!get('online-lobby').open) get('online-lobby').showModal();
  }
  function resetRoom() {
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
    get('online-manual').disabled = false;
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
          room = message; get('online-options').hidden = true; get('online-room').hidden = false;
          get('online-room-code').textContent = `${room.mode === 'tournament' ? 'Copa Neuro' : 'Sala'} ${room.code} · ${room.laps} volta(s)`;
          ready = room.players.find((p) => p.id === self)?.ready || false;
          get('online-ready').textContent = ready ? 'Cancelar confirmação' : 'Estou pronto';
          get('online-start').disabled = room.owner !== self || room.players.length < 2 || room.players.some((p) => !p.ready);
          get('online-players').replaceChildren();
          for (const p of room.players) { const li = document.createElement('li'); li.textContent = `${p.name}${p.id === room.owner ? ' · dono' : ''} · ${p.ready ? 'pronto' : 'aguardando'}`; get('online-players').append(li); }
          say('Compartilhe o código com seus amigos.');
        } else if (message.type === 'state') {
          const stageChanged = latest && (message.stage || 'race') !== (latest.stage || 'race');
          if (!latest || stageChanged) get('race-pit-compound').value = message.cars.find(car => car.id === message.self)?.tyreCompound || 'dry';
          if (stageChanged) {
            motion.clear(); prediction = null; rankingKey = ''; clear();
            if (message.stage === 'race') { get('online-lobby').close(); get('online-grid').hidden = true; }
          }
          if (!latest) { get('online-lobby').close(); audio?.unlock(); get('online-back').hidden = false; get('online-ready').disabled = true; get('online-start').disabled = true; }
          latest = message;
          if (message.recordSummary) recordSummaries[message.stage === 'waiting' ? 'qualifying' : message.stage || 'race'] = message.recordSummary;
          if (message.recordNotice) receiveRecord(message.recordNotice);
          renderImprovement();
          motion.push(message, performance.now());
          if (trackId !== message.track) {
            renderer?.dispose(); trackId = message.track;
            try { renderer = window.createNeuroTrack3D((id) => get('np-' + id), { track: window.createNeuroTrack(trackId), racePresentation: true, showNames: false, quality: get('online-quality').value || 'performance', speedEffects: !window.matchMedia('(prefers-reduced-motion: reduce)').matches }); }
            catch { renderer = null; say('Não foi possível iniciar WebGL.'); menu(); send({ type: 'leave' }); }
          }
          const player = latest.cars.find((car) => car.id === latest.self);
          const introKey = `${latest.raceId}:${latest.stage}`;
          const safeIntro = latest.phase === 'countdown' && latest.countdown > 1
            || latest.stage === 'qualifying' && player.pitExit && !player.done;
          if (introSession !== introKey) {
            intro?.finish(); introSession = introKey; introPrevious = null;
            if (safeIntro && renderer && !document.hidden) intro?.start(window.createNeuroTrack(trackId), latest.stage === 'qualifying');
          }
          if (!safeIntro && intro?.active) intro.finish();
          document.querySelectorAll('.race-shift').forEach((button) => { button.hidden = !player.manual; });
          get('online-ready').hidden = get('online-start').hidden = true;
          get('online-manual').disabled = true;
          get('online-recover').disabled = latest.phase !== 'racing' || player.done || Boolean(player.cooldown || player.pitState);
          get('online-leave').textContent = latest.phase === 'finished' || player.done ? 'Voltar às salas' : 'Abandonar corrida';
          prediction ||= window.createOnlinePrediction(window.createNeuroTrack(trackId));
          prediction.receive(player, latest.phase, performance.now(), rtt);
          const qualifying = latest.stage === 'qualifying' || latest.stage === 'waiting';
          const ranking = [...latest.cars].sort((a, b) => Number(Boolean(a.disconnected)) - Number(Boolean(b.disconnected)) || (qualifying
            ? (a.bestLap ?? Infinity) - (b.bestLap ?? Infinity) || a.id - b.id
            : (a.place || 99) - (b.place || 99) || b.progress - a.progress));
          const nextRankingKey = JSON.stringify(ranking.map((car) => [car.id, car.name, car.disconnected, car.done, car.completedLaps, car.bestLap]));
          if (rankingKey !== nextRankingKey) {
          rankingKey = nextRankingKey;
          get('online-ranking').replaceChildren();
          for (const car of ranking) { const li = document.createElement('li'); li.dataset.self = String(car.id === latest.self); li.textContent = `${car.name} · ${car.disconnected ? 'desconectado' : qualifying ? lapTime(car.bestLap) : car.done ? 'chegou' : `volta ${Math.min(latest.laps, car.completedLaps + 1)}/${latest.laps}`}`; get('online-ranking').append(li); }
          }
          get('online-hud').hidden = false;
          playerPosition = ranking.indexOf(player) + 1;
          updateHUD(player, playerPosition, ranking.length, latest.laps, latest.elapsed, latest.phase);
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
        }
      };
      socket.onclose = () => { clear(); audio?.silence(); resetRoom(); get('online-options').hidden = true; get('online-connect').hidden = false; get('online-connect').disabled = false; say('Conexão encerrada. Reconecte para entrar em uma nova sala.'); menu(); };
      socket.onerror = () => say('Falha na conexão online. Verifique se o backend está ativo.');
    } catch (error) { say(error.message || 'Servidor indisponível.'); get('online-connect').disabled = false; }
  };
  get('online-mode').value = new URLSearchParams(window.location?.search || '').get('mode') === 'tournament' ? 'tournament' : 'race';
  get('online-mode').onchange = () => {
    const tournament = get('online-mode').value === 'tournament';
    get('online-laps').disabled = tournament;
    if (tournament) get('online-laps').value = '3';
  };
  get('online-mode').onchange();
  get('online-create').onclick = () => send({ type: 'create', track: get('online-track').value,
    mode: get('online-mode').value, weather: get('online-weather').value, laps: Number(get('online-laps').value) });
  get('online-join').onsubmit = (event) => { event.preventDefault(); send({ type: 'join', code: get('online-code').value.trim().toUpperCase() }); };
  get('online-ready').onclick = () => { audio?.unlock(); send({ type: 'ready', ready: !ready, manual: get('online-manual').checked }); };
  get('online-manual').onchange = () => { if (room) send({ type: 'ready', ready: false, manual: get('online-manual').checked }); };
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
    if (intro?.active) return;
    if (get('online-lobby').open || ['INPUT', 'SELECT'].includes(event.target.tagName)) return;
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
    if (!latest || latest.phase === 'finished') return;
    const input = { type: 'input' };
    if (!get('online-lobby').open && !intro?.active && !document.hidden) { Object.assign(input, gamepad?.input()); keys.forEach((key) => { input[actions[key]] = true; }); pointers.forEach((key) => { input[key] = true; }); }
    else input.brake = true;
    const encoded = JSON.stringify(input), now = performance.now();
    prediction?.input(input, now);
    // Send changes promptly, with a heartbeat below the server's input timeout.
    if (encoded !== lastInput || now - lastInputAt >= 100) {
      send(input); lastInput = encoded; lastInputAt = now;
    }
  }, 16);
  setInterval(() => { if (socket?.readyState === WebSocket.OPEN && self) send({ type: 'ping', time: performance.now() }); }, 1000);
  function draw() {
    recordNotice?.update();
    const now = performance.now();
    intro?.tick(introPrevious === null ? 0 : Math.min(100, Math.max(0, now - introPrevious)));
    introPrevious = now;
    frames++;
    if (now - measuredAt >= 1000) { fps = Math.round(frames * 1000 / (now - measuredAt)); frames = 0; measuredAt = now; }
    if (latest && renderer && !document.hidden) {
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
      updateHUD(player, playerPosition, cars.length, latest.laps, latest.elapsed, latest.phase);
      const spectator = player.done && latest.stage === 'qualifying' ? cars.find(car => !car.done && !car.pitExit) || player : player;
      renderer.update(cars, player, false, spectator, latest.phase === 'finished'); audio?.update(player, latest, !player.done && !document.hidden);
    }
    requestAnimationFrame(draw);
  }
  menu(); requestAnimationFrame(draw);
})();
