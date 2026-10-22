/* Team messages: one at a time, based on actual session/player state. */
(() => {
  window.createNeuroRadio = (host) => {
    if (!host) return null;
    const audio = window.createNeuroRadioAudio?.();
    const panel = document.createElement('aside');
    panel.className = 'team-radio'; panel.hidden = true;
    panel.setAttribute('role', 'status'); panel.setAttribute('aria-live', 'polite');
    panel.setAttribute('aria-atomic', 'true');
    const label = document.createElement('strong'), text = document.createElement('span');
    label.textContent = 'RÁDIO DA EQUIPE'; panel.append(label, text); host.append(panel);
    let session, seen = new Set(), until = 0, next = 0, active = null;
    return {
      update(car, state, visible = true, now = performance.now()) {
        if (session !== state.key) { audio?.stop(); session = state.key; seen = new Set(); until = 0; next = 0; active = null; }
        if (!car || state.phase !== 'racing' || car.done || state.drift || !visible) { if(active)audio?.stop(); panel.hidden = true; active = null; return; }
        const tyres = `:${car.pitStops || 0}`;
        const candidates = [
          ['puncture' + tyres, car.tyreBurst, 'Pneu furado. Reduza e entre nos boxes.', 3],
          ['worn' + tyres, car.tyreWearEnabled && car.tyreLife <= .25 && !car.pitState && !car.pitRequested, 'Pneus no limite. Planeje uma parada.', 2],
          ['wet', car.tyreCompound === 'dry' && car.wetness > .35 && !car.pitState && !car.pitRequested, 'Pista molhada. Considere pneus de chuva.', 2],
          ['last-lap', !state.qualifying && state.laps > 1 && car.completedLaps === state.laps - 1, 'Última volta. Mantenha o ritmo!', 1],
          ['forecast', car.weatherMode === 'changing' && state.elapsed >= 20 && state.elapsed < 35 && car.rainIntensity < .01, 'Chuva prevista em breve. Prepare sua estratégia.', 1],
          ['rain', car.rainIntensity > .15 && car.rainIntensity < .65 && car.weatherMode === 'changing' && state.elapsed < 90, 'A chuva começou. Cuidado nas frenagens.', 1],
        ];
        const candidate = candidates.find(([key, condition]) => condition && !seen.has(key));
        if (candidate && (now >= next || candidate[3] === 3 && active?.priority !== 3)) {
          seen.add(candidate[0]); text.textContent = candidate[2];
          audio?.play(candidate[2]);
          active = { key:candidate[0], priority:candidate[3] }; until = now + 5500; next = now + 16000;
        }
        if (active && (!candidates.some(([key, condition]) => key === active.key && condition) || now >= until)) { audio?.stop(); active = null; }
        panel.hidden = !active;
      },
      hide() { audio?.stop(); panel.hidden = true; active = null; },
    };
  };
})();
