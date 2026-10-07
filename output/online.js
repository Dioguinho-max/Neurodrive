(() => {
  'use strict';
  const get = (id) => document.getElementById(id);
  const updateHUD = window.createRaceHUD(get);
  let socket, self, room, latest, renderer, trackId, ready = false;
  let prediction, rtt = 0, playerPosition = 1;
  let frames = 0, fps = 0, measuredAt = performance.now();
  const motion = window.createOnlineBuffer();
  let rankingKey = '', lastInput = '', lastInputAt = 0;
  let displayedFinish = false;
  const keys = new Set(), pointers = new Map();
  const actions = { KeyW: 'accelerate', ArrowUp: 'accelerate', KeyS: 'brake', ArrowDown: 'brake', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyQ: 'shiftDown', KeyE: 'shiftUp' };
  const audio = window.createNeuroAudio?.();
  const say = (message) => { get('online-message').textContent = message; };
  const send = (data) => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)); };
  function clear() { keys.clear(); pointers.clear(); prediction?.input({ brake: true }, performance.now()); send({ type: 'input', brake: true }); }
  function menu() { clear(); if (!get('online-lobby').open) get('online-lobby').showModal(); }
  function resetRoom() {
    get('online-hud').hidden = true;
    room = null; latest = null; ready = false; displayedFinish = false;
    motion.clear(); rankingKey = ''; lastInput = ''; lastInputAt = 0;
    prediction = null; rtt = 0;
    get('online-ready').disabled = false;
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
        } else if (message.type === 'pong') {
          const measured = Math.max(0, performance.now() - message.time);
          rtt = rtt ? rtt * 0.7 + measured * 0.3 : measured;
          get('online-connection').textContent = `Conexão: ${Math.round(rtt)} ms · Imagem: ${fps} FPS${rtt > 250 ? ' · atraso alto na rede' : ''}`;
        } else if (message.type === 'error') say(message.message);
        else if (message.type === 'left') { resetRoom(); say('Você saiu da sala.'); menu(); }
        else if (message.type === 'lobby') {
          room = message; get('online-options').hidden = true; get('online-room').hidden = false;
          get('online-room-code').textContent = `Sala ${room.code} · ${room.laps} volta(s)`;
          ready = room.players.find((p) => p.id === self)?.ready || false;
          get('online-ready').textContent = ready ? 'Cancelar pronto' : 'Pronto';
          get('online-start').disabled = room.owner !== self || room.players.length < 2 || room.players.some((p) => !p.ready);
          get('online-players').replaceChildren();
          for (const p of room.players) { const li = document.createElement('li'); li.textContent = `${p.name}${p.id === room.owner ? ' · dono' : ''} · ${p.ready ? 'pronto' : 'aguardando'}`; get('online-players').append(li); }
          say('Compartilhe o código com seus amigos.');
        } else if (message.type === 'state') {
          if (!latest) { get('online-lobby').close(); audio?.unlock(); get('online-back').hidden = false; get('online-ready').disabled = true; get('online-start').disabled = true; }
          latest = message; motion.push(message, performance.now());
          if (trackId !== message.track) {
            renderer?.dispose(); trackId = message.track;
            try { renderer = window.createNeuroTrack3D((id) => get('np-' + id), { track: window.createNeuroTrack(trackId), quality: get('online-quality').value || 'performance', speedEffects: !window.matchMedia('(prefers-reduced-motion: reduce)').matches }); }
            catch { renderer = null; say('Não foi possível iniciar WebGL.'); menu(); send({ type: 'leave' }); }
          }
          const player = latest.cars.find((car) => car.id === latest.self);
          prediction ||= window.createOnlinePrediction(window.createNeuroTrack(trackId));
          prediction.receive(player, latest.phase, performance.now(), rtt);
          const ranking = [...latest.cars].sort((a, b) => Number(Boolean(a.disconnected)) - Number(Boolean(b.disconnected)) || (a.place || 99) - (b.place || 99) || b.progress - a.progress);
          const nextRankingKey = JSON.stringify(ranking.map((car) => [car.id, car.name, car.disconnected, car.done, car.completedLaps]));
          if (rankingKey !== nextRankingKey) {
          rankingKey = nextRankingKey;
          get('online-ranking').replaceChildren();
          for (const car of ranking) { const li = document.createElement('li'); li.dataset.self = String(car.id === latest.self); li.textContent = `${car.name} · ${car.disconnected ? 'desconectado' : car.done ? 'chegou' : `volta ${Math.min(latest.laps, car.completedLaps + 1)}/${latest.laps}`}`; get('online-ranking').append(li); }
          }
          get('online-hud').hidden = false;
          playerPosition = ranking.indexOf(player) + 1;
          updateHUD(player, playerPosition, ranking.length, latest.laps, latest.elapsed);
          get('race-banner').textContent = latest.phase === 'countdown' ? latest.countdown : latest.phase === 'finished' ? 'Prova encerrada' : '';
          if (player.done && !displayedFinish || latest.phase === 'finished' && !displayedFinish) { displayedFinish = true; menu(); }
          get('online-reward').textContent = player.rewardPending ? 'Salvando recompensa…' : player.reward !== undefined ? `Recompensa: ${player.reward} moedas. Seu saldo foi salvo na conta.` : latest.phase === 'finished' && !player.done ? 'Prova encerrada pelo limite de tempo. Sem recompensa.' : '';
        }
      };
      socket.onclose = () => { clear(); audio?.silence(); resetRoom(); get('online-options').hidden = true; get('online-connect').hidden = false; get('online-connect').disabled = false; say('Conexão encerrada. Reconecte para entrar em uma nova sala.'); menu(); };
      socket.onerror = () => say('Falha na conexão online. Verifique se o backend está ativo.');
    } catch (error) { say(error.message || 'Servidor indisponível.'); get('online-connect').disabled = false; }
  };
  get('online-create').onclick = () => send({ type: 'create', track: get('online-track').value, laps: Number(get('online-laps').value) });
  get('online-join').onsubmit = (event) => { event.preventDefault(); send({ type: 'join', code: get('online-code').value.trim().toUpperCase() }); };
  get('online-ready').onclick = () => { audio?.unlock(); send({ type: 'ready', ready: !ready, manual: get('online-manual').checked }); };
  get('online-manual').onchange = () => { if (room) send({ type: 'ready', ready: false, manual: get('online-manual').checked }); };
  get('online-start').onclick = () => send({ type: 'start' });
  get('online-leave').onclick = () => send({ type: 'leave' });
  get('online-recover').onclick = () => send({ type: 'recover' });
  get('online-menu').onclick = menu;
  get('online-back').onclick = () => get('online-lobby').close();
  get('online-lobby').oncancel = (event) => { event.preventDefault(); if (latest) get('online-lobby').close(); };
  get('online-sound').onchange = () => audio?.setEnabled(get('online-sound').checked);
  get('online-quality').onchange = () => renderer?.setQuality(get('online-quality').value);
  window.addEventListener('keydown', (event) => {
    if (get('online-lobby').open || ['INPUT', 'SELECT'].includes(event.target.tagName)) return;
    if (actions[event.code]) { event.preventDefault(); keys.add(event.code); }
    if (event.code === 'Escape') menu();
    if (event.code === 'KeyR' && !event.repeat) send({ type: 'recover' });
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  document.querySelectorAll('[data-drive]').forEach((button) => {
    button.onpointerdown = (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); pointers.set(event.pointerId, button.dataset.drive); };
    for (const name of ['onpointerup', 'onpointercancel', 'onlostpointercapture']) button[name] = (event) => pointers.delete(event.pointerId);
  });
  setInterval(() => {
    if (!latest || latest.phase === 'finished') return;
    const input = { type: 'input' };
    if (!get('online-lobby').open && !document.hidden) { keys.forEach((key) => { input[actions[key]] = true; }); pointers.forEach((key) => { input[key] = true; }); }
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
    const now = performance.now();
    frames++;
    if (now - measuredAt >= 1000) { fps = Math.round(frames * 1000 / (now - measuredAt)); frames = 0; measuredAt = now; }
    if (latest && renderer && !document.hidden) {
      const cars = motion.sample(performance.now());
      const index = cars.findIndex((car) => car.id === latest.self);
      const player = prediction?.sample(performance.now()) || cars[index];
      cars[index] = player;
      updateHUD(player, playerPosition, cars.length, latest.laps, latest.elapsed);
      renderer.update(cars, player, false, player); audio?.update(player, latest, !player.done && !document.hidden);
    }
    requestAnimationFrame(draw);
  }
  menu(); requestAnimationFrame(draw);
})();
