/* Offline neural clips by default; system speech remains an explicit alternative. */
(() => {
  window.createNeuroRadioAudio = () => {
    const sound = document.getElementById('radio-sound'), voice = document.getElementById('radio-voice'), volume = document.getElementById('radio-volume');
    let context, current, timer, oscillator, clip, generation = 0;
    const voiceSelect = document.getElementById('radio-speaker'), testVoice = document.getElementById('radio-test');
    const language = () => window.NeuroI18n?.language || 'pt-BR';
    const voiceKey = () => 'neurodrive-radio-speaker-' + language();
    const hasClips = () => Boolean(window.NeuroRadioClips && window.Audio);
    const useClips = () => hasClips() && (voiceSelect?.value === 'neural' || voiceSelect?.value === 'neural:faber');
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
      if (hasClips()) {
        const neural = document.createElement('option'); neural.value = 'neural';
        const title = language() === 'pt-BR' ? 'Equipe Neuro · Cadu (IA offline)' : 'Equipe Neuro · voz IA offline';
        neural.textContent = window.NeuroI18n?.t(title) || title;
        voiceSelect.append(neural);
        if (language() === 'pt-BR' && window.NeuroRadioVariants?.faber) {
          const alternate=document.createElement('option');alternate.value='neural:faber';
          alternate.textContent=window.NeuroI18n?.t('Equipe Neuro · Faber (IA offline)') || 'Equipe Neuro · Faber (IA offline)';voiceSelect.append(alternate);
        }
      }
      for (const v of availableVoices()) {
        const option = document.createElement('option'); option.value = v.voiceURI || v.name;
        option.textContent = v.name; option.setAttribute('translate','no'); voiceSelect.append(option);
      }
      let preference; try { preference = localStorage.getItem(voiceKey() + '-v2'); } catch {}
      voiceSelect.value = hasClips() && preference !== 'system' ? (saved === 'neural:faber' && language() === 'pt-BR' ? saved : 'neural') : [...voiceSelect.options].some(v => v.value === saved) ? saved : '';
      voiceSelect.disabled = !hasClips() && !window.speechSynthesis;
      if (testVoice) testVoice.disabled = voiceSelect.disabled;
    }
    if (voiceSelect) voiceSelect.onchange = () => { stop(); try { localStorage.setItem(voiceKey(), voiceSelect.value); localStorage.setItem(voiceKey()+'-v2',useClips()?'neural':'system'); } catch {} };
    window.speechSynthesis?.addEventListener?.('voiceschanged', refreshVoices);
    refreshVoices();
    function speak(message, level) {
      if (useClips()) {
        const pack = voiceSelect.value === 'neural:faber' ? window.NeuroRadioVariants?.faber : window.NeuroRadioClips;
        const url = pack?.[message]?.[language()];
        if (!url) return;
        const token = generation;
        const audio = new window.Audio(url); clip = audio; audio.volume = level; audio.preload = 'auto';
        const finish = () => { if (clip === audio) { clip = null; window.NeuroRadioSpeaking = false; } };
        audio.onended = audio.onerror = finish;
        audio.onplaying = () => { if(token === generation && clip === audio) window.NeuroRadioSpeaking = true; else audio.pause(); };
        try { const playing=audio.play(); playing?.catch(finish); } catch { finish(); }
        return;
      }
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      const utterance = new window.SpeechSynthesisUtterance(window.NeuroI18n?.t(message) || message);
      utterance.lang = language(); utterance.volume = level; utterance.rate = .96; utterance.pitch = 1;
      utterance.voice = selectedVoice(); current = utterance;
      utterance.onstart = () => { if(current === utterance) window.NeuroRadioSpeaking = true; };
      utterance.onend = utterance.onerror = () => { if (current === utterance) { current = null; window.NeuroRadioSpeaking = false; } };
      try { window.speechSynthesis.speak(utterance); } catch { current = null; }
    }
    if (testVoice) testVoice.onclick = () => {
      stop();
      const level = Math.max(0, Math.min(1, Number(volume.value) / 100));
      if (!document.hidden && level && voice.checked)
        speak('Rádio funcionando. Boa corrida! Cuidado nas frenagens.', level);
    };
    for (const [control, key] of [[sound,'sound'],[voice,'voice']]) {
      try { control.checked = localStorage.getItem('neurodrive-radio-' + key) !== 'off'; } catch {}
      control.onchange = () => { stop(); try { localStorage.setItem('neurodrive-radio-' + key, control.checked ? 'on' : 'off'); } catch {} };
    }
    try { const saved = localStorage.getItem('neurodrive-radio-volume'); if (saved !== null && Number.isFinite(Number(saved))) volume.value = String(Math.max(0,Math.min(100,Number(saved)))); } catch {}
    volume.oninput = () => { stop(); try { localStorage.setItem('neurodrive-radio-volume',volume.value); } catch {} };
    function stop() {
      generation++; window.NeuroRadioSpeaking = false;
      if (clip) { clip.pause(); clip.removeAttribute('src'); clip.load(); clip = null; }
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
        if (!voice.checked || (!useClips() && (!window.speechSynthesis || !window.SpeechSynthesisUtterance))) return;
        timer = setTimeout(() => {
          if (blocked() || !voice.checked) return;
          speak(message, level);
        }, 200);
      },
    };
  };
})();
