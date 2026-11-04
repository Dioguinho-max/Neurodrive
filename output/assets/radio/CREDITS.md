# NeuroDrive — generated radio speech

These are synthetic voices, not live recordings of a race engineer.
Generated locally with Piper TTS 1.8.0 from the game's original short radio scripts.
No voice cloning or reference recordings were supplied by the game developer.

## Portuguese (Brazil)

Default model: `pt_BR-cadu-medium`, speaker 0, distributed by Rhasspy/Piper.
Alternative model: `pt_BR-faber-medium`, speaker 0.
Both use revised, shorter spoken scripts; the on-screen alerts retain their original meaning.
Model card for Cadu: https://huggingface.co/rhasspy/piper-voices/blob/main/pt/pt_BR/cadu/medium/MODEL_CARD
Model card: https://huggingface.co/rhasspy/piper-voices/blob/main/pt/pt_BR/faber/medium/MODEL_CARD
Dataset: https://github.com/OHF-Voice/voice-datasets — CC0 according to the model card.

## English (United States)

Model: `en_US-libritts_r-medium`, speaker 0, distributed by Rhasspy/Piper.
Model card: https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/libritts_r/medium/MODEL_CARD
Dataset: LibriTTS-R, https://www.openslr.org/141/ — CC BY 4.0 according to the model card.
License: https://creativecommons.org/licenses/by/4.0/
Credit: LibriTTS-R dataset contributors and Rhasspy/Piper model contributors.
Transformation: neural synthesis of original game dialogue, with volume and synthesis parameters adjusted for the game.

The model cards describe fine-tuning from English Lessac medium. The game ships only these generated WAV clips, not the models or the Piper runtime.
Model checksums and speaker IDs are recorded in generation.json. Text and generation code are in scripts/radio-lines.json and scripts/generate-radio-voices.py.
