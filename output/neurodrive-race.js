/* Interface da corrida. O motor de regras também pode ser testado sem navegador. */
(() => {
  'use strict';
  const get = (id) => document.getElementById(id);
  // Ferramentas de inspeção são opt-in e não aparecem para o jogador.
  get('race-developer').hidden = !new URLSearchParams(window.location?.search || '').has('dev');
  const audio = window.createNeuroAudio?.();
  function unlockAudio() {
    audio?.unlock().then((ready) => {
      get('race-audio-status').textContent = ready === false ? 'Áudio indisponível; o jogo continua sem som.' : '';
    });
  }
  get('race-sound').onchange = () => {
    audio?.setEnabled(get('race-sound').checked);
    if (get('race-sound').checked) unlockAudio();
  };
  get('race-volume').oninput = () => audio?.setVolume(Number(get('race-volume').value) / 100);
  let track = window.NeuroTrack;
  let race = window.createNeuroRace(track, 'normal', { session: 'qualifying' });
  let qualifyingGrid = null;
  let sessionDifficulty = 'normal';
  let renderer;
  let started = false;
  let paused = false;
  let accumulator = 0;
  let previousTime = null;
  let lastTimingUpdate = -1;
  let lastTimingPhase = '';
  let resultsPresented = false;
  const announcedLaps = new Map();
  const heldKeys = new Set();
  const touches = new Map();
  const keyActions = {
    KeyW: 'accelerate', ArrowUp: 'accelerate',
    KeyS: 'brake', ArrowDown: 'brake',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    KeyE: 'shiftUp', KeyQ: 'shiftDown',
  };

  function timeLabel(time) {
    const minutes = Math.floor(time / 60);
    return `${minutes}:${(time % 60).toFixed(2).padStart(5, '0')}`;
  }

  function clearInput() {
    heldKeys.clear();
    touches.clear();
    document.querySelectorAll('[data-drive]').forEach((button) => button.setAttribute('aria-pressed', 'false'));
  }

  function refreshTiming(ranking) {
    // Dez atualizações por segundo bastam para leitura, sem recriar a tabela a 60 Hz.
    const timingPhase = `${race.phase}/${paused}`;
    if (lastTimingPhase === timingPhase && race.elapsed - lastTimingUpdate < 0.1) return;
    lastTimingPhase = timingPhase;
    lastTimingUpdate = race.elapsed;
    const leader = ranking[0];
    const tower = [];
    get('race-tower-title').textContent = race.qualifying ? 'CLASSIFICAÇÃO · MELHOR VOLTA' : `CORRIDA · ${race.laps} VOLTAS`;
    get('race-timing-note').textContent = race.qualifying
      ? 'Diferença para a melhor volta da sessão. Aquecimento e voltas inválidas não entram no melhor tempo.'
      : 'Diferença medida na passagem pelo último checkpoint comum com o líder; na chegada, usa o tempo final. — indica dados insuficientes. Tempo total para em cada chegada.';
    get('race-ranking').innerHTML = ranking.map((car, index) => {
      let difference = '—';
      if (race.qualifying) {
        if (car.bestLap !== null && leader.bestLap !== null) difference = index === 0 ? 'Pole' : `+${(car.bestLap - leader.bestLap).toFixed(2)} s`;
      } else if (index === 0) difference = 'Líder';
      else if (car.done && leader.done) difference = `+${(car.finishTime - leader.finishTime).toFixed(2)} s`;
      else {
        const checkpoint = Math.min(car.checkpoint, leader.checkpoint);
        if (checkpoint > 0 && Number.isFinite(car.checkpointTimes[checkpoint]) && Number.isFinite(leader.checkpointTimes[checkpoint])) {
          const gap = car.checkpointTimes[checkpoint] - leader.checkpointTimes[checkpoint];
          difference = gap >= 0 ? `+${gap.toFixed(2)} s` : '—';
        }
      }
      const last = car.lastLap === null ? '—' : timeLabel(car.lastLap);
      const best = car.bestLap === null ? '—' : timeLabel(car.bestLap);
      const towerTime = race.qualifying ? best : index === 0 ? timeLabel(car.finishTime ?? race.elapsed) : difference;
      tower.push(`<li data-player="${car.player}"><span>${index + 1}</span><strong>${car.name}</strong><span class="tower-time">${towerTime}</span></li>`);
      const state = car.done ? 'Concluído' : !started ? 'Aguardando' : paused ? 'Pausado' : race.phase === 'countdown' ? 'Largada'
        : race.phase === 'finished' ? 'Em pista ao encerrar' : car.cooldown ? 'Reposicionando' : car.invalidLap ? 'Volta inválida' : 'Em pista';
      return `<tr data-player="${car.player}"><td>${index + 1}</td><th scope="row">${car.name}</th>
        <td>${car.done ? race.laps : Math.max(1, Math.min(race.laps, car.completedLaps + 1))} / ${race.laps}</td>
        <td>${last}${car.lastLapKind && car.lastLapKind !== 'válida' ? `<span class="lap-note">${car.lastLapKind}</span>` : ''}</td>
        <td>${best}</td><td>${timeLabel(car.finishTime ?? race.elapsed)}</td><td>${difference}</td><td>${state}</td></tr>`;
    }).join('');
    get('race-tower-list').innerHTML = tower.join('');
    const updates = ranking.filter((car) => car.completedLaps > (announcedLaps.get(car.id) || 0));
    if (updates.length) {
      get('race-timing-announcement').textContent = updates.map((car) =>
        `${car.name}: volta ${car.completedLaps}, ${timeLabel(car.lastLap)}, ${car.lastLapKind}.`).join(' ');
      updates.forEach((car) => announcedLaps.set(car.id, car.completedLaps));
    }
  }

  function showResults() {
    if (race.phase !== 'finished') return;
    clearInput();
    const ranking = race.standings();
    get('race-results-stage').textContent = `${track.name} · ${race.qualifying ? 'Classificação encerrada' : 'Bandeirada'}`;
    get('race-results-title').textContent = race.qualifying ? 'Grid de largada definido' : 'Os três primeiros';
    get('race-results-note').textContent = race.qualifying
      ? 'A melhor volta válida de cada piloto define a ordem da largada. Pilotos sem tempo ficam no fim do grid.'
      : 'Resultado ao encerrar a prova do jogador. Quem ainda estava em pista é ordenado pelo progresso e não recebe um tempo de chegada.';
    get('race-results-rows').innerHTML = get('race-ranking').innerHTML;
    get('race-results-table').hidden = !race.qualifying;
    get('race-podium').hidden = race.qualifying;
    get('race-podium').innerHTML = race.qualifying ? '' : [1, 0, 2].map((index) => {
      const car = ranking[index];
      return `<div class="podium-place" data-place="${index + 1}"><strong>${index + 1}º</strong>${car.name}<span>${car.done ? timeLabel(car.finishTime) : 'Em pista'}</span></div>`;
    }).join('');
    get('race-results-continue').hidden = false;
    get('race-results-continue').textContent = race.qualifying ? 'Ir para a corrida' : 'Ver classificação completa';
    if (!get('race-results').open) get('race-results').showModal();
  }

  get('race-show-results').onclick = showResults;
  get('race-results-close').onclick = () => get('race-results').close();
  get('race-results-continue').onclick = () => {
    if (race.qualifying) {
      get('race-results').close();
      startSession(false);
    } else {
      get('race-podium').hidden = true;
      get('race-results-table').hidden = false;
      get('race-results-title').textContent = 'Classificação de todos os pilotos';
      get('race-results-continue').hidden = true;
      get('race-results-close').focus();
    }
  };

  function setPause(value) {
    if (!started || race.phase === 'finished') return;
    paused = value;
    if (paused) audio?.silence();
    else unlockAudio();
    accumulator = 0;
    clearInput();
    get('race-pause').textContent = paused ? 'Continuar (P)' : 'Pausar (P)';
  }

  function openMenu() {
    setPause(true);
    clearInput();
    audio?.silence();
    get('race-results').close();
    for (const name of ['track', 'difficulty', 'laps']) get(`menu-${name}`).value = get(`race-${name}`).value;
    get('race-menu-resume').hidden = !started;
    get('race-menu-resume').textContent = race.phase === 'finished' ? 'Voltar aos resultados' : 'Continuar sessão';
    get('race-menu-restart-note').hidden = !started;
    get('race-menu-status').textContent = !renderer ? 'Não foi possível iniciar o 3D. Use um navegador com WebGL ou explore o Laboratório de IA.'
      : started ? `${track.name} · ${race.phase === 'finished' ? 'Sessão encerrada' : 'Sessão pausada — seu progresso está salvo nesta página'}` : 'Seu próximo grid começa aqui.';
    get('race-menu-play').disabled = !renderer;
    get('menu-end-qualifying').hidden = !started || !race.qualifying || race.phase === 'finished';
    get('menu-recover').hidden = !started || race.phase !== 'racing';
    if (!get('race-menu').open) get('race-menu').showModal();
    get(started ? 'race-menu-resume' : 'race-menu-play').focus();
  }

  function resumeFromMenu() {
    if (!started) return;
    get('race-menu').close();
    setPause(false);
    refresh();
    if (race.phase === 'finished') showResults();
    else get('race-menu-open').focus();
  }
  get('race-menu-open').onclick = openMenu;
  get('menu-end-qualifying').onclick = () => {
    get('race-menu').close();
    get('race-end-qualifying').onclick();
  };
  get('menu-recover').onclick = () => {
    resumeFromMenu();
    race.recoverPlayer();
  };
  get('race-menu-resume').onclick = resumeFromMenu;
  get('race-menu').oncancel = (event) => { event.preventDefault(); resumeFromMenu(); };
  get('race-menu-play').onclick = () => {
    if (!renderer) return;
    for (const name of ['track', 'difficulty', 'laps']) get(`race-${name}`).value = get(`menu-${name}`).value;
    get('race-track').onchange();
    if (renderer) startSession(true);
    else openMenu();
  };

  function refresh() {
    const player = race.cars[0];
    player.skin = window.NeuroGarage?.getSkin() || null;
    renderer?.update(race.cars, player, false, player);
    const ranking = race.standings();
    get('race-position').textContent = `${ranking.indexOf(player) + 1} / 6`;
    get('race-lap').textContent = `${Math.min(race.laps, Math.max(1, player.completedLaps + 1))} / ${race.laps}`;
    get('race-laps').disabled = started && !race.qualifying && race.phase !== 'finished';
    get('race-speed').textContent = `${Math.round(player.speed * 54)} km/h`;
    get('race-grip').textContent = player.offRoad ? 'No gramado' : player.sliding ? 'Saindo de frente' : 'Normal';
    get('race-rpm').textContent = `${Math.round(player.rpm)} rpm`;
    get('race-gear').textContent = `${player.gear}ª · ${player.manual ? 'MANUAL' : 'AUTO'}${player.limiter ? ' · CORTE' : player.shiftTicks ? ' · trocando' : ''}`;
    audio?.update(player, race, started && !paused);
    get('race-rpm-needle').setAttribute('transform', `rotate(${player.rpm / 8000 * 180} 120 115)`);
    get('race-speed-lines').style.opacity = String(Math.max(0, player.speed / player.maxSpeed - 0.55) * 0.5);
    get('race-time').textContent = timeLabel(race.elapsed);
    const qualifying = race.qualifying;
    get('race-ranking-title').textContent = qualifying ? 'Melhores voltas · ordem do grid' : 'Classificação da corrida';
    const playerBest = player.bestLap === null ? 'sem tempo válido' : timeLabel(player.bestLap);
    const phaseLabel = qualifying ? 'Classificação' : 'Corrida';
    const lapLabel = player.completedLaps === 0 ? 'aquecimento' : `tentativa ${Math.min(2, player.completedLaps)}/2`;
    get('race-session').textContent = `${track.name} · ${(track.length / 4000).toFixed(2)} km · ${phaseLabel}`
      + (qualifying ? ` · ${lapLabel} · melhor: ${playerBest}${player.invalidLap ? ' · VOLTA INVALIDADA' : ''}` : ` · ${race.laps} voltas`);
    const banner = !started ? 'Pronto para largar?' : paused ? 'Pausado'
      : race.phase === 'countdown' ? String(race.countdown)
      : race.phase === 'finished' ? (qualifying ? 'Grid definido · pronto para a corrida' : `${player.place}º lugar · ${timeLabel(player.finishTime)}`)
      : qualifying && player.done ? 'Aguardando os tempos dos adversários…'
      : player.cooldown ? 'Retornando à pista…' : race.elapsed < 1 ? 'VAI!' : '';
    if (get('race-banner').textContent !== banner) get('race-banner').textContent = banner;
    refreshTiming(ranking);
    get('race-end-qualifying').disabled = !started || !qualifying || race.phase === 'finished';
    get('race-next').disabled = !qualifying || race.phase !== 'finished';
    if (qualifying && race.phase === 'finished') qualifyingGrid = race.gridOrder();
    get('race-show-results').hidden = race.phase !== 'finished';
    if (race.phase === 'finished') {
      get('race-pause').disabled = true;
      get('race-recover').disabled = true;
      if (!resultsPresented) {
        resultsPresented = true;
        if (!qualifying) window.NeuroGarage?.finishRace({ elapsed: race.elapsed, completedLaps: player.completedLaps, place: player.place });
        showResults();
      }
    }
  }

  function startSession(qualifying) {
    get('race-menu').close();
    unlockAudio();
    get('race-results').close();
    resultsPresented = false;
    if (qualifying) {
      sessionDifficulty = get('race-difficulty').value;
      qualifyingGrid = null;
    }
    race = window.createNeuroRace(track, sessionDifficulty, {
      session: qualifying ? 'qualifying' : 'race', grid: qualifyingGrid, laps: Number(get('race-laps').value),
      transmission: get('race-transmission').value,
    });
    get('race-reward').textContent = qualifying ? 'A classificação define o grid. As moedas são concedidas na corrida.' : '';
    get('race-reward-retry').hidden = true;
    window.NeuroGarage?.beginRace(qualifying ? null : { track: track.id, laps: race.laps });
    started = true;
    paused = false;
    accumulator = 0;
    lastTimingUpdate = -1;
    announcedLaps.clear();
    clearInput();
    get('race-start').textContent = 'Reiniciar classificação';
    get('race-pause').textContent = 'Pausar (P)';
    get('race-pause').disabled = false;
    get('race-recover').disabled = false;
    refresh();
  }
  get('race-start').onclick = () => startSession(true);
  get('race-transmission').onchange = () => {
    race.setTransmission(get('race-transmission').value);
    document.querySelectorAll('.race-shift').forEach((button) => { button.hidden = get('race-transmission').value !== 'manual'; });
    try { window.localStorage?.setItem('neurodrive-transmission', get('race-transmission').value); } catch {}
  };
  try {
    const saved = window.localStorage?.getItem('neurodrive-transmission');
    if (['manual', 'automatic'].includes(saved)) get('race-transmission').value = saved;
  } catch {}
  get('race-transmission').onchange();
  get('race-end-qualifying').onclick = () => {
    race.endQualifying();
    paused = false;
    clearInput();
    refresh();
  };
  get('race-next').onclick = () => {
    if (race.qualifying && race.phase === 'finished') startSession(false);
  };
  get('race-track').onchange = () => {
    get('race-results').close();
    resultsPresented = false;
    track = window.createNeuroTrack(get('race-track').value);
    race = window.createNeuroRace(track, get('race-difficulty').value, { session: 'qualifying' });
    started = false;
    paused = false;
    qualifyingGrid = null;
    accumulator = 0;
    lastTimingUpdate = -1;
    announcedLaps.clear();
    clearInput();
    get('race-start').textContent = 'Iniciar classificação';
    get('race-pause').disabled = true;
    get('race-recover').disabled = true;
    initializeRenderer();
    refresh();
  };
  get('race-pause').onclick = () => { setPause(!paused); refresh(); };
  get('race-recover').onclick = () => { if (!paused) race.recoverPlayer(); };

  window.addEventListener('keydown', (event) => {
    if (get('race-menu').open || get('race-results').open) return;
    if (event.code === 'Escape' && !event.repeat) { event.preventDefault(); openMenu(); return; }
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName)) return;
    if (keyActions[event.code] && started) {
      event.preventDefault();
      if (!paused) heldKeys.add(event.code);
      if (!event.repeat) unlockAudio();
    }
    if (event.repeat) return;
    if (event.code === 'KeyP') setPause(!paused);
    if (event.code === 'KeyR' && started && !paused) race.recoverPlayer();
  });
  window.addEventListener('keyup', (event) => heldKeys.delete(event.code));
  window.addEventListener('blur', () => setPause(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPause(true); });

  document.querySelectorAll('[data-drive]').forEach((button) => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('pointerdown', (event) => {
      if (!started || paused) return;
      unlockAudio();
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      touches.set(event.pointerId, button.dataset.drive);
      button.setAttribute('aria-pressed', 'true');
    });
    const release = (event) => {
      touches.delete(event.pointerId);
      button.setAttribute('aria-pressed', 'false');
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });

  function initializeRenderer() {
    renderer?.dispose?.();
    renderer = null;
    try {
    renderer = window.createNeuroTrack3D((id) => get(`np-${id}`), {
      track,
      speedEffects: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    });
    get('race-start').disabled = false;
  } catch (error) {
    get('race-message').textContent = 'Não foi possível iniciar o 3D. Use um navegador com WebGL ou abra o Laboratório para a versão 2D.';
    get('race-start').disabled = true;
    console.warn(error);
    }
  }
  initializeRenderer();

  function frame(time) {
    const delta = previousTime === null ? 0 : Math.min(time - previousTime, 100);
    previousTime = time;
    if (started && !paused && race.phase !== 'finished') {
      accumulator += delta;
      const input = {};
      heldKeys.forEach((key) => { input[keyActions[key]] = true; });
      touches.forEach((action) => { input[action] = true; });
      while (accumulator >= 1000 / 60) {
        race.step(input);
        accumulator -= 1000 / 60;
      }
    }
    refresh();
    requestAnimationFrame(frame);
  }

  refresh();
  openMenu();
  requestAnimationFrame(frame);
})();
