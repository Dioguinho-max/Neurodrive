/* Chuva em camadas, sem criar outro contexto WebGL. */
(() => {
  const host = document.getElementById('weather-rain');
  if (!host) return;
  const canvas = document.createElement('canvas');
  host.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(pointer: coarse), (max-width: 900px)');
  let width = 0, height = 0, drops = [], frame = 0, last = 0, intensity = 0, speed = 0, staticDrawn = false;
  function drop(initial = false) {
    const depth = Math.random();
    return { x: Math.random() * (width + 100), y: initial ? Math.random() * height : -40 - Math.random() * 80,
      depth, fall: 260 + depth * 480, length: 5 + depth * 16, drift: -35 - Math.random() * 35 };
  }
  function resize() {
    width = host.clientWidth; height = host.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, mobile.matches ? 1 : 1.5);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drops = Array.from({ length: Math.max(30, Math.min(mobile.matches ? 85 : 190, Math.round(width * height / 6500))) }, () => drop(true));
    staticDrawn = false;
  }
  function draw(dt) {
    ctx.clearRect(0, 0, width, height);
    const motion = Math.min(1, speed / 3.8);
    for (const particle of drops) {
      if (dt) {
        particle.x += (particle.drift - motion * 55 * particle.depth) * dt;
        particle.y += particle.fall * (1 + motion * .25) * dt;
        if (particle.y > height + 40 || particle.x < -60) Object.assign(particle, drop());
      }
      const length = particle.length * (1 + motion * .25);
      ctx.strokeStyle = `rgba(204,225,236,${(.08 + particle.depth * .25) * intensity})`;
      ctx.lineWidth = .45 + particle.depth * .55;
      ctx.beginPath(); ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(particle.x + length * (.12 + motion * .08), particle.y - length);
      ctx.stroke();
    }
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; last = 0; }
  function tick(now) {
    frame = 0;
    if (!intensity || document.hidden || document.querySelector('dialog[open]')) { stop(); return; }
    if (!last || now - last >= 1000 / 30) {
      draw(last ? Math.min(.05, (now - last) / 1000) : 0); last = now;
    }
    frame = requestAnimationFrame(tick);
  }
  window.NeuroWeather = {
    update(rain, velocity = 0) {
      intensity = Math.max(0, Math.min(1, rain || 0)); speed = Math.max(0, velocity || 0);
      if (!intensity || document.hidden || document.querySelector('dialog[open]')) { stop(); return; }
      if (reduced.matches) { stop(); if (!staticDrawn) { draw(0); staticDrawn = true; } }
      else if (!frame) frame = requestAnimationFrame(tick);
    },
  };
  new ResizeObserver(resize).observe(host);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  reduced.addEventListener('change', () => { staticDrawn = false; stop(); });
  resize();
})();
