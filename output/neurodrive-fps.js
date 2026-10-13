(() => {
  window.createNeuroFPS = (toggle, indicator) => {
    if (!toggle || !indicator) return null;
    const key = 'neurodrive-show-fps';
    let start = null, frames = 0;
    try { toggle.checked = window.localStorage.getItem(key) === 'true'; } catch { toggle.checked = false; }
    function reset() { start = null; frames = 0; indicator.textContent = 'FPS —'; }
    toggle.onchange = () => {
      try { window.localStorage.setItem(key, String(toggle.checked)); } catch {}
      reset(); indicator.hidden = !toggle.checked;
    };
    document.addEventListener('visibilitychange', () => { reset(); indicator.hidden = document.hidden || !toggle.checked; });
    indicator.hidden = !toggle.checked;
    return { tick(now, active = true) {
      indicator.hidden = !toggle.checked || !active || document.hidden;
      if (indicator.hidden) { if (start !== null) reset(); return; }
      if (start === null) { start = now; return; }
      frames++;
      const elapsed = now - start;
      if (elapsed < 500) return;
      const fps = Math.round(frames * 1000 / elapsed);
      indicator.textContent = `${fps} FPS · ${(elapsed / frames).toFixed(1)} ms`;
      indicator.dataset.level = fps < 30 ? 'low' : fps < 50 ? 'medium' : 'good';
      start = now; frames = 0;
    } };
  };
})();
