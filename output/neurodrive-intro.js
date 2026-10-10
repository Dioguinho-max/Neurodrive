(() => {
  window.createNeuroIntro = (get, camera, clear) => {
    const dialog = get('race-intro');
    let active = false, elapsed = 0;
    function finish() {
      active = false; elapsed = 0; camera(null); clear();
      if (dialog.open) dialog.close();
    }
    get('race-intro-skip').onclick = finish;
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(); });
    return {
      get active() { return active; }, finish,
      start(track, qualifying) {
        finish();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        active = true;
        get('race-intro-title').textContent = track.name;
        get('race-intro-stage').textContent = qualifying ? 'CLASSIFICAÇÃO · CONQUISTE SUA POLE' : 'GRID FORMADO · CADA POSIÇÃO IMPORTA';
        camera(0); dialog.showModal(); get('race-intro-skip').focus();
      },
      tick(delta) {
        if (!active || document.hidden) return;
        elapsed += Math.max(0, delta);
        if (elapsed >= 5500) finish();
        else camera(elapsed / 5500);
      },
    };
  };
})();
