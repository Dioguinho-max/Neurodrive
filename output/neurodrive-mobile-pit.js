(() => {
  const panel = document.getElementById('race-pit-panel');
  if (!panel) return;
  // Secondary fingers do not reliably generate click while a pedal is held.
  // Activate touch/pen directly, retaining click for mouse and keyboard.
  function bindAction(button, action) {
    let lastTouch = -Infinity;
    button.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      if (button.disabled) return;
      event.preventDefault();
      lastTouch = performance.now();
      action();
    });
    button.onclick = event => {
      if (button.disabled || event?.pointerType === 'touch' || event?.pointerType === 'pen') return;
      if (event?.detail > 0 && performance.now() - lastTouch < 800) return;
      action();
    };
    button.addEventListener('contextmenu', event => event.preventDefault());
  }
  const toggle = document.createElement('button');
  toggle.id = 'mobile-pit-toggle'; toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'mobile-pit-options');
  const title = document.createElement('strong'), status = document.createElement('span');
  toggle.append(title, status);
  const options = document.createElement('div');
  options.id = 'mobile-pit-options'; options.hidden = true;
  options.setAttribute('role', 'group'); options.setAttribute('aria-label', 'Escolha o pneu e chame os boxes');
  const buttons = ['dry', 'wet'].map(compound => {
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = compound === 'dry' ? 'Boxes · Seco' : 'Boxes · Chuva';
    button.setAttribute('data-compound', compound); options.append(button);
    bindAction(button, () => {
      const request = document.getElementById('race-pit-request');
      if (request.disabled || requested || busyUntil > performance.now()) return;
      document.getElementById('race-pit-compound').value = compound;
      close(); busyUntil = performance.now() + 1000;
      request.click();
    });
    return button;
  });
  panel.append(toggle, options);
  let requested = false, busyUntil = 0;
  function close() { options.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
  bindAction(toggle, () => {
    if (busyUntil > performance.now()) return;
    if (requested) {
      busyUntil = performance.now() + 1000;
      document.getElementById('race-pit-request').click(); close(); return;
    }
    options.hidden = !options.hidden;
    toggle.setAttribute('aria-expanded', String(!options.hidden));
  });
  document.addEventListener('pointerdown', event => {
    // Steering/pedals may be pressed or changed while choosing tires.
    if (!panel.contains(event.target) && !event.target.closest?.('[data-drive]')) close();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  const mobile = window.matchMedia('(pointer: coarse), (max-width: 900px)');
  mobile.addEventListener('change', close);
  window.NeuroMobilePit = {
    update(car, phase) {
      requested = Boolean(car.pitRequested);
      const disabled = phase !== 'racing' || Boolean(car.pitState || car.cooldown || car.done || car.pitExit);
      toggle.disabled = disabled;
      title.textContent = car.pitState ? 'Nos boxes' : requested ? 'Cancelar boxes' : 'Boxes';
      status.textContent = car.tyreBurst ? 'PNEU ESTOURADO' : `${car.tyreCompound === 'wet' ? 'Chuva' : 'Seco'} · ${Math.ceil((car.tyreLife ?? 1) * 100)}%`;
      for (const button of buttons) button.disabled = disabled || requested;
      if (disabled || requested || panel.hidden) close();
    },
  };
})();
