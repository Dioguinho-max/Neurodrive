/* Mesmo painel de pilotagem nos modos local e online. */
(() => {
  'use strict';
  window.createNeuroCareer = () => {
    const key = 'neurodrive-personal-laps-v1';
    let records = {};
    try {
      const saved = JSON.parse(window.localStorage?.getItem(key) || '{}');
      for (const id of ['serra', 'veloz', 'tecnico']) if (Number.isFinite(saved?.[id]) && saved[id] > 0) records[id] = saved[id];
    } catch {}
    return {
      records,
      record(track, time) {
        if (!['serra', 'veloz', 'tecnico'].includes(track) || !Number.isFinite(time) || time <= 0 || records[track] <= time) return false;
        records[track] = time;
        try { window.localStorage?.setItem(key, JSON.stringify(records)); } catch {}
        return true;
      },
      championship() {
        const totals = new Map(), scored = new Set();
        return { stage: 0, tracks: ['serra', 'veloz', 'tecnico'],
          score(ranking) {
            if (scored.has(this.stage)) return;
            scored.add(this.stage);
            ranking.forEach((car, index) => {
              const entry = totals.get(car.id) || { id: car.id, name: car.name, points: 0, wins: 0 };
              entry.points += [25, 18, 15, 12, 10, 8][index] || 0;
              if (index === 0) entry.wins++;
              totals.set(car.id, entry);
            });
          },
          standings: () => [...totals.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || a.id - b.id),
        };
      },
    };
  };
  // Preferência do dispositivo compartilhada pelos modos local e online.
  window.bindNeuroQuality = (select, apply) => {
    let quality = 'performance';
    try {
      const saved = window.localStorage?.getItem('neurodrive-graphics');
      if (['ultra', 'high', 'performance'].includes(saved)) quality = saved;
    } catch {}
    select.value = quality;
    select.onchange = () => {
      const value = ['ultra', 'high'].includes(select.value) ? select.value : 'performance';
      select.value = value;
      try { window.localStorage?.setItem('neurodrive-graphics', value); } catch {}
      apply(value);
    };
  };
  window.createRaceSignals = (get) => (car, race, active = true) => {
    if (!active) return;
    const banner = get('race-banner');
    const markup = (html) => { if (banner.innerHTML !== html) banner.innerHTML = html; };
    if (race.phase === 'countdown') {
      const count = race.startLights || Math.min(5, Math.max(1, 6 - race.countdown));
      markup(`<span class="start-lights" aria-label="${count} de 5 luzes acesas">${Array.from({ length: 5 }, (_, i) => `<i class="start-light${i < count ? ' lit' : ''}" aria-hidden="true"></i>`).join('')}</span>`);
    } else if (car.done && !car.disconnected && car.place) {
      markup(`<span class="finish-signal"><span class="chequered-flag" aria-hidden="true"></span> BANDEIRADA · ${Number(car.place)}º LUGAR</span>`);
    } else if (race.phase === 'racing' && race.elapsed < 1) {
      banner.textContent = 'VAI!';
    }
  };
  window.createRaceHUD = (get) => {
    const choice = get('race-pit-compound');
    const tyreButtons = [['dry', get('pit-tyre-dry')], ['wet', get('pit-tyre-wet')]];
    function syncTyres() {
      for (const [value, button] of tyreButtons) if (button) {
        button.disabled = Boolean(choice?.disabled);
        button.setAttribute('aria-pressed', String((choice?.value || 'dry') === value));
      }
    }
    for (const [value, button] of tyreButtons) if (button) button.onclick = () => {
      if (!choice || choice.disabled) return;
      choice.value = value; syncTyres();
    };
    return (car, position, total, laps, elapsed, phase = 'racing') => {
    const panel = get('race-pit-panel');
    if (panel) {
      panel.hidden = !car.tyreWearEnabled || car.done || phase === 'finished';
      const life = Math.ceil((car.tyreLife ?? 1) * 100);
      panel.setAttribute('data-condition', car.tyreBurst ? 'burst' : life <= 10 ? 'critical' : life <= 30 ? 'worn' : 'normal');
      get('race-tyres').textContent = car.tyreBurst ? 'PNEU ESTOURADO' : `${car.tyreCompound === 'wet' ? 'Chuva' : 'Seco'} · ${life}%`;
      const compound = get('race-pit-compound');
      if (compound) compound.disabled = Boolean(car.pitState || car.pitRequested);
      syncTyres();
      const weather = get('weather-status'), rain = get('weather-rain');
      if (weather) weather.textContent = car.weatherMode && car.weatherMode !== 'dry'
        ? `${car.rainIntensity ? 'CHUVA' : car.wetness > .05 ? 'SECANDO' : 'TEMPO SECO'} · pista ${Math.round((car.wetness || 0) * 100)}% molhada${car.wetness > .35 && car.tyreCompound !== 'wet' ? ' · Troque para pneus de chuva!' : ''}` : '';
      if (rain) { rain.style.opacity = String(car.rainIntensity || 0); rain.setAttribute('data-active', String(Boolean(car.rainIntensity))); }
      window.NeuroWeather?.update(car.rainIntensity, car.speed);
      get('race-tyre-life').value = life;
      get('race-pit-status').textContent = car.pitState === 'service'
        ? `Troca de pneus · ${Math.ceil(car.pitTimer / 60)} s`
        : car.pitState ? 'Piloto automático · limite 60 km/h'
        : car.tyreBurst ? `Direção comprometida · ${car.pitRequested ? 'boxes chamados' : 'chame os boxes (B)'}`
        : car.pitRequested ? 'Parada solicitada · entrada após a largada'
        : life <= 10 ? 'Pneus no limite! Troque antes de chegar a 0%.'
        : life <= 30 ? 'Aderência reduzida · planeje sua parada'
        : `${car.pitStops || 0} parada(s) · desgaste ativo`;
      const button = get('race-pit-request');
      button.disabled = phase !== 'racing' || Boolean(car.pitState || car.cooldown || car.done);
      button.textContent = car.pitState ? 'Equipe trabalhando' : car.pitRequested ? 'Cancelar parada (B)' : 'Chamar boxes (B)';
    }
    const rpm = Math.max(0, Math.min(8000, Number(car.rpm) || 0));
    get('race-rpm-fill').setAttribute('stroke-dashoffset', String(100 - rpm / 80));
    get('race-instruments').setAttribute('data-redline', String(rpm >= 6300));
    get('race-rpm').textContent = `${Math.round(rpm / 100) * 100} rpm`;
    get('race-gear').textContent = String(car.gear || 1);
    get('race-drive-mode').textContent = car.manual ? 'MANUAL' : 'AUTO';
    get('race-speed').textContent = String(Math.max(0, Math.round(car.speed * 54)));
    get('race-position').textContent = `${position} / ${total}`;
    get('race-lap').textContent = `${Math.max(1, Math.min(laps, car.completedLaps + 1))} / ${laps}`;
    get('race-time').textContent = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toFixed(2).padStart(5, '0')}`;
    };
  };
})();
