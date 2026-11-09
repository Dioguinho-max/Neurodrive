"""Original procedural engine sketches; no downloaded recordings or dependencies."""
from pathlib import Path
import math
import random
import struct
import wave

DEST = Path(__file__).resolve().parents[1] / 'output' / 'amostras-motores'
RATE = 44100
DURATION = 14


def render_v8():
    """Cross-plane-inspired firing texture with two exhaust resonances.

    Original synthesis, not extracted or looped audio from the reference.
    """
    rng = random.Random(83)
    phase = 0.0
    previous_event = -1
    strength = 1.0
    noise_low = tail = dc = soft = 0.0
    # An uneven bank emphasis creates the characteristic burble without a
    # continuous high-frequency oscillator or a pure crank sine tone.
    firing = (1.0, .63, .86, .71, .65, 1.0, .7, .91)
    resonators = []
    for hz, q, weight in [(155, .8, .5), (330, 1.05, .75)]:
        omega = 2 * math.pi * hz / RATE
        alpha = math.sin(omega) / (2 * q)
        resonators.append([alpha / (1 + alpha), -2 * math.cos(omega) / (1 + alpha),
                           (1 - alpha) / (1 + alpha), 0., 0., 0., 0., weight])
    samples = []
    for i in range(RATE * DURATION):
        t = i / RATE
        rev = revs(t)
        rpm = max(850, rev * 6800)
        phase += rpm * 4 / (60 * RATE)
        event = int(phase)
        if event != previous_event:
            strength = firing[event % 8] * rng.uniform(.87, 1.13)
            previous_event = event
        throttle = .9 if 1.5 < t < 10.5 else .22
        for shift in (4.5, 7.7):
            if shift < t < shift + .16:
                throttle *= .28
        noise = rng.uniform(-1, 1)
        noise_low += .09 * (noise - noise_low)
        age = phase - event
        combustion = math.exp(-age * 10) * strength
        tail += .12 * (combustion - tail)
        dc += .007 * (tail - dc)
        source = (tail - dc) * (1 + noise_low * .35)
        exhaust = 0.0
        for state in resonators:
            b, a1, a2, x1, x2, y1, y2, weight = state
            y = b * (source - x2) - a1 * y1 - a2 * y2
            state[3:7] = [source, x1, y, y1]
            exhaust += y * weight
        # A little broadband combustion under load, not a sustained hiss.
        value = exhaust * 3.6 + source * .24 + noise_low * combustion * .16
        value = math.tanh(value * (1 + throttle * .65)) * (.35 + throttle * .65)
        soft += (1 - math.exp(-2 * math.pi * 1050 / RATE)) * (value - soft)
        samples.append(soft * min(1, t / .12, (DURATION - t) / .3))
    write_sample('v8', samples)


def write_sample(name, samples):
    rms = math.sqrt(sum(x*x for x in samples) / len(samples))
    peak = max(abs(x) for x in samples)
    gain = min(.17 / rms, .88 / peak)
    pcm = b''.join(struct.pack('<h', round(x * gain * 32767)) for x in samples)
    with wave.open(str(DEST / (name + '.wav')), 'wb') as audio:
        audio.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        audio.writeframes(pcm)
    assert max(abs(x * gain) for x in samples) <= .881
    print(f'{name}: {DURATION}s, mono {RATE}Hz, peak {peak * gain:.3f}, RMS {rms * gain:.3f}')


def revs(t):
    # Same driving sequence for all three samples, including two upshifts.
    knots = [(0, .12), (1.5, .15), (4.5, 1), (4.65, .64),
             (7.7, 1), (7.85, .62), (10.5, .95), (12.8, .15), (14, .12)]
    for (a, x), (b, y) in zip(knots, knots[1:]):
        if t <= b:
            return x + (y - x) * (t - a) / (b - a)
    return .12


def render(name, cylinders, redline, brightness):
    rng = random.Random(47)
    phase = crank = 0.0
    low_noise = exhaust = muffled = air = 0.0
    firing_gain = firing_target = 1.0
    samples = []
    for i in range(RATE * DURATION):
        t = i / RATE
        rev = revs(t)
        rpm = max(850, rev * redline)
        load = .85 if 1.5 < t < 10.5 else .25
        for shift in (4.5, 7.7):
            if shift < t < shift + .16:
                load *= .35
        previous_cycle = int(phase / (2 * math.pi))
        phase += 2 * math.pi * rpm / 60 * (cylinders / 2) / RATE
        if int(phase / (2 * math.pi)) != previous_cycle:
            firing_target = rng.uniform(.82, 1.18)
        firing_gain += .025 * (firing_target - firing_gain)
        crank += 2 * math.pi * rpm / 60 / RATE
        noise = rng.uniform(-1, 1)
        low_noise += .055 * (noise - low_noise)
        # Softer exhaust: remove the tonal crank layer and phase modulation
        # that sounded like an electric buzz. Small firing variations retain
        # texture without a separate continuous oscillator.
        pulse = sum(math.sin(h * phase) /
                    (h ** (brightness + .35)) for h in range(1, 9))
        pulse *= firing_gain
        cutoff = 420 + rev * 850
        alpha = 1 - math.exp(-2 * math.pi * cutoff / RATE)
        exhaust += alpha * (pulse - exhaust)
        muffled += alpha * (exhaust - muffled)
        value = (muffled * .85 + low_noise * .24) * (.35 + load * .65)
        if cylinders == 8:
            value *= 1 + .13 * math.sin(crank * .5)
        if name == 'turbo':
            boost = max(0, (rev - .35) / .65) * load
            # Air movement instead of a pure high-pitched turbine whistle.
            air += .13 * (noise - air)
            value += boost * .045 * (air - low_noise)
            for shift in (4.5, 7.7, 10.5):
                dt = t - shift
                if 0 <= dt < .55:
                    envelope = (1 - math.exp(-dt * 90)) * math.exp(-dt * 9)
                    value += .35 * envelope * (air - low_noise)
        value = math.tanh(value * .85)
        fade = min(1, t / .12, (DURATION - t) / .3)
        samples.append(value * fade)
    write_sample(name, samples)


if __name__ == '__main__':
    DEST.mkdir(parents=True, exist_ok=True)
    render('turbo', 4, 7200, 1.22)
    render('v6', 6, 8200, 1.05)
    render('v8-anterior', 8, 6800, 1.5)
    render_v8()
