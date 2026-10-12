/* Som sintetizado localmente com Web Audio: não exige arquivos ou downloads. */
(() => {
  'use strict';
  window.createNeuroAudio = function createNeuroAudio() {
    let context, master, engineGain, filter, low, high;
    let rainSource, rainGain;
    let enabled = true, volume = 0.3;
    let lastCountdown = null;

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
      if (rainGain) {
        rainGain.gain.cancelScheduledValues(now);
        rainGain.gain.setTargetAtTime(0, now, 0.03);
      }
      // Também interrompe um bip em andamento ao pausar ou perder foco.
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0, now, 0.015);
    }

    function updateRain(car, now) {
      const intensity = Math.max(0, Math.min(1, Number(car.rainIntensity) || 0));
      if (!rainSource && intensity > 0) {
        // A quiet, filtered rain bed. No tire noise, impacts or sharp droplets.
        const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        rainSource = context.createBufferSource();
        rainSource.buffer = buffer;
        rainSource.loop = true;
        const highpass = context.createBiquadFilter();
        highpass.type = 'highpass'; highpass.frequency.value = 900; highpass.Q.value = 0.5;
        const lowpass = context.createBiquadFilter();
        lowpass.type = 'lowpass'; lowpass.frequency.value = 4800; lowpass.Q.value = 0.5;
        rainGain = context.createGain(); rainGain.gain.value = 0;
        rainSource.connect(highpass); highpass.connect(lowpass);
        lowpass.connect(rainGain); rainGain.connect(master);
        rainSource.start();
      }
      if (rainGain) {
        // Gentle fade and a low ceiling keep the engine in the foreground.
        rainGain.gain.setTargetAtTime(intensity * 0.015, now, 0.8);
      }
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
      updateRain(car, now);
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
      dispose() {
        if (context) {
          silence(); rainSource?.stop(); rainSource?.disconnect();
          context.close(); context = null; rainSource = null; rainGain = null;
        }
      },
    };
  };
})();
