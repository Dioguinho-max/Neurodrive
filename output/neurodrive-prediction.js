(() => {
  'use strict';
  window.createOnlinePrediction = (track) => {
    const history = [];
    let state = null, received = 0, baseTime = 0, phase, visual = null, frameTime = 0;
    let offsetX = 0, offsetY = 0, offsetAngle = 0;
    const wrap = (value) => Math.atan2(Math.sin(value), Math.cos(value));
    const commandAt = (time) => {
      for (let i = history.length - 1; i >= 0; i--) if (history[i].time <= time) return history[i].input;
      return history[0]?.input || {};
    };
    function simulate(now) {
      if (!state) return null;
      const car = { ...state };
      if (phase !== 'racing' || car.done || car.cooldown || car.pitState || car.pitExit) return car;
      const end = Math.min(now, received + 200);
      for (let time = baseTime + 1000 / 60; time <= end; time += 1000 / 60) window.predictNeuroCar(track, car, commandAt(time));
      return car;
    }
    return {
      input(input, now) {
        history.push({ input: { ...input }, time: now });
        while (history.length > 2 && history[1].time < now - 1000) history.shift();
      },
      receive(car, nextPhase, now, rtt = 0) {
        const reset = !state || nextPhase !== phase || car.done || car.cooldown || car.pitState !== state.pitState || Math.hypot(car.x - state.x, car.y - state.y) > 40;
        state = { ...car }; phase = nextPhase; received = now;
        baseTime = now - Math.min(120, Math.max(0, rtt / 2));
        const corrected = simulate(now);
        if (!reset && visual && Math.hypot(visual.x - corrected.x, visual.y - corrected.y) < 20) {
          offsetX = visual.x - corrected.x; offsetY = visual.y - corrected.y; offsetAngle = wrap(visual.angle - corrected.angle);
        } else { offsetX = offsetY = offsetAngle = 0; visual = corrected; }
      },
      sample(now) {
        const car = simulate(now);
        if (!car) return null;
        const decay = Math.exp(-Math.max(0, now - frameTime) / 65); frameTime = now;
        offsetX *= decay; offsetY *= decay; offsetAngle *= decay;
        visual = { ...car, x: car.x + offsetX, y: car.y + offsetY, angle: wrap(car.angle + offsetAngle) };
        return visual;
      },
    };
  };
})();
