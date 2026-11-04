"""Generate offline radio assets. Install piper-tts==1.8.0 in a local venv first.
Download pt_BR-cadu-medium, pt_BR-faber-medium and en_US-libritts_r-medium into .portable-cache/voice-models.
Only generated WAV files and the JS manifest belong in the game build.
"""
import hashlib
import json
from pathlib import Path
import wave
from piper import PiperVoice, SynthesisConfig

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / '.portable-cache/voice-models'
OUT = ROOT / 'output/assets/radio'
LINES = json.loads((ROOT / 'scripts/radio-lines.json').read_text(encoding='utf-8'))
VOICES = [('pt-BR', 'pt_BR-cadu-medium', ''), ('pt-BR', 'pt_BR-faber-medium', 'faber'), ('en-US', 'en_US-libritts_r-medium', '')]
manifest = {}
variants = {}
provenance = {}
for lang, model, variant in VOICES:
    model_path = MODELS / (model + '.onnx')
    voice = PiperVoice.load(str(model_path))
    config = SynthesisConfig(length_scale=1.06 if lang == 'pt-BR' else 1.0, noise_scale=.4, noise_w_scale=.55, volume=.8, speaker_id=0)
    folder_name = lang + ('-' + variant if variant else '')
    folder = OUT / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    provenance[folder_name] = {'model': model, 'sha256': hashlib.sha256(model_path.read_bytes()).hexdigest(), 'speaker_id': 0, 'length_scale': config.length_scale}
    for line in LINES:
        destination = folder / (line['id'] + '.wav')
        with wave.open(str(destination), 'wb') as audio:
            voice.synthesize_wav(line.get('spoken-' + lang, line[lang]), audio, syn_config=config)
        with wave.open(str(destination), 'rb') as audio:
            duration = audio.getnframes() / audio.getframerate()
        if not .3 < duration < 5.4:
            raise ValueError(f'Unexpected duration: {destination}: {duration}')
        target = variants.setdefault(variant, {}) if variant else manifest
        target.setdefault(line['pt-BR'], {})[lang] = f'assets/radio/{folder_name}/{line["id"]}.wav'
        print(f'{lang}/{line["id"]}: {duration:.2f}s', flush=True)
(ROOT / 'output/neurodrive-radio-clips.js').write_text(
    '/* Generated neural speech; see assets/radio/CREDITS.md. */\nwindow.NeuroRadioClips = '
    + json.dumps(manifest, ensure_ascii=False, indent=2) + ';\nwindow.NeuroRadioVariants = '
    + json.dumps(variants, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
(OUT / 'generation.json').write_text(json.dumps(provenance, indent=2), encoding='utf-8')
