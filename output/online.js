(() => {
  'use strict';
  const get = (id) => document.getElementById(id);
  let socket, self, room, latest, previous, arrived = 0, renderer, trackId, ready = false;
  let displayedFinish = false;
  const keys = new Set(), pointers = new Map();
  const actions = { KeyW: 'accelerate', ArrowUp: 'accelerate', KeyS: 'brake', ArrowDown: 'brake', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyQ: 'shiftDown', KeyE: 'shiftUp' };
  const audio = window.createNeuroAudio?.();
  const say = (message) => { get('online-message').textContent = message; };
  const send = (data) => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)); };
  function clear() { keys.clear(); pointers.clear(); send({ type: 'input', brake: true }); }
  function menu() { clear(); if (!get('online-lobby').open) get('online-lobby').showModal(); }
  function resetRoom() {
    room = null; latest = null; previous = null; ready = false; displayedFinish = false;
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
          previous = latest; latest = message; arrived = performance.now();
          if (trackId !== message.track) {
            renderer?.dispose(); trackId = message.track;
            try { renderer = window.createNeuroTrack3D((id) => get('np-' + id), { track: window.createNeuroTrack(trackId), speedEffects: !window.matchMedia('(prefers-reduced-motion: reduce)').matches }); }
            catch { renderer = null; say('Não foi possível iniciar WebGL.'); menu(); send({ type: 'leave' }); }
          }
          const player = latest.cars.find((car) => car.id === latest.self);
          const ranking = [...latest.cars].sort((a, b) => Number(Boolean(a.disconnected)) - Number(Boolean(b.disconnected)) || (a.place || 99) - (b.place || 99) || b.progress - a.progress);
          get('online-ranking').replaceChildren();
          for (const car of ranking) { const li = document.createElement('li'); li.dataset.self = String(car.id === latest.self); li.textContent = `${car.name} · ${car.disconnected ? 'desconectado' : car.done ? 'chegou' : `volta ${Math.min(latest.laps, car.completedLaps + 1)}/${latest.laps}`}`; get('online-ranking').append(li); }
          get('online-hud').textContent = `${Math.round(player.speed * 54)} km/h · ${player.gear}ª · ${ranking.indexOf(player) + 1}º · ${latest.elapsed.toFixed(1)} s`;
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
    send(input);
  }, 40);
  function draw() {
    if (latest && renderer) {
      const alpha = Math.min(1, (performance.now() - arrived) / 50);
      const cars = latest.cars.map((car) => {
        const old = previous?.cars.find((p) => p.id === car.id);
        if (!old || Math.hypot(old.x - car.x, old.y - car.y) > 40) return car;
        return { ...car, x: old.x + (car.x - old.x) * alpha, y: old.y + (car.y - old.y) * alpha,
          angle: old.angle + Math.atan2(Math.sin(car.angle - old.angle), Math.cos(car.angle - old.angle)) * alpha };
      });
      const player = cars.find((car) => car.id === latest.self);
      renderer.update(cars, player, false, player); audio?.update(player, latest, !player.done && !document.hidden);
    }
    requestAnimationFrame(draw);
  }
  menu(); requestAnimationFrame(draw);
})();
