/* Standard browser gamepads: shared by solo and online. */
(() => {
  'use strict';
  const axis = value => Number.isFinite(value) && Math.abs(value) > .18
    ? Math.sign(value) * Math.min(1, (Math.abs(value) - .18) / .82) : 0;
  window.readNeuroGamepad = pad => {
    const value = i => Math.max(0, Math.min(1, Number(pad.buttons[i]?.value) || 0));
    const pressed = i => Boolean(pad.buttons[i]?.pressed || value(i) > .5);
    const steering = pressed(14) ? -1 : pressed(15) ? 1 : axis(pad.axes[0]);
    const throttle = value(7) > .05 ? value(7) : 0;
    const braking = value(6) > .05 ? value(6) : 0;
    return { steering: Math.round(steering * 100) / 100, throttle: Math.round(throttle * 100) / 100,
      braking: Math.round(braking * 100) / 100, shiftDown: pressed(4), shiftUp: pressed(5),
      confirm: pressed(0), back: pressed(1), pit: pressed(2), recover: pressed(3), menu: pressed(9),
      direction: pressed(12) || pad.axes[1] < -.55 ? 'up' : pressed(13) || pad.axes[1] > .55 ? 'down'
        : pressed(14) || pad.axes[0] < -.55 ? 'left' : pressed(15) || pad.axes[0] > .55 ? 'right' : '' };
  };
  window.createNeuroGamepad = options => {
    let input = {}, previous = {}, activeIndex = null, armed = false, nextRepeat = 0, lastDirection = '';
    let focused = null, lastScope = null;
    const hint = document.createElement('p');
    hint.className = 'gamepad-hint'; hint.hidden = true; hint.setAttribute('role', 'status');
    document.body.append(hint);
    const visible = element => element && !element.disabled && !element.closest('[hidden], [inert]') && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
    const focus = element => {
      focused?.classList.remove('gamepad-focus'); focused = element;
      element?.classList.add('gamepad-focus'); element?.focus({ preventScroll: true });
      element?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    const clear = () => { input = {}; armed = false; previous = {}; };
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
    document.addEventListener('pointerdown', () => { focused?.classList.remove('gamepad-focus'); });
    function navigate(scope, direction) {
      const elements = [...scope.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex="0"]')].filter(visible);
      if (!elements.length) return;
      let index = elements.indexOf(document.activeElement);
      const current = elements[index];
      if (current?.id === 'garage-preview-canvas' && (direction === 'left' || direction === 'right')) {
        current.dispatchEvent(new KeyboardEvent('keydown', { key: direction === 'left' ? 'ArrowLeft' : 'ArrowRight', bubbles: true }));
        return;
      }
      if (current && (direction === 'left' || direction === 'right') && (current.tagName === 'SELECT' || current.type === 'range')) {
        const step = direction === 'left' ? -1 : 1;
        if (current.tagName === 'SELECT') {
          let next = current.selectedIndex + step;
          while (current.options[next]?.disabled) next += step;
          if (next >= 0 && next < current.options.length) current.selectedIndex = next;
        } else current.value = Math.max(Number(current.min || 0), Math.min(Number(current.max || 100), Number(current.value) + step * Number(current.step || 1)));
        current.dispatchEvent(new Event('input', { bubbles: true }));
        current.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      index = index < 0 ? 0 : (index + (direction === 'up' || direction === 'left' ? -1 : 1) + elements.length) % elements.length;
      focus(elements[index]);
    }
    function tick(now) {
      requestAnimationFrame(tick);
      if (document.hidden || !document.hasFocus()) { clear(); return; }
      let pads;
      try { pads = [...(navigator.getGamepads?.() || [])].filter(pad => pad?.connected && pad.mapping === 'standard'); }
      catch { clear(); return; }
      const pad = pads.find(pad => pad.index === activeIndex) || pads[0];
      if (!pad) {
        if (activeIndex !== null) { options.disconnect?.(); hint.textContent = 'Controle desconectado. Use o teclado ou reconecte.'; }
        activeIndex = null; clear(); return;
      }
      if (activeIndex !== pad.index) { activeIndex = pad.index; clear(); }
      const state = window.readNeuroGamepad(pad);
      const scope = [...document.querySelectorAll('dialog[open]')].at(-1);
      const hintHost = scope || document.body;
      if (hint.parentElement !== hintHost) hintHost.append(hint);
      const ps = /playstation|dualsense|dualshock|054c|sony/i.test(pad.id);
      hint.hidden = !scope;
      hint.textContent = scope ? (ps ? 'Direcional: navegar · ✕ confirmar · ○ voltar · ← → ajustar · R2/L2: acelerar/frear · Options: menu' : 'Direcional: navegar · A confirmar · B voltar · ← → ajustar · RT/LT: acelerar/frear · Start: menu') : '';
      // Release controls after reconnecting or returning from another window.
      if (!armed) {
        armed = !Object.values(state).some(Boolean); previous = state; input = {}; return;
      }
      const edge = key => state[key] && !previous[key];
      if (scope) {
        input = {};
        if (!visible(document.activeElement) || !scope.contains(document.activeElement)) navigate(scope, 'down');
        else if (scope !== lastScope) focus(document.activeElement);
        if (state.direction && (state.direction !== lastDirection || now >= nextRepeat)) {
          navigate(scope, state.direction); nextRepeat = now + (state.direction !== lastDirection ? 350 : 140);
        }
        if (edge('confirm') && visible(document.activeElement)) {
          const element = document.activeElement;
          if (element.tagName !== 'SELECT') element.click();
        }
        if (edge('back') || edge('menu')) options.back?.(scope);
      } else {
        input = { steering: state.steering, throttle: state.throttle, braking: state.braking, shiftUp: state.shiftUp, shiftDown: state.shiftDown };
        if (edge('menu')) { input = {}; options.menu?.(); }
        if (edge('pit')) options.pit?.();
        if (edge('recover')) options.recover?.();
      }
      lastScope = scope; lastDirection = state.direction; previous = state;
    }
    requestAnimationFrame(tick);
    return { input: () => input };
  };
})();
