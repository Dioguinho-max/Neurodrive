/* Ranked solo drift: send controls, never a client-provided score. */
(() => {
  async function request(route, body) {
    const response = await fetch(`/api/drift/${route}`, { method: body ? 'POST' : 'GET', credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) throw Error(response.status === 401 ? 'Entre na conta para participar do ranking.' : 'Ranking indisponível. Seu resultado local continua salvo.');
    return response.json();
  }
  window.NeuroDriftOnline = {
    board: track => request(`board?track=${encodeURIComponent(track)}`),
    start(race, track, setup) {
      let frames = [], recover = false;
      const ready = request('start', { track, setup }).catch(error => ({ error: error.message }));
      const originalStep = race.step, originalRecover = race.recoverPlayer;
      race.recoverPlayer = () => { recover = true; };
      race.step = input => {
        if (race.phase === 'finished') return;
        const number = (value, min = 0) => Number.isFinite(value) ? Math.max(min, Math.min(1, value)) : 0;
        const steering = input.left || input.right ? Number(!!input.right) - Number(!!input.left) : number(input.steering, -1);
        const throttle = input.accelerate ? 1 : number(input.throttle);
        const braking = input.brake ? 1 : number(input.braking);
        const flags = (input.handbrake ? 1 : 0) | (input.shiftUp ? 2 : 0) | (input.shiftDown ? 4 : 0) | (input.noReverse ? 8 : 0) | (recover ? 16 : 0);
        if (frames.length < 7450) frames.push([steering, throttle, braking, flags, Number(race.cars[0].manual)]);
        if (recover) { originalRecover(); recover = false; }
        originalStep({ steering, throttle, braking, handbrake: !!input.handbrake, shiftUp: !!input.shiftUp, shiftDown: !!input.shiftDown, noReverse: !!input.noReverse });
      };
      let submitted;
      return { finish() {
        return submitted ||= ready.then(session => {
          if (session.error) throw Error(session.error);
          return request('finish', { token: session.token, frames });
        }).finally(() => { frames = []; });
      } };
    },
  };
})();
