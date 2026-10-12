(() => {
  window.createNeuroEasterEgg = (root, canDrive) => {
    const overlay = document.createElement('img');
    overlay.className = 'et-cockpit'; overlay.alt = ''; overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true'); overlay.draggable = false;
    let enabled = false, ready = false, pendingE = -Infinity, renderer;
    overlay.onload = () => { ready = true; sync(); };
    overlay.onerror = () => { ready = false; enabled = false; sync(); };
    root.append(overlay);
    function sync() {
      const visible = enabled && ready && canDrive();
      overlay.hidden = !visible;
      renderer?.setCockpit?.(visible);
    }
    return {
      keydown(event) {
        if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
        if (!canDrive() || event.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) {
          pendingE = -Infinity; return;
        }
        const now = performance.now();
        if (event.code === 'KeyT' && now - pendingE < 1200) {
          enabled = !enabled; pendingE = -Infinity;
          if (enabled && !overlay.getAttribute('src')) overlay.src = 'assets/et-cockpit.png';
          sync();
        } else pendingE = event.code === 'KeyE' ? now : -Infinity;
      },
      update(nextRenderer) { renderer = nextRenderer; sync(); },
      reset() { enabled = false; pendingE = -Infinity; sync(); },
    };
  };
})();
