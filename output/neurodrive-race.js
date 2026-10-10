/* Interface da corrida. O motor de regras também pode ser testado sem navegador. */
(() => {
  'use strict';
  const get = (id) => document.getElementById(id);
  const updateHUD = window.createRaceHUD(get);
  const updateSignals = window.createRaceSignals(get);
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
  window.bindNeuroQuality(get('race-quality'), (quality) => renderer?.setQuality(quality));
  let started = false;
  let paused = false;
  let accumulator = 0;
  let previousTime = null;
  let lastTimingUpdate = -1;
  let lastTimingPhase = '';
  let resultsPresented = false;
  let resultsReturnRemaining = null;
  let resultsReturnScheduled = false;
  function returnToMenu() {
    resultsReturnRemaining = null;
    get('race-results-return').hidden = true;
    openMenu();
    window.NeuroGarage?.showPage('race');
    get('menu-mode').focus();
  }
  let finale = null;
  function clearFinale() {
    finale = null;
    get('race-finale').hidden = true;
    renderer?.setFinishCamera?.(false);
    renderer?.setCeremony?.(null);
  }
  function updateFinale(ranking) {
    const player = race.cars[0];
    const waiting = started && race.qualifying && player.done && race.phase !== 'finished';
    if (!finale && !waiting) { get('race-finale').hidden = true; return; }
    const overlay = get('race-finale');
    overlay.hidden = false;
    overlay.setAttribute('data-stage', waiting ? 'waiting' : 'finished');
    overlay.setAttribute('data-ceremony', String(!race.qualifying && Boolean(finale)));
    get('race-banner').textContent = '';
    get('finale-eyebrow').textContent = `${track.name} · ${race.qualifying ? 'CLASSIFICAÇÃO' : 'BANDEIRADA FINAL'}`;
    const position = ranking.indexOf(player) + 1;
    if (waiting) {
      const remaining = race.cars.filter((car) => !car.done).length;
      get('finale-title').textContent = 'Suas voltas estão registradas';
      get('finale-detail').textContent = `${player.bestLap === null ? 'Sem volta válida' : `Melhor volta ${timeLabel(player.bestLap)}`} · ${remaining} pilotos em pista. Acompanhe os últimos tempos ou encerre a sessão.`;
      get('finale-skip').textContent = 'Encerrar classificação e definir grid';
      get('finale-progress-fill').style.width = '0%';
    } else {
      const reveal = finale.elapsed >= 2200;
      get('finale-title').textContent = race.qualifying
        ? reveal ? (player.bestLap === null ? 'Grid definido' : position === 1 ? 'POLE POSITION' : `Você larga em ${position}º`) : 'Bandeira quadriculada'
        : reveal ? (player.place === 1 ? 'VITÓRIA!' : `${player.place}º LUGAR`) : 'Linha de chegada cruzada';
      get('finale-detail').textContent = race.qualifying
        ? `${player.bestLap === null ? 'Sem volta válida · largada no fim do grid' : `Melhor volta · ${timeLabel(player.bestLap)}`} · Prepare-se para a corrida`
        : `${race.laps} voltas · Tempo final ${timeLabel(player.finishTime ?? race.elapsed)} · ${player.place <= 3 ? 'Seu lugar no pódio está garantido' : 'Cada disputa conta. A próxima largada espera por você'}`;
      get('finale-skip').textContent = race.qualifying ? 'Ver grid de largada' : 'Ver pódio e resultados';
      const duration = race.qualifying ? 6000 : 12000;
      if (!race.qualifying) {
        get('finale-title').textContent = finale.elapsed < 5000 ? 'Chegada ao pódio' : 'Os três melhores';
        get('finale-detail').textContent = ranking.slice(0, 3).map((car, i) => `${i + 1}º ${car.name}`).join(' · ');
      }
      get('finale-progress-fill').style.width = `${Math.min(100, finale.elapsed / duration * 100)}%`;
      if (finale.elapsed >= duration && !get('race-menu').open) showResults();
    }
  }
  get('finale-skip').onclick = () => {
    if (race.qualifying && race.phase !== 'finished') get('race-end-qualifying').onclick();
    else showResults();
  };
  const career = window.createNeuroCareer();
  let sessionBestBefore = career.records[track.id] ?? null;
  let championship = null;
  let recordNoticeUntil = 0;
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
    get('race-menu').close();
    clearFinale();
    clearInput();
    const ranking = race.standings();
    get('race-results-stage').textContent = `${track.name} · ${race.qualifying ? 'Classificação encerrada' : `🏁 Bandeirada · ${race.cars[0].place}º lugar`}`;
    get('race-results-title').textContent = race.qualifying ? 'Grid de largada definido' : 'Os três primeiros';
    get('race-results-note').textContent = race.qualifying
      ? 'A melhor volta válida de cada piloto define a ordem da largada. Pilotos sem tempo ficam no fim do grid.'
      : 'Resultado ao encerrar a prova do jogador. Quem ainda estava em pista é ordenado pelo progresso e não recebe um tempo de chegada.';
    get('race-results-improvement').textContent = window.NeuroAchievements?.improvement(sessionBestBefore === null ? null : Math.round(sessionBestBefore * 1000), race.cars[0].bestLap === null ? null : Math.round(race.cars[0].bestLap * 1000)) || '';
    get('race-results-rows').innerHTML = get('race-ranking').innerHTML;
    get('race-results-table').hidden = !race.qualifying;
    get('race-podium').hidden = race.qualifying;
    get('race-podium').innerHTML = race.qualifying ? '' : [1, 0, 2].map((index) => {
      const car = ranking[index];
      return `<div class="podium-place" data-place="${index + 1}"><strong>${index + 1}º</strong>${car.name}<span>${car.done ? timeLabel(car.finishTime) : 'Em pista'}</span></div>`;
    }).join('');
    get('race-results-continue').hidden = false;
    get('race-results-continue').textContent = race.qualifying ? 'Ir para a corrida' : 'Ver classificação completa';
    get('race-results-close').textContent = race.qualifying ? 'Voltar à pista' : 'Voltar ao menu';
    if (!race.qualifying && !resultsReturnScheduled) {
      resultsReturnScheduled = true;
      resultsReturnRemaining = 10000;
      get('race-results-return').textContent = 'Voltando ao menu em 10 segundos. Você poderá rever estes resultados pelo menu.';
    }
    get('race-results-return').hidden = resultsReturnRemaining === null;
    get('championship-next').hidden = !championship || race.qualifying || championship.stage >= 2;
    get('championship-results').hidden = !championship || race.qualifying;
    if (championship && !race.qualifying) {
      const standings = championship.standings();
      const title = championship.stage === 2 ? `Campeão: ${standings[0].name}` : `Campeonato · etapa ${championship.stage + 1} de 3`;
      get('championship-results').innerHTML = `<h3>${title}</h3><ol>${standings.map((entry) => `<li>${entry.name} — ${entry.points} pontos · ${entry.wins} vitórias</li>`).join('')}</ol><p>Empates: vitórias, depois ordem inicial dos pilotos.</p>`;
    }
    if (!get('race-results').open) get('race-results').showModal();
  }

  get('race-show-results').onclick = showResults;
  get('championship-next').onclick = () => {
    if (!championship || race.qualifying || race.phase !== 'finished' || championship.stage >= 2) return;
    const series = championship;
    series.stage++;
    get('race-track').value = series.tracks[series.stage];
    get('race-track').onchange();
    championship = series;
    startSession(true);
  };
  get('race-results-close').onclick = () => { if (race.qualifying) get('race-results').close(); else returnToMenu(); };
  get('race-results').oncancel = (event) => {
    if (!race.qualifying) { event.preventDefault(); returnToMenu(); }
  };
  get('race-results-continue').onclick = () => {
    if (race.qualifying) {
      get('race-results').close();
      startSession(false);
    } else {
      get('race-podium').hidden = true;
      get('race-results-table').hidden = false;
      get('race-results-title').textContent = 'Classificação de todos os pilotos';
      if (resultsReturnRemaining !== null) resultsReturnRemaining = 10000;
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
    resultsReturnRemaining = null;
    get('race-results-return').hidden = true;
    get('race-menu').setAttribute('data-state', started ? 'pause' : 'home');
    get('menu-state-title').textContent = started ? 'PAUSA · RESPIRE. VOLTE MAIS FORTE.' : 'SEU PRÓXIMO DESAFIO COMEÇA AQUI';
    setPause(true);
    clearInput();
    audio?.silence();
    get('race-results').close();
    for (const name of ['track', 'difficulty', 'laps']) get(`menu-${name}`).value = get(`race-${name}`).value;
    get('race-menu-resume').hidden = !started;
    window.NeuroGarage?.showPage(started ? 'pause' : 'race');
    get('race-menu-resume').textContent = race.phase === 'finished' ? 'Voltar aos resultados' : 'Continuar sessão';
    get('race-menu-restart-note').hidden = !started;
    get('race-menu-status').textContent = !renderer ? 'Não foi possível iniciar o 3D. Use um navegador com WebGL ou explore o Laboratório de IA.'
      : started ? `${track.name} · ${race.phase === 'finished' ? 'Sessão encerrada' : 'Sessão pausada — seu progresso está salvo nesta página'}` : 'Seu próximo grid começa aqui.';
    get('race-menu-play').disabled = !renderer;
    get('menu-records').textContent = 'Recordes deste navegador: ' + window.NeuroTracks.map((circuit) =>
      `${circuit.name}: ${career.records[circuit.id] ? timeLabel(career.records[circuit.id]) : 'sem volta registrada'}`).join(' · ');
    get('menu-end-qualifying').hidden = !started || !race.qualifying || race.phase === 'finished';
    get('menu-recover').hidden = !started || race.phase !== 'racing' || race.cars[0].pitExit || Boolean(race.cars[0].pitState);
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
  get('menu-new-event').onclick = () => {
    get('menu-state-title').textContent = 'ESCOLHA SEU PRÓXIMO DESAFIO';
    window.NeuroGarage?.showPage('race');
    get('menu-mode').focus();
  };
  get('menu-pause-settings').onclick = () => {
    window.NeuroGarage?.showPage('settings');
    get('race-transmission').focus();
  };
  get('menu-back-pause').onclick = openMenu;
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
    const series = get('menu-mode').value === 'championship' ? career.championship() : null;
    if (series) get('race-track').value = series.tracks[0];
    get('race-track').onchange();
    championship = series;
    if (renderer) startSession(true);
    else openMenu();
  };

  function refresh() {
    const player = race.cars[0];
    if (started && career.record(track.id, player.bestLap)) recordNoticeUntil = Date.now() + 10000;
    const recordNotice = Date.now() < recordNoticeUntil ? `Novo recorde pessoal! ${timeLabel(career.records[track.id])}` : '';
    if (get('race-personal-best').textContent !== recordNotice) get('race-personal-best').textContent = recordNotice;
    player.skin = window.NeuroGarage?.getSkin() || null;
    const spectator = started && race.qualifying && player.done && race.phase !== 'finished'
      ? race.cars.find((car) => !car.done && !car.pitExit) || player : player;
    if (finale && !race.qualifying) renderer?.setCeremony?.(race.standings(), finale.elapsed);
    renderer?.update(race.cars, player, false, spectator, race.phase === 'finished');
    const ranking = race.standings();
    updateHUD(player, ranking.indexOf(player) + 1, ranking.length, race.laps, race.elapsed, race.phase);
    get('race-laps').disabled = started && !race.qualifying && race.phase !== 'finished';
    audio?.update(player, race, started && !paused);
    get('race-speed-lines').style.opacity = String(Math.max(0, player.speed / player.maxSpeed - 0.55) * 0.5);
    const qualifying = race.qualifying;
    get('race-ranking-title').textContent = qualifying ? 'Melhores voltas · ordem do grid' : 'Classificação da corrida';
    const playerBest = player.bestLap === null ? 'sem tempo válido' : timeLabel(player.bestLap);
    const phaseLabel = qualifying ? 'Classificação' : 'Corrida';
    const lapLabel = player.completedLaps === 0 ? 'aquecimento' : `tentativa ${Math.min(2, player.completedLaps)}/2`;
    get('race-session').textContent = `${track.name} · ${(track.length / 4000).toFixed(2)} km · ${phaseLabel}`
      + (qualifying ? ` · ${lapLabel} · melhor: ${playerBest}${player.invalidLap ? ' · VOLTA INVALIDADA' : ''}` : ` · ${race.laps} voltas`);
    const banner = !started ? 'Pronto para largar?' : paused ? 'Pausado'
      : player.pitExit ? (player.pitWait > 0 ? 'Aguardando liberação dos boxes' : 'Saída automática dos boxes · limite 60 km/h')
      : player.pitReleasedAt !== undefined && race.elapsed - player.pitReleasedAt < 3 ? 'Você está no controle · volta de aquecimento'
      : race.phase === 'countdown' ? String(race.countdown)
      : race.phase === 'finished' ? (qualifying ? 'Grid definido · pronto para a corrida' : `${player.place}º lugar · ${timeLabel(player.finishTime)}`)
      : qualifying && player.done ? 'Aguardando os tempos dos adversários…'
      : player.cooldown ? 'Retornando à pista…' : race.elapsed < 1 ? 'VAI!' : '';
    const signaling = started && !paused && !player.pitExit && (race.phase === 'countdown' || player.done && player.place);
    if (!signaling && get('race-banner').textContent !== banner) get('race-banner').textContent = banner;
    updateSignals(player, race, started && !paused && !player.pitExit);
    refreshTiming(ranking);
    get('race-end-qualifying').disabled = !started || !qualifying || race.phase === 'finished';
    get('race-recover').disabled = !started || player.pitExit || player.pitState || race.phase === 'finished';
    get('race-next').disabled = !qualifying || race.phase !== 'finished';
    if (qualifying && race.phase === 'finished') qualifyingGrid = race.gridOrder();
    get('race-show-results').hidden = race.phase !== 'finished';
    if (race.phase === 'finished') {
      get('race-pause').disabled = true;
      get('race-recover').disabled = true;
      if (!resultsPresented) {
        resultsPresented = true;
        if (!qualifying && championship) championship.score(ranking);
        if (!qualifying) window.NeuroGarage?.finishRace({ elapsed: race.elapsed, completedLaps: player.completedLaps, place: player.place });
        clearInput();
        finale = { elapsed: 0 };
        renderer?.setFinishCamera?.(true);
      }
    }
    updateFinale(ranking);
  }

  function startSession(qualifying) {
    sessionBestBefore = career.records[track.id] ?? null;
    resultsReturnRemaining = null;
    resultsReturnScheduled = false;
    get('race-results-return').hidden = true;
    clearFinale();
    recordNoticeUntil = 0;
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
      transmission: get('race-transmission').value, pitStart: qualifying,
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
    resultsReturnRemaining = null;
    resultsReturnScheduled = false;
    get('race-results-return').hidden = true;
    clearFinale();
    championship = null;
    recordNoticeUntil = 0;
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
  get('race-pause').onclick = () => { if (paused) resumeFromMenu(); else openMenu(); refresh(); };
  get('race-pit-request').onclick = () => { if (started && !paused) race.requestPit(1); };
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
    if (event.code === 'KeyP') get('race-pause').onclick();
    if (event.code === 'KeyB' && !event.repeat && started && !paused) race.requestPit(1);
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
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    const release = (event) => {
      touches.delete(event.pointerId);
      button.setAttribute('aria-pressed', String([...touches.values()].includes(button.dataset.drive)));
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });

  function initializeRenderer() {
    window.NeuroGarage?.setPreviewFactory?.(null);
    renderer?.dispose?.();
    renderer = null;
    try {
    renderer = window.createNeuroTrack3D((id) => get(`np-${id}`), {
      track,
      racePresentation: true,
      quality: get('race-quality').value,
      speedEffects: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    });
    get('race-start').disabled = false;
    window.NeuroGarage?.setPreviewFactory?.((canvas) => renderer.createPreview(canvas));
  } catch (error) {
    get('race-message').textContent = 'Não foi possível iniciar o 3D. Use um navegador com WebGL ou abra o Laboratório para a versão 2D.';
    get('race-start').disabled = true;
    console.warn(error);
    }
  }
  initializeRenderer();

  const gamepad = window.createNeuroGamepad?.({
    menu: openMenu,
    back: (dialog) => {
      const back = get('menu-back-pause');
      if (dialog === get('race-menu') && !back.hidden) back.click();
      else dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    },
    pit: () => get('race-pit-request').click(),
    recover: () => get('menu-recover').click(),
    disconnect: () => { if (started) openMenu(); },
  });
  function frame(time) {
    const delta = previousTime === null ? 0 : Math.min(time - previousTime, 100);
    previousTime = time;
    if (resultsReturnRemaining !== null && get('race-results').open && !document.hidden) {
      resultsReturnRemaining -= Math.max(0, delta);
      get('race-results-return').textContent = `Voltando ao menu em ${Math.max(0, Math.ceil(resultsReturnRemaining / 1000))} segundos. Você poderá rever estes resultados pelo menu.`;
      if (resultsReturnRemaining <= 0) returnToMenu();
    }
    if (finale && !get('race-menu').open && !document.hidden) finale.elapsed += Math.max(0, delta);
    if (started && !paused && race.phase !== 'finished') {
      accumulator += delta;
      const input = { ...gamepad?.input() };
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
