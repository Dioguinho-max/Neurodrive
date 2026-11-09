"""Usage: python scripts/prepare-recorded-engine.py path/to/reference.wav

Requires numpy and scipy. The source recording is supplied separately.
"""
import sys
import wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt, resample_poly, stft


def steady_pitch(clip, target_hz, initial_hz):
    # Follow a continuous spectral ridge, then resample its accumulated phase.
    # This removes the recorded acceleration from loops; gameplay controls RPM.
    freqs, times, spectrum = stft(clip, rate, nperseg=8192, noverlap=6144)
    pitch = []
    previous = initial_hz
    for frame in abs(spectrum).T:
        candidates = np.flatnonzero((freqs > previous * .78) & (freqs < previous * 1.28))
        selected = candidates[np.argmax(frame[candidates])]
        previous = .6 * previous + .4 * freqs[selected]
        pitch.append(previous)
    frequency = np.interp(np.arange(len(clip)) / rate, times, pitch)
    position = np.cumsum(frequency / target_hz)
    return np.interp(np.arange(position[-1]), position, clip)

with wave.open(sys.argv[1], 'rb') as source:
    assert source.getsampwidth() == 2 and source.getframerate() == 48000
    rate = source.getframerate()
    audio = np.frombuffer(source.readframes(source.getnframes()), '<i2')
    audio = audio.reshape(-1, source.getnchannels()).mean(axis=1) / 32768
destination = Path(__file__).resolve().parents[1] / 'output/assets/engine'
destination.mkdir(parents=True, exist_ok=True)
for name, start, end, loop, target, initial in [
        ('low', .12, 3.8, True, 60, 111),
        ('mid', 12, 19.8, True, 140, 164),
        ('high', 20, 24.7, True, 240, 205),
        ('coast', 30, 35.3, True, 100, 82),
        ('release', 25.7, 26.4, False, 0, 0)]:
    clip = audio[int(start * rate):int(end * rate)].copy()
    clip = sosfilt(butter(2, 45 if loop else 700, 'highpass', fs=rate, output='sos'), clip)
    if loop:
        clip = steady_pitch(clip, target, initial)
        if name == 'coast':
            clip = sosfilt(butter(2, 1400, 'lowpass', fs=rate, output='sos'), clip)
        n = int(.18 * rate)
        fade = np.linspace(0, 1, n)
        clip = np.concatenate([clip[n:-n], clip[-n:] * (1 - fade) + clip[:n] * fade])
    else:
        clip *= np.minimum(1, np.arange(len(clip)) / (.015 * rate))
        clip *= np.minimum(1, np.arange(len(clip))[::-1] / (.2 * rate))
    # Anti-alias filtering before reducing sample rate; wrap only real loops.
    clip = resample_poly(clip, 1, 2, padtype='wrap' if loop else 'constant')
    clip *= min(.3 / np.sqrt(np.mean(clip * clip)), .92 / np.max(np.abs(clip)))
    with wave.open(str(destination / (name + '.wav')), 'wb') as output:
        output.setparams((1, 2, rate // 2, 0, 'NONE', 'not compressed'))
        output.writeframes((clip * 32767).astype('<i2').tobytes())
    print(name, round(len(clip) / (rate // 2), 2), 'seconds')
