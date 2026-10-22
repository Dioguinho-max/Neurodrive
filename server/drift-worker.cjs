const { parentPort, workerData } = require('node:worker_threads');
const fs = require('node:fs');
const path = require('node:path');
const engine = {};
for (const file of ['neuro-pista-track.js', 'neurodrive-race-engine.js']) new Function('window', fs.readFileSync(path.join(__dirname, '../output', file), 'utf8'))(engine);
try {
  const { track, setup, frames } = workerData;
  if (!Array.isArray(frames) || frames.length < 7200 || frames.length > 7450) throw Error('frames');
  const race = engine.createNeuroRace(engine.createNeuroTrack(track), 'normal', { mode: 'drift', driftSetup: setup });
  for (const frame of frames) {
    if (race.phase === 'finished' || !Array.isArray(frame) || frame.length !== 5
      || !frame.every(Number.isFinite) || Math.abs(frame[0]) > 1 || frame[1] < 0 || frame[1] > 1
      || frame[2] < 0 || frame[2] > 1 || !Number.isInteger(frame[3]) || frame[3] < 0 || frame[3] > 31
      || ![0, 1].includes(frame[4])) throw Error('input');
    const [steering, throttle, braking, flags, manual] = frame;
    if (race.cars[0].manual !== Boolean(manual)) race.setTransmission(manual ? 'manual' : 'automatic');
    if (flags & 16) race.recoverPlayer();
    race.step({ steering, throttle, braking, handbrake: !!(flags & 1), shiftUp: !!(flags & 2), shiftDown: !!(flags & 4), noReverse: !!(flags & 8) });
  }
  if (race.phase !== 'finished') throw Error('unfinished');
  parentPort.postMessage({ score: race.driftScore.total, combo: race.driftScore.best });
} catch { parentPort.postMessage({ error: true }); }
