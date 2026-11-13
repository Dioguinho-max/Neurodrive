/* Mapa 2D compartilhado: traçado em cache e posições a 10 Hz, sem renderizador 3D. */
(() => {
  'use strict';
  window.createNeuroMinimap = (host, toggle) => {
    if (!host || !toggle) return null;
    const canvas = document.createElement('canvas'), background = document.createElement('canvas');
    const ctx = canvas.getContext('2d'), base = background.getContext('2d');
    if (!ctx || !base) return null;
    canvas.width = background.width = 528; canvas.height = background.height = 320;
    ctx.scale(2, 2); base.scale(2, 2);
    canvas.setAttribute('role', 'img');
    const panel = document.createElement('aside'); panel.className = 'race-minimap'; panel.hidden = true;
    const legend = document.createElement('small');
    panel.append(canvas, legend); host.appendChild(panel);
    const key = 'neurodrive-minimap';
    try { const saved = localStorage.getItem(key); toggle.checked = saved === null ? true : saved === 'true'; }
    catch { toggle.checked = true; }
    let cached = null, source = null, last = -Infinity, scale = 1, ox = 0, oy = 0;
    const x = value => value * scale + ox, y = value => value * scale + oy;
    const text = value => window.NeuroI18n?.t(value) || value;
    function labels() { canvas.setAttribute('aria-label', text('Minimapa do circuito')); legend.textContent = text('Verde: você · Branco: rivais · Amarelo: boxes'); }
    labels(); window.addEventListener('neurodrive:language', labels);
    toggle.addEventListener('change', () => { try { localStorage.setItem(key, String(toggle.checked)); } catch {} last = -Infinity; if (!toggle.checked) panel.hidden = true; });
    function setTrack(input) {
      if (input === source) return;
      source = input; cached = typeof input === 'string' ? window.createNeuroTrack(input) : input;
      const xs = cached.points.map(p => p.x), ys = cached.points.map(p => p.y);
      const b = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
      const w = Math.max(1, b.maxX - b.minX), h = Math.max(1, b.maxY - b.minY);
      scale = Math.min(238 / w, 134 / h); ox = (264 - w * scale) / 2 - b.minX * scale; oy = (160 - h * scale) / 2 - b.minY * scale;
      base.clearRect(0, 0, 264, 160); base.beginPath();
      cached.points.forEach((p, i) => base[i ? 'lineTo' : 'moveTo'](x(p.x), y(p.y)));
      base.closePath(); base.lineJoin = 'round'; base.lineWidth = 11; base.strokeStyle = '#071820'; base.stroke();
      base.lineWidth = 5; base.strokeStyle = '#c2d3d8'; base.stroke();
      const start = cached.pointAt(0), entry = cached.pointAt(cached.pit.entry, cached.halfWidth);
      base.strokeStyle = '#ffffff'; base.lineWidth = 2; base.beginPath();
      base.moveTo(x(start.x) - Math.sin(start.angle) * 6, y(start.y) + Math.cos(start.angle) * 6);
      base.lineTo(x(start.x) + Math.sin(start.angle) * 6, y(start.y) - Math.cos(start.angle) * 6); base.stroke();
      base.fillStyle = '#f7ca65'; base.fillRect(x(entry.x) - 3, y(entry.y) - 3, 6, 6);
      last = -Infinity;
    }
    return {
      update(track, cars, playerId, active) {
        panel.hidden = !active || !toggle.checked || document.hidden;
        if (panel.hidden || !track) return;
        setTrack(track);
        const now = performance.now(); if (now - last < 100) return; last = now;
        ctx.clearRect(0, 0, 264, 160); ctx.drawImage(background, 0, 0, 264, 160);
        for (const car of cars) {
          if (!car || car.id === playerId || car.disconnected || !Number.isFinite(car.x + car.y)) continue;
          ctx.fillStyle = '#071820'; ctx.beginPath(); ctx.arc(x(car.x), y(car.y), 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = car.done ? '#798891' : '#f3f6fa'; ctx.beginPath(); ctx.arc(x(car.x), y(car.y), 3.2, 0, Math.PI * 2); ctx.fill();
        }
        const player = cars.find(car => car?.id === playerId);
        if (player && Number.isFinite(player.x + player.y + player.angle)) {
          ctx.save(); ctx.translate(x(player.x), y(player.y)); ctx.rotate(player.angle);
          ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -6); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6); ctx.closePath();
          ctx.lineWidth = 2; ctx.strokeStyle = '#071a20'; ctx.stroke(); ctx.fillStyle = '#9cf2c8'; ctx.fill(); ctx.restore();
        }
      },
      hide() { panel.hidden = true; last = -Infinity; },
      dispose() { window.removeEventListener('neurodrive:language', labels); panel.remove(); }
    };
  };
})();
