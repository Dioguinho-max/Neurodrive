/* Original garage loop. Generated once, no audio work on the rendering loop. */
(() => {
  const menu = document.getElementById('race-menu');
  const button = document.getElementById('menu-music');
  const volume = document.getElementById('menu-music-volume');
  if (!menu || !button || !volume) return;
  let context, gain, buffer, source, enabled = true;
  try { enabled = localStorage.getItem('neurodrive-menu-music') !== 'off'; } catch {}
  button.setAttribute('aria-pressed', String(enabled));
  try { volume.value = String(Math.max(0, Math.min(100, Number(localStorage.getItem('neurodrive-menu-volume') ?? 20)))); } catch {}
  function compose() {
    const rate = 22050, beat = 60 / 108, duration = beat * 32;
    const result = context.createBuffer(1, Math.ceil(duration * rate), rate), samples = result.getChannelData(0);
    function note(start, length, frequency, amplitude, kind) {
      for (let i = 0, count = Math.floor(length * rate); i < count; i++) {
        const t = i / rate, envelope = Math.min(1, t / .012) * Math.pow(1 - i / count, 2);
        let wave;
        if (kind === 'kick') wave = Math.sin(2 * Math.PI * (45 * t + 7 * (1 - Math.exp(-30 * t)))) * Math.exp(-t * 9);
        else if (kind === 'hat') wave = (Math.random() * 2 - 1) * Math.exp(-t * 65);
        else if (kind === 'snare') wave = ((Math.random() * 2 - 1) * .65 + Math.sin(t * 1100) * .35) * Math.exp(-t * 20);
        else wave = Math.sin(t * frequency * Math.PI * 2) + .22 * Math.sin(t * frequency * Math.PI * 4);
        samples[(Math.floor(start * rate) + i) % samples.length] += wave * envelope * amplitude;
      }
    }
    const bass = [55, 55, 43.65, 49], melody = [0,7,12,7,3,7,10,7];
    for (let bar = 0; bar < 8; bar++) {
      const root = bass[Math.floor(bar / 2)], at = bar * beat * 4;
      for (let step = 0; step < 8; step++) {
        const time = at + step * beat / 2;
        note(time, .07, 0, .13, 'hat');
        if (step % 2 === 0 || step === 7) note(time, beat * .65, root, .25);
        if (step === 0 || step === 4 || step === 6) note(time, .25, 0, .6, 'kick');
        if (step === 2 || step === 6) note(time, .18, 0, .25, 'snare');
        note(time, beat * 1.2, root * 4 * 2 ** (melody[(step + bar) % 8] / 12), .065);
      }
      for (const interval of [0, 3, 7]) note(at, beat * 4, root * 2 * 2 ** (interval / 12), .045);
    }
    for (let i = 0; i < samples.length; i++) samples[i] = Math.tanh(samples[i]) * .7;
    return result;
  }
  function stop() { if (source) { source.stop(); source.disconnect(); source = null; } }
  function sync() {
    if (!enabled || !context || document.hidden || !menu.open) { stop(); return; }
    if (source) return;
    buffer ||= compose();
    source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
    source.connect(gain); gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(Number(volume.value) / 100, context.currentTime + .3);
    source.start();
  }
  async function unlock() {
    if (!enabled || document.hidden || !menu.open) return;
    try {
        context ||= new (window.AudioContext || window.webkitAudioContext)();
        if (!gain) { gain = context.createGain(); gain.connect(context.destination); }
        await context.resume();
      sync();
    } catch { stop(); }
  }
  button.onclick = async () => {
    // Enabled by default can still mean waiting for browser audio permission.
    // Only turn off when audio is actually running; otherwise this click starts it.
    enabled = !(source && context?.state === 'running');
    button.setAttribute('aria-pressed', String(enabled));
    try { localStorage.setItem('neurodrive-menu-music', enabled ? 'on' : 'off'); } catch {}
    if (enabled) await unlock(); else stop();
  };
  const activate = event => {
    if (event.target?.closest?.('#menu-music') || event.repeat || source && context?.state === 'running') return;
    return unlock();
  };
  document.addEventListener('pointerdown', activate);
  document.addEventListener('keydown', activate);
  volume.oninput = () => {
    if (gain) gain.gain.setTargetAtTime(Number(volume.value) / 100, context.currentTime, .08);
    try { localStorage.setItem('neurodrive-menu-volume', volume.value); } catch {}
  };
  new MutationObserver(sync).observe(menu, { attributes:true, attributeFilter:['open'] });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { stop(); context?.close(); context = null; gain = null; });
})();
