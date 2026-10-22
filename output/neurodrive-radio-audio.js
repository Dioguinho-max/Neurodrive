/* Optional browser speech, with a quiet radio cue and no queued stale messages. */
(() => {
  window.createNeuroRadioAudio = () => {
    const sound = document.getElementById('radio-sound'), voice = document.getElementById('radio-voice'), volume = document.getElementById('radio-volume');
    let context, current, timer, oscillator;
    const voiceSelect = document.getElementById('radio-speaker'), testVoice = document.getElementById('radio-test');
    const language = () => window.NeuroI18n?.language || 'pt-BR';
    const voiceKey = () => 'neurodrive-radio-speaker-' + language();
    function availableVoices() {
      const lang = language().toLowerCase();
      const score = v => (v.lang.toLowerCase() === lang ? 100 : 0)
        + (/natural|neural|premium|enhanced/i.test(v.name) ? 30 : /google|online/i.test(v.name) ? 20 : 0);
      return (window.speechSynthesis?.getVoices() || []).filter(v => v.lang.toLowerCase().split('-')[0] === lang.split('-')[0]).sort((a,b) => score(b)-score(a));
    }
    function selectedVoice() {
      let saved; try { saved = localStorage.getItem(voiceKey()); } catch {}
      const voices = availableVoices();
      return voices.find(v => (v.voiceURI || v.name) === saved) || voices[0] || null;
    }
    function refreshVoices() {
      if (!voiceSelect) return;
      let saved; try { saved = localStorage.getItem(voiceKey()); } catch {}
      const automatic = document.createElement('option'); automatic.value = '';
      automatic.textContent = window.NeuroI18n?.t('Automática — melhor voz disponível') || 'Automática — melhor voz disponível';
      voiceSelect.replaceChildren(automatic);
      for (const v of availableVoices()) {
        const option = document.createElement('option'); option.value = v.voiceURI || v.name;
        option.textContent = v.name; option.setAttribute('translate','no'); voiceSelect.append(option);
      }
      voiceSelect.value = [...voiceSelect.options].some(v => v.value === saved) ? saved : '';
      voiceSelect.disabled = !window.speechSynthesis;
      if (testVoice) testVoice.disabled = !window.speechSynthesis;
    }
    if (voiceSelect) voiceSelect.onchange = () => { stop(); try { localStorage.setItem(voiceKey(), voiceSelect.value); } catch {} };
    window.speechSynthesis?.addEventListener?.('voiceschanged', refreshVoices);
    refreshVoices();
    function speak(message, level) {
      const utterance = new window.SpeechSynthesisUtterance(window.NeuroI18n?.t(message) || message);
      utterance.lang = language(); utterance.volume = level; utterance.rate = .96; utterance.pitch = 1;
      utterance.voice = selectedVoice(); current = utterance;
      utterance.onend = utterance.onerror = () => { if (current === utterance) current = null; };
      try { window.speechSynthesis.speak(utterance); } catch { current = null; }
    }
    if (testVoice) testVoice.onclick = () => {
      stop();
      const level = Math.max(0, Math.min(1, Number(volume.value) / 100));
      if (!document.hidden && level && voice.checked && window.speechSynthesis && window.SpeechSynthesisUtterance)
        speak('Rádio funcionando. Boa corrida! Cuidado nas frenagens.', level);
    };
    for (const [control, key] of [[sound,'sound'],[voice,'voice']]) {
      try { control.checked = localStorage.getItem('neurodrive-radio-' + key) !== 'off'; } catch {}
      control.onchange = () => { stop(); try { localStorage.setItem('neurodrive-radio-' + key, control.checked ? 'on' : 'off'); } catch {} };
    }
    try { const saved = localStorage.getItem('neurodrive-radio-volume'); if (saved !== null && Number.isFinite(Number(saved))) volume.value = String(Math.max(0,Math.min(100,Number(saved)))); } catch {}
    volume.oninput = () => { stop(); try { localStorage.setItem('neurodrive-radio-volume',volume.value); } catch {} };
    function stop() {
      clearTimeout(timer); timer = null;
      if (oscillator) { try { oscillator.stop(); } catch {} oscillator = null; }
      if (current) { window.speechSynthesis?.cancel(); current = null; }
    }
    function blocked() { return document.hidden || Boolean(document.querySelector('dialog[open]')); }
    async function unlock() {
      if (!sound.checked) return;
      try { context ||= new (window.AudioContext || window.webkitAudioContext)(); await context.resume(); } catch {}
    }
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    new MutationObserver(() => { stop(); }).observe(document.documentElement, {subtree:true,attributes:true,attributeFilter:['open']});
    window.addEventListener('neurodrive:language', () => { stop(); refreshVoices(); });
    window.addEventListener('pagehide', () => { stop(); context?.close(); context = null; });
    return {
      stop,
      play(message) {
        stop();
        const level = Math.max(0, Math.min(1, Number(volume.value) / 100));
        if (blocked() || !level) return;
        if (sound.checked && context?.state === 'running') {
          const tone = context.createOscillator(), gain = context.createGain(), now = context.currentTime;
          oscillator = tone; tone.type = 'sine'; tone.frequency.setValueAtTime(950,now); tone.frequency.setValueAtTime(1250,now+.07);
          gain.gain.setValueAtTime(0,now); gain.gain.linearRampToValueAtTime(level*.12,now+.012); gain.gain.setValueAtTime(level*.12,now+.11); gain.gain.linearRampToValueAtTime(0,now+.16);
          tone.connect(gain); gain.connect(context.destination); tone.onended = () => {tone.disconnect();gain.disconnect();if(oscillator===tone)oscillator=null;}; tone.start(); tone.stop(now+.17);
        }
        if (!voice.checked || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
        timer = setTimeout(() => {
          if (blocked() || !voice.checked) return;
          speak(message, level);
        }, 200);
      },
    };
  };
})();
