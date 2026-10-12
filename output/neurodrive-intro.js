(() => {
  window.createNeuroIntro = (get, camera, clear, sound = () => null) => {
    const dialog = get('race-intro');
    let active = false, elapsed = 0, forecastPlayed = false, weatherMode = 'dry';
    function finish() {
      active = false; elapsed = 0; camera(null); clear();
      sound()?.stopIntro?.();
      get('intro-forecast').hidden = true;
      if (dialog.open) dialog.close();
    }
    get('race-intro-skip').onclick = finish;
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(); });
    document.addEventListener?.('visibilitychange', () => { if (document.hidden) sound()?.stopIntro?.(); });
    return {
      get active() { return active; }, finish,
      start(track, qualifying, weather = 'dry') {
        finish();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const mode = ['dry', 'rain', 'changing'].includes(weather) ? weather : 'dry';
        weatherMode = mode; forecastPlayed = false;
        const forecast = {
          dry: ['Tempo seco', 'Tempo firme do início ao fim.', 'Largada: pneus de seco'],
          rain: ['Tempo chuvoso', 'Chuva desde o início da sessão.', 'Largada: pneus de chuva'],
          changing: ['Tempo variável', 'Início seco · chuva gradual · pista secando.', 'Largada: pneus de seco'],
        }[mode];
        get('intro-forecast').setAttribute('data-weather', mode);
        for (const session of ['qualifying', 'race']) {
          const current = (session === 'qualifying') === qualifying;
          get(`intro-forecast-${session}`).setAttribute('data-current', String(current));
          get(`intro-forecast-${session}-now`).hidden = !current;
          get(`intro-forecast-${session}-condition`).textContent = forecast[0];
          get(`intro-forecast-${session}-detail`).textContent = forecast[1];
        }
        get('intro-forecast-tyres').textContent = forecast[2];
        active = true;
        dialog.setAttribute('data-shot', 'overview');
        get('race-intro-title').textContent = track.name;
        get('race-intro-stage').textContent = qualifying ? 'CLASSIFICAÇÃO · CONQUISTE SUA POLE' : 'GRID FORMADO · CADA POSIÇÃO IMPORTA';
        camera(0); dialog.showModal(); get('race-intro-skip').focus();
        sound()?.playIntro?.('overview', mode);
      },
      tick(delta) {
        if (!active) return;
        if (document.hidden) { sound()?.stopIntro?.(); return; }
        elapsed += Math.max(0, delta);
        if (elapsed >= 8000) finish();
        else {
          const flyby = elapsed >= 2400;
          const closeup = elapsed >= 6000;
          if (flyby && !forecastPlayed) {
            forecastPlayed = true;
            sound()?.playIntro?.('forecast', weatherMode);
          }
          dialog.setAttribute('data-shot', closeup ? 'car' : flyby ? 'flyby' : 'overview');
          get('intro-forecast').hidden = !flyby || closeup;
          camera(elapsed / 8000);
        }
      },
    };
  };
})();
