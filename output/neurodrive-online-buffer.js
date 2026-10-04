/* Small visual buffer: network updates never restart an animation in progress. */
(() => {
  'use strict';
  window.createOnlineBuffer = () => {
    const frames = [];
    return {
      clear() { frames.length = 0; },
      push(state, time) {
        frames.push({ state, time });
        if (frames.length > 12) frames.shift();
      },
      sample(now) {
        if (!frames.length) return [];
        const target = now - 75;
        while (frames.length > 2 && frames[1].time <= target) frames.shift();
        const a = frames[0], b = frames[1] || a;
        const alpha = Math.max(0, Math.min(1, (target - a.time) / (b.time - a.time || 1)));
        const oldCars = new Map(a.state.cars.map((car) => [car.id, car]));
        return b.state.cars.map((car) => {
          const old = oldCars.get(car.id);
          // Recovery and large corrections must not animate across the circuit.
          if (!old || Math.hypot(old.x - car.x, old.y - car.y) > 40) return car;
          const result = { ...car };
          for (const key of ['x', 'y', 'speed', 'rpm', 'steering', 'bodyRoll']) {
            result[key] = old[key] + (car[key] - old[key]) * alpha;
          }
          result.angle = old.angle + Math.atan2(Math.sin(car.angle - old.angle), Math.cos(car.angle - old.angle)) * alpha;
          return result;
        });
      },
    };
  };
})();
