/* Som sintetizado localmente com Web Audio: não exige arquivos ou downloads. */
(() => {
  'use strict';
  window.createNeuroAudio = function createNeuroAudio() {
    let context, master, engineGain, filter, low, high;
    let enabled = true, volume = 0.3;
    let lastCountdown = null;
    let tireGain, tireFilter, impactGain, lastImpact = 0;

    async function unlock() {
      if (!enabled) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      try {
        if (!context) {
          context = new AudioContext();
          master = context.createGain();
          master.gain.value = volume;
          const compressor = context.createDynamicsCompressor();
          master.connect(compressor);
          compressor.connect(context.destination);
          filter = context.createBiquadFilter();
          filter.type = 'lowpass';
          engineGain = context.createGain();
          engineGain.gain.value = 0;
          low = context.createOscillator();
          high = context.createOscillator();
          // Grave do virabrequim + pulsos de combustão com poucos harmônicos.
          // Remove a serra aguda e a oitava desafinada do timbre anterior.
          low.type = 'triangle';
          high.setPeriodicWave(context.createPeriodicWave(
            new Float32Array([0, 0, 0, 0, 0, 0]),
            new Float32Array([0, 1, 0.38, 0.16, 0.07, 0.025]),
          ));
          const bassMix = context.createGain();
          const exhaustMix = context.createGain();
          bassMix.gain.value = 0.75;
          exhaustMix.gain.value = 0.4;
          low.connect(bassMix);
          high.connect(exhaustMix);
          bassMix.connect(filter);
          exhaustMix.connect(filter);
          filter.connect(engineGain);
          engineGain.connect(master);
          low.start();
          high.start();
          const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
          const noise = context.createBufferSource();
          noise.buffer = buffer; noise.loop = true;
          tireFilter = context.createBiquadFilter(); tireFilter.type = 'bandpass'; tireFilter.Q.value = 1.8;
          tireGain = context.createGain(); tireGain.gain.value = 0;
          noise.connect(tireFilter); tireFilter.connect(tireGain); tireGain.connect(master);
          const impactFilter = context.createBiquadFilter(); impactFilter.type = 'lowpass'; impactFilter.frequency.value = 220;
          impactGain = context.createGain(); impactGain.gain.value = 0;
          noise.connect(impactFilter); impactFilter.connect(impactGain); impactGain.connect(master);
          noise.start();
        }
        await context.resume();
        return context.state === 'running';
      } catch { return false; }
    }

    function silence() {
      if (!context) return;
      const now = context.currentTime;
      engineGain.gain.cancelScheduledValues(now);
      engineGain.gain.setTargetAtTime(0, now, 0.015);
      for (const gain of [tireGain, impactGain]) {
        gain?.gain.cancelScheduledValues(now); gain?.gain.setTargetAtTime(0, now, 0.015);
      }
      lastImpact = 0;
      // Também interrompe um bip em andamento ao pausar ou perder foco.
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0, now, 0.015);
    }

    function beep(frequency, duration) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start();
      oscillator.stop(now + duration);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }

    function update(car, race, active) {
      if (!context || context.state !== 'running') return;
      if (!enabled || !active || race.phase === 'finished' || car.done || car.cooldown) {
        silence();
        return;
      }
      const now = context.currentTime;
      master.gain.setTargetAtTime(volume, now, 0.02);
      if (tireGain) {
        const speed = Math.min(1, (car.speed || 0) / 3);
        const grip = Math.max(0, Math.min(1, ((car.gripUsage || 0) - 0.95) / 0.7));
        const hardBrake = (car.activations?.[2]?.[1] || 0) < -0.85 ? Math.max(0, speed - 0.65) * 0.8 : 0;
        const level = race.phase === 'racing' && !car.offRoad && !car.pitExit ? Math.max(grip, hardBrake) * speed * 0.14 : 0;
        tireGain.gain.setTargetAtTime(level, now, 0.08);
        tireFilter.frequency.setTargetAtTime(850 + grip * 1100, now, 0.08);
        const impact = car.impact || 0;
        if (impact > 0.08 && impact > lastImpact + 0.04 && race.phase === 'racing') {
          impactGain.gain.cancelScheduledValues(now);
          impactGain.gain.setValueAtTime(impact * 0.65, now);
          impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        }
        lastImpact = impact;
      }
      const combustionFrequency = car.rpm / 60 * 2;
      low.frequency.setTargetAtTime(car.rpm / 60, now, 0.035);
      high.frequency.setTargetAtTime(combustionFrequency, now, 0.025);
      filter.frequency.setTargetAtTime(260 + car.rpm * 0.12 + car.throttle * 300, now, 0.04);
      // O corte interrompe a pulsação do motor; a troca reduz a carga e o giro.
      const cut = car.limiter && now % 0.12 < 0.04;
      const level = cut ? 0.04 : car.shiftTicks ? 0.045 : 0.11 + car.throttle * 0.10;
      engineGain.gain.setTargetAtTime(level, now, car.limiter ? 0.008 : 0.02);
      const countdown = race.phase === 'countdown' && !car.pitExit ? (race.startLights ? 6 - race.startLights : race.countdown) : 0;
      if (countdown !== lastCountdown) {
        if (countdown > 0) beep(540, 0.13);
        else if (lastCountdown !== null && lastCountdown > 0) beep(1080, 0.3);
        lastCountdown = countdown;
      }
    }

    return {
      unlock, update, silence,
      setEnabled(value) { enabled = Boolean(value); if (!enabled) silence(); },
      setVolume(value) { volume = Math.max(0, Math.min(1, Number(value) || 0)); },
      dispose() { if (context) { silence(); context.close(); context = null; } },
    };
  };
})();
