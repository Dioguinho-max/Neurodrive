/* Sample-based engine; loaded once, with synthetic fallback if unavailable. */
(() => {
  const base = new URL('assets/engine/', document.currentScript.src);
  window.createNeuroSampleEngine = (context, engineDestination, effectsDestination) => {
    const layers = [], effects = new Set();
    let ready = false, disposed = false, releaseBuffer;
    let previousThrottle = 0, previousGear = null, previousShift = false;
    let lastTime = -Infinity, released = -Infinity, pressure = 0;
    const loading = Promise.all(['low', 'mid', 'high', 'coast', 'release'].map(async name => {
      const response = await fetch(new URL(name + '.wav?v=2', base));
      if (!response.ok) throw Error('Engine audio unavailable');
      return context.decodeAudioData(await response.arrayBuffer());
    })).then(buffers => {
      if (disposed) return;
      for (let i = 0; i < 4; i++) {
        const source = context.createBufferSource(), gain = context.createGain();
        source.buffer = buffers[i]; source.loop = true; gain.gain.value = 0;
        source.connect(gain); gain.connect(engineDestination); source.start();
        layers.push({ source, gain });
      }
      releaseBuffer = buffers[4]; ready = true;
    }).catch(() => { /* The original engine remains available offline/on error. */ });
    function silence() {
      for (const layer of layers) layer.gain.gain.setTargetAtTime(0, context.currentTime, .02);
      for (const source of effects) { try { source.stop(); } catch {} }
      effects.clear(); pressure = 0; previousThrottle = 0; previousGear = null;
      previousShift = false; lastTime = released = -Infinity;
    }
    return {
      loading,
      update(car) {
        if (!ready || disposed) return false;
        const now = context.currentTime, rpm = Math.max(800, Math.min(8000, Number(car.rpm) || 900));
        const throttle = Math.max(0, Math.min(1, Number(car.throttle) || 0));
        const anchors = [1800, 4200, 7200, 3000];
        const weights = rpm < anchors[1]
          ? [1 - Math.max(0, (rpm - anchors[0]) / 2400), Math.max(0, (rpm - anchors[0]) / 2400), 0]
          : [0, 1 - Math.min(1, (rpm - anchors[1]) / 3000), Math.min(1, (rpm - anchors[1]) / 3000)];
        const load = .12 + .88 * throttle;
        weights.push(1 - load);
        layers.forEach((layer, i) => {
          layer.source.playbackRate.setTargetAtTime(Math.max(.1, Math.min(4.5, rpm / anchors[i])), now, .06);
          const weight=i===3?weights[i]:weights[i]*load;
          layer.gain.gain.setTargetAtTime(Math.sqrt(weight) * 1.5, now, .09);
        });
        const shift = !!car.shiftTicks;
        const changed = previousGear !== null && Number.isFinite(car.gear) && car.gear > previousGear;
        if (now - lastTime < .3 && now - released > .75 && pressure > .2 && previousThrottle > .4 &&
          ((throttle < .25) || changed || (shift && !previousShift)) && effects.size < 2) {
          const source = context.createBufferSource(), gain = context.createGain();
          source.buffer = releaseBuffer; gain.gain.value = .22 * pressure;
          source.connect(gain); gain.connect(effectsDestination);
          effects.add(source);
          source.onended = () => { effects.delete(source); source.disconnect(); gain.disconnect(); };
          source.start(); released = now; pressure *= .3;
        }
        const dt = Number.isFinite(lastTime) ? Math.min(.1, Math.max(0, now - lastTime)) : 0;
        pressure += (Math.max(0, (rpm - 2200) / 5800) * throttle - pressure) * (1 - Math.exp(-dt / .35));
        previousThrottle = throttle; previousGear = Number.isFinite(car.gear) ? car.gear : null;
        previousShift = shift; lastTime = now;
        return true;
      },
      silence,
      dispose() { disposed = true; silence(); layers.forEach(({source,gain}) => { source.stop(); source.disconnect(); gain.disconnect(); }); }
    };
  };
})();
