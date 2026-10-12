/* Som sintetizado localmente com Web Audio: não exige arquivos ou downloads. */
(() => {
  'use strict';
  window.createNeuroAudio = function createNeuroAudio() {
    let context, master, engineGain, filter, low, high;
    let rainSource, rainGain;
    let enabled = true, volume = 0.3;
    let lastCountdown = null;
    let introActive = false, introToken = 0;
    const introVoices = new Set();
    let introNoise;

    function stopIntro() {
      introActive = false; introToken++;
      if (!context) return;
      const now = context.currentTime;
      for (const voice of introVoices) {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setTargetAtTime(0, now, .025);
        voice.oscillator.stop(now + .12);
      }
      introVoices.clear();
    }

    function introNote(frequency, delay, duration, level, type = 'sine') {
      const oscillator = context.createOscillator(), gain = context.createGain();
      const tone = context.createBiquadFilter();
      tone.type = 'lowpass'; tone.frequency.value = 1800; tone.Q.value = .6;
      const start = context.currentTime + delay;
      oscillator.type = type; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(level, start + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      oscillator.connect(tone); tone.connect(gain); gain.connect(master);
      const voice = { oscillator, gain }; introVoices.add(voice);
      oscillator.onended = () => { oscillator.disconnect(); tone.disconnect(); gain.disconnect(); introVoices.delete(voice); };
      oscillator.start(start); oscillator.stop(start + duration + .05);
    }

    function introDrum(kind, delay) {
      const start = context.currentTime + delay, gain = context.createGain();
      const kick = kind === 'kick', snare = kind === 'snare';
      const duration = kick ? .22 : snare ? .14 : .045;
      const source = kick ? context.createOscillator() : context.createBufferSource();
      const tone = context.createBiquadFilter();
      if (kick) {
        source.type = 'sine';
        source.frequency.setValueAtTime(135, start);
        source.frequency.exponentialRampToValueAtTime(46, start + .14);
        tone.type = 'lowpass'; tone.frequency.value = 450;
      } else {
        if (!introNoise) {
          introNoise = context.createBuffer(1, Math.ceil(context.sampleRate * .2), context.sampleRate);
          const data = introNoise.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        }
        source.buffer = introNoise;
        tone.type = snare ? 'bandpass' : 'highpass';
        tone.frequency.value = snare ? 1900 : 6500; tone.Q.value = .6;
      }
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(kick ? .18 : snare ? .10 : .025, start + .003);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      source.connect(tone); tone.connect(gain); gain.connect(master);
      const voice = { oscillator: source, gain }; introVoices.add(voice);
      source.onended = () => { source.disconnect(); tone.disconnect(); gain.disconnect(); introVoices.delete(voice); };
      source.start(start); source.stop(start + duration + .01);
    }

    async function playIntro(shot = 'overview', weather = 'dry') {
      if (!enabled) return;
      if (shot === 'overview') stopIntro();
      introActive = true;
      const token = introToken;
      const ready = await unlock();
      if (token !== introToken || !introActive || !enabled) return;
      if (!ready) { introActive = false; return; }
      const now = context.currentTime;
      engineGain.gain.setTargetAtTime(0, now, .03);
      rainGain?.gain.setTargetAtTime(0, now, .03);
      master.gain.setTargetAtTime(volume, now, .03);
      // 100 BPM: the 2.4-second camera cut lands on the next four-beat bar.
      // A driving bass riff, backbeat and short lead replace the floating chimes.
      const bars = shot === 'overview' ? 1 : 2;
      const melody = [329.63, 329.63, 392, 440, 493.88, 440, 392, 293.66];
      for (let bar = 0; bar < bars; bar++) {
        const offset = bar * 2.4;
        const root = shot === 'forecast' && bar === 0 ? 65.41 : 82.41;
        for (let step = 0; step < 8; step++) {
          const at = offset + step * .3;
          introNote(root * (step === 6 ? 1.5 : 1), at, .24, .065, 'sawtooth');
          introDrum('hat', at);
          if (step % 4 === 0) introDrum('kick', at);
          if (step % 4 === 2) introDrum('snare', at);
          introNote(melody[step], at, step === 7 ? .27 : .20, .032, 'sawtooth');
        }
        // Short power-chord accents on the downbeats.
        for (const beat of [0, 1.2]) for (const ratio of [2, 3]) {
          introNote(root * ratio, offset + beat, .45, .018, 'triangle');
        }
      }
      if (shot === 'forecast') {
        introDrum('kick', 4.8);
        [164.81, 246.94, 329.63].forEach(note => introNote(note, 4.8, .6, .025, 'triangle'));
      }
    }

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
      stopIntro();
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
      if (introActive && enabled) {
        master.gain.setTargetAtTime(volume, context.currentTime, .03);
        return;
      }
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
      unlock, update, silence, playIntro, stopIntro,
      setEnabled(value) { enabled = Boolean(value); if (!enabled) silence(); },
      setVolume(value) { volume = Math.max(0, Math.min(1, Number(value) || 0)); },
      dispose() {
        if (context) {
          silence(); rainSource?.stop(); rainSource?.disconnect();
          context.close(); context = null; rainSource = null; rainGain = null; introNoise = null;
        }
      },
    };
  };
})();
