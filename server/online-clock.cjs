'use strict';
// Fixed physics steps, paced by elapsed time rather than timer callback count.
// Recover small scheduling delays; bound work after a stall to avoid a catch-up spiral.
exports.createOnlineClock = (step, stepMs, now, maxSteps = 3) => {
  let previous = now, pending = 0;
  return time => {
    pending = Math.min(stepMs * maxSteps, pending + Math.max(0, time - previous));
    previous = time;
    let count = 0;
    while (pending + 1e-7 >= stepMs && count < maxSteps) {
      pending = Math.max(0, pending - stepMs);
      step(); count++;
    }
    return count;
  };
};
