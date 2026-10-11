/* Fullscreen is requested from a tap, before starting or resuming mobile play. */
(() => {
  const touch = window.matchMedia('(pointer: coarse)');
  const root = document.documentElement;
  const actions = new Set(['race-menu-play', 'race-menu-resume', 'race-start', 'race-next', 'online-ready', 'online-start', 'online-back']);
  let replaying = false, busy = false, wasFullscreen = Boolean(document.fullscreenElement);
  const gate = document.createElement('dialog');
  gate.className = 'mobile-screen-gate';
  gate.setAttribute('aria-labelledby', 'mobile-screen-title');
  gate.innerHTML = '<h2 id="mobile-screen-title">Jogue em tela cheia</h2><p id="mobile-screen-message">Mais espaço para a pista e os controles.</p><div><button type="button" class="btn" id="mobile-screen-enter">Entrar em tela cheia</button><button type="button" class="btn" id="mobile-screen-fallback">Continuar no navegador</button></div>';
  document.body.append(gate);
  const enter = gate.querySelector('#mobile-screen-enter');
  const fallback = gate.querySelector('#mobile-screen-fallback');
  const message = gate.querySelector('#mobile-screen-message');
  let pending;
  function play() {
    if (gate.open) gate.close();
    const target = pending; pending = null;
    if (target?.isConnected && !target.disabled) {
      replaying = true;
      try { target.click(); } finally { replaying = false; }
    }
  }
  async function launch() {
    if (busy) return;
    busy = true;
    try {
      if (!root.requestFullscreen || !document.fullscreenEnabled) throw new Error('unsupported');
      await root.requestFullscreen({ navigationUI: 'hide' });
      // Orientation support varies; fullscreen still works when locking is unavailable.
      try { await screen.orientation?.lock?.('landscape'); } catch {}
      play();
    } catch {
      message.textContent = 'O navegador não permitiu tela cheia. Tente novamente ou continue no navegador.';
      enter.hidden = !root.requestFullscreen || !document.fullscreenEnabled;
      if (!gate.open) gate.showModal();
      (enter.hidden ? fallback : enter).focus();
    } finally { busy = false; }
  }
  enter.onclick = launch;
  fallback.onclick = play;
  gate.addEventListener('cancel', () => { pending = null; });
  document.addEventListener('click', event => {
    const target = event.target.closest?.('button');
    if (replaying || !touch.matches || document.fullscreenElement || !actions.has(target?.id) || target.disabled) return;
    event.preventDefault(); event.stopImmediatePropagation();
    pending = target; launch();
  }, true);
  document.addEventListener('fullscreenchange', () => {
    const fullscreen = Boolean(document.fullscreenElement);
    if (wasFullscreen && !fullscreen && touch.matches) {
      // Solo pauses; online opens its lobby without freezing the other players.
      const menu = document.getElementById('race-menu-open') || document.getElementById('online-menu');
      menu?.click();
    }
    wasFullscreen = fullscreen;
  });
})();
