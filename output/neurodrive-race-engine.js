/* Regras da corrida, independentes do DOM e do desenho. Física fixa em 60 Hz. */
(() => {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

  // Transmissão automática simplificada: faixas de velocidade e força por marcha.
  const MAX_RACE_SPEED = 205 / 54;
  const gearLimits = [34, 66, 102, 140, 173, 205];
  const gearForce = [0.010, 0.009, 0.008, 0.006, 0.0045, 0.0041];
  const REV_LIMIT = 6800;
  const drivers = [
    { name: 'Luna Costa', style: 'Técnica', pace: 0.98, corner: 1.02, gap: 1, color: '#e45d89' },
    { name: 'Rafa Torres', style: 'Ousado', pace: 1.02, corner: 1.06, gap: 0.94, color: '#f0a43c' },
    { name: 'Bia Rocha', style: 'Constante', pace: 0.97, corner: 0.98, gap: 1.08, color: '#976de0' },
    { name: 'Caio Lima', style: 'Velocista', pace: 1.04, corner: 0.96, gap: 1, color: '#48aadd' },
    { name: 'Nico Alves', style: 'Cauteloso', pace: 0.94, corner: 0.94, gap: 1.15, color: '#d95948' },
    { name: 'Dani Reis', style: 'Equilibrado', pace: 1, corner: 1, gap: 1.04, color: '#5aba89' },
  ];
  function updatePowertrain(car, pedal, maximumSpeed) {
    const kmh = car.speed * 54;
    const coupledRpm = 900 + kmh / gearLimits[car.gear - 1] * 5900;
    car.throttle = Math.max(0, pedal);
    car.limiter = pedal > 0 && coupledRpm >= REV_LIMIT - 20;
    car.cutTicks = car.limiter ? car.cutTicks + 1 : 0;
    if (car.shiftTicks > 0) car.shiftTicks--;
    else if (!car.manual && car.gear < gearLimits.length && coupledRpm >= REV_LIMIT && car.cutTicks >= 6) {
      car.gear++;
      car.shiftTicks = 14;
      car.limiter = false;
      car.cutTicks = 0;
    } else if (!car.manual && car.gear > 1 && kmh < gearLimits[car.gear - 2] * 0.78) {
      car.gear--;
      car.shiftTicks = 10;
    }
    const drag = 0.0015 + 0.0006 * (car.speed / 3.2) ** 2;
    car.brake += clamp(Math.max(0, -pedal) - car.brake, -0.08, 0.045);
    const force = car.brake > 0 ? -car.brake * 0.026
      : car.shiftTicks || (car.manual && car.limiter) ? 0 : pedal * gearForce[car.gear - 1];
    car.speed = clamp(car.speed + force - drag, 0, maximumSpeed);
    const targetRpm = clamp(900 + car.speed * 54 / gearLimits[car.gear - 1] * 5900, 900, REV_LIMIT);
    // Embreagem acopla gradualmente após a largada, sem trocar marchas parado.
    if (car.launchTicks > 0) { car.launchTicks--; car.rpm += (targetRpm - car.rpm) * 0.16; }
    else car.rpm = targetRpm;
  }

  function advanceCar(track, car, steering, pedal, maximumSpeed) {
    car.impact = (car.impact || 0) * 0.86;
    if (car.player) car.activations = [car.inputs, [], [steering, pedal]];
    // Menos curso em alta velocidade, entrada gradual e retorno mais rápido.
    const requestedSteering = car.player ? steering * (0.78 - 0.34 * car.speed / MAX_RACE_SPEED) : steering;
    const steeringRate = car.player ? (steering === 0 ? 0.055 : 0.025) : 0.06;
    car.steering += clamp(requestedSteering - car.steering, -steeringRate, steeringRate);
    updatePowertrain(car, pedal, maximumSpeed);
    car.offRoad = !track.contains(car.x, car.y);
    // Em alta, pequenos comandos fazem ajustes suaves; o giro cresce
    // progressivamente ao segurar o volante para uma curva mais fechada.
    const highSpeedBlend = clamp((car.speed * 54 - 60) / 100, 0, 1);
    const steeringCurve = 0.25 + 0.75 * Math.pow(Math.min(1, Math.abs(car.steering) / 0.78), 2);
    const requestedYaw = car.steering * (1 - highSpeedBlend * (1 - steeringCurve)) * 0.065 * car.speed / 3.2;
    // v (m/s) × velocidade angular (rad/s) = aceleração lateral.
    // 1 unidade/quadro = 15 m/s. Pneus têm aderência finita, não giro ilimitado.
    const lateralDemand = Math.abs(requestedYaw) * car.speed * 900;
    // Margem arcade no asfalto: curvas suaves e médias são mais tolerantes.
    const grip = (car.offRoad ? 1.55 : 2.6) * 9.81;
    const brakeLoad = Math.min(0.6, car.brake * 0.6);
    const lateralGrip = grip * Math.sqrt(1 - brakeLoad * brakeLoad);
    car.gripUsage = lateralDemand / lateralGrip;
    car.sliding = car.gripUsage > 1.15 && car.speed > 0.4;
    const maximumYaw = lateralGrip / Math.max(1, car.speed * 900);
    const yaw = clamp(requestedYaw, -maximumYaw, maximumYaw);
    car.angle = wrap(car.angle + yaw);
    car.bodyRoll += (clamp(yaw * car.speed * 900 / 9.81, -1.2, 1.2) * 0.075 - car.bodyRoll) * 0.1;
    // Arrasto dos pneus e do gramado; não há correção automática para o traçado.
    // Na grama usa só a resistência do terreno, sem somar outra frenagem por derrapagem.
    if (car.sliding && !car.offRoad) car.speed = Math.max(0, car.speed - Math.min(0.008, (car.gripUsage - 1.15) * 0.001));
    if (car.offRoad) car.speed = Math.max(0, car.speed - 0.0009 - car.speed * 0.00034);
    const x = car.x + Math.cos(car.angle) * car.speed;
    const y = car.y + Math.sin(car.angle) * car.speed;
    const edge = track.nearest(x, y);
    const lateral = (x - edge.x) * -edge.ty + (y - edge.y) * edge.tx;
    const normalHeading = Math.cos(car.angle) * -edge.ty + Math.sin(car.angle) * edge.tx;
    const tangentHeading = Math.cos(car.angle) * edge.tx + Math.sin(car.angle) * edge.ty;
    // Barreira visual a 40 unidades da pista, com 1 de espessura para dentro.
    // Considera o comprimento e a largura do carro, inclusive numa batida de frente.
    const clearance = 8.2 * Math.abs(normalHeading) + 4.7 * Math.abs(tangentHeading);
    const wallLimit = track.halfWidth + 39 - clearance - 0.3;
    if (Number.isFinite(edge.distance) && Math.abs(lateral) <= wallLimit) {
      car.x = x;
      car.y = y;
      car.wallContact = false;
    } else {
      // Desliza pela tangente da borda em vez de rejeitar todo o movimento.
      if (Number.isFinite(edge.distance)) {
        const offset = clamp(lateral, -wallLimit, wallLimit);
        car.x = edge.x - edge.ty * offset;
        car.y = edge.y + edge.tx * offset;
        let tangent = Math.atan2(edge.ty, edge.tx);
        if (Math.cos(car.angle - tangent) < 0) tangent = wrap(tangent + Math.PI);
        // Giro limitado por passo evita o tranco de alinhar 45% de uma vez.
        const correction = wrap(tangent - car.angle);
        car.angle = wrap(car.angle + clamp(correction * 0.12, -0.055, 0.055));
        car.steering *= 0.85;
      }
      // Um toque tira um pouco de velocidade; contato contínuo não a zera.
      if (car.wallContact || car.wallCooldown > 0) car.speed = Math.max(0, car.speed - 0.003);
      else {
        const impact = Number.isFinite(normalHeading) ? Math.abs(normalHeading) : 1;
        car.impact = Math.min(1, car.speed * impact / 3);
        car.speed *= 0.94 - 0.54 * impact * impact;
        car.wallCooldown = 45;
      }
      car.wallContact = true;
    }
  }

  // Visual prediction uses the same drivetrain, grip and wall response as the server.
  // Lap progress, collisions between cars and rewards remain server-authoritative.
  window.predictNeuroCar = (track, car, command) => {
    if (car.done) return;
    const shift = command.shiftUp ? 1 : command.shiftDown ? -1 : 0;
    if (car.manual && shift && shift !== (car.lastShift || 0) && !car.shiftTicks && !car.cooldown) {
      const gear = clamp(car.gear + shift, 1, 6);
      if (gear !== car.gear && (shift > 0 || car.speed * 54 <= gearLimits[gear - 1])) {
        car.gear = gear; car.shiftTicks = 14; car.cutTicks = 0;
      }
    }
    car.lastShift = shift;
    if (car.wallCooldown > 0) car.wallCooldown--;
    if (car.cooldown > 0) { car.cooldown--; return; }
    advanceCar(track, car, Number(Boolean(command.right)) - Number(Boolean(command.left)), command.brake ? -1 : command.accelerate ? 1 : 0, MAX_RACE_SPEED);
  };

  window.createNeuroRace = function createNeuroRace(track, difficulty = 'normal', options = {}) {
    const qualifying = options.session === 'qualifying';
    const pitStart = qualifying && options.pitStart === true;
    const pitRoutes = pitStart ? Array.from({ length: 6 }, (_, index) => track.pit.route(index)) : [];
    const requestedGrid = options.grid || [];
    const grid = [...new Set(requestedGrid.filter((id) => Number.isInteger(id) && id >= 1 && id <= 6))];
    for (let id = 1; id <= 6; id++) if (!grid.includes(id)) grid.push(id);
    const requestedLaps = Number(options.laps);
    const laps = qualifying ? 3 : Number.isInteger(requestedLaps) && requestedLaps >= 1 && requestedLaps <= 50 ? requestedLaps : 3;
    const startDistance = 0;
    const checkpointLength = track.length / 12;
    const aiSpeed = ({ easy: 170, normal: 190, hard: 205 }[difficulty] || 190) / 54;
    let phase = 'countdown';
    let countdown = 180;
    let elapsed = 0;
    let finishCount = 0;
    const previousShifts = new Map();

    function pointAt(distance, lane = 0) {
      const s = ((distance % track.length) + track.length) % track.length;
      const segment = track.segments.find((item) => s < item.start + item.size) || track.segments[0];
      const t = (s - segment.start) / segment.size;
      const angle = Math.atan2(segment.dy, segment.dx);
      return {
        x: segment.a.x + segment.dx * t - Math.sin(angle) * lane,
        y: segment.a.y + segment.dy * t + Math.cos(angle) * lane,
        angle,
      };
    }

    const cars = Array.from({ length: 6 }, (_, id) => {
      // Grid escalonado: nenhum adversário larga lado a lado com o jogador.
      const slot = grid.indexOf(id + 1);
      const distance = qualifying ? 0 : startDistance - slot * 30;
      const garage = pitStart ? track.pit.garage(id) : null;
      const point = garage ? pointAt(garage.distance, garage.lane) : pointAt(distance, qualifying ? 0 : slot % 2 ? 11 : -11);
      if (garage) point.angle = wrap(point.angle - Math.PI / 2);
      const human = options.online ? options.humans.includes(id + 1) : id === 0;
      const driver = drivers[(id + drivers.length - 1) % drivers.length];
      return {
        id: id + 1, name: human ? 'Você' : driver.name, player: human,
        driver: human ? null : driver,
        skin: human ? null : { color: driver.color, accent: '#172333' },
        ...point, speed: 0, maxSpeed: MAX_RACE_SPEED, steering: 0, gear: 1, rpm: 900, shiftTicks: 0, alive: true, done: false,
        pitExit: pitStart, pitWait: id * 120, pitNode: 1,
        throttle: 0, brake: 0, manual: human && options.transmission === 'manual', limiter: false, cutTicks: 0, launchTicks: 0,
        gripUsage: 0, sliding: false, offRoad: false, bodyRoll: 0,
        progress: distance - startDistance, checkpoint: 0,
        finishTime: null, place: null, cooldown: 0, stalled: 0, wallContact: false, wallCooldown: 0,
        bestLap: null, lastLap: null, lastLapKind: '', checkpointTimes: [],
        lapStart: 0, completedLaps: 0, invalidLap: false,
        inputs: [1, 1, 1, 1, 1, 0], activations: [[], [], [0, 0]],
      };
    });

    function sensors(car) {
      return [-1.2, -0.6, 0, 0.6, 1.2].map((offset) => {
        let distance = 0;
        for (; distance < 160; distance += 2) {
          if (!track.contains(car.x + Math.cos(car.angle + offset) * distance,
            car.y + Math.sin(car.angle + offset) * distance)) break;
        }
        return distance / 160;
      });
    }

    function aiDecision(car) {
      // Mesma política neural inicial informada do laboratório: 6 → 6 → 2.
      // Na corrida os pesos são fixos; não se troca a geração no meio da prova.
      car.inputs = [...sensors(car), Math.min(1, car.speed / 3.2)];
      const hidden = car.inputs.map(Math.tanh);
      let steering = Math.tanh(-1.5 * hidden[0] - 3 * hidden[1] + 3 * hidden[3] + 1.5 * hidden[4]);
      let pedal = Math.tanh(2.5 * hidden[2] - 2 * hidden[5] + 0.2);
      // Antecipação da curva: assistência de trajetória combinada à rede neural.
      car.tacticTicks = Math.max(0, (car.tacticTicks || 0) - 1);
      let lane = car.targetLane || 0;
      const nearby = qualifying ? [] : cars.filter((other) => other !== car && !other.done && !other.cooldown && !other.pitExit)
        .map((other) => {
          const dx = other.x - car.x, dy = other.y - car.y;
          return { other, ahead: dx * Math.cos(car.angle) + dy * Math.sin(car.angle),
            side: -dx * Math.sin(car.angle) + dy * Math.cos(car.angle) };
        });
      const nearest = track.nearest(car.x, car.y);
      const currentLane = (car.x - nearest.x) * -nearest.ty + (car.y - nearest.y) * nearest.tx;
      const clearLane = (candidate) => nearby.every(({ ahead, side }) =>
        ahead < -45 || ahead > 130 || Math.abs(currentLane + side - candidate) > 21);
      const previewBend = Math.abs(wrap(pointAt(car.progress + 145).angle - pointAt(car.progress + 40).angle));
      if (!car.tacticTicks) {
        lane = 0;
        const slower = nearby.filter(({ other, ahead, side }) => ahead > 18 && ahead < 130 && Math.abs(side) < 22 && car.speed > other.speed + 0.03)
          .sort((a, b) => a.ahead - b.ahead)[0];
        const laneWidth = Math.min(26, track.halfWidth - 18);
        if (previewBend < 0.5 && slower) {
          const choices = [-laneWidth, laneWidth].sort((a, b) => Math.abs(a - currentLane) - Math.abs(b - currentLane));
          lane = choices.find(clearLane) ?? 0;
          if (lane) car.tacticTicks = 180;
        } else if (previewBend < 0.2 && nearby.some(({ other, ahead, side }) => ahead < -30 && ahead > -85 && Math.abs(side) < 18 && other.speed > car.speed + 0.12)) {
          // Uma defesa antecipada; nunca fecha a porta com outro carro ao lado.
          const candidate = Math.min(14, laneWidth);
          if (clearLane(candidate)) { lane = candidate; car.tacticTicks = 100; }
        }
      }
      if (previewBend > 0.65) { lane *= 0.9; car.tacticTicks = 0; }
      if (lane && !clearLane(lane)) { lane = currentLane; car.tacticTicks = 0; }
      // Preserva espaço lateral durante uma disputa, inclusive quando volta ao centro.
      for (const { ahead, side } of nearby) {
        if (Math.abs(ahead) < 22 && Math.abs(side) < 24) {
          lane = clamp(currentLane - Math.sign(side || 1) * 10, -track.halfWidth + 16, track.halfWidth - 16);
          car.tacticTicks = Math.max(car.tacticTicks, 35);
        }
      }
      car.targetLane = lane;
      car.racingLane = (car.racingLane || 0) + clamp(lane - (car.racingLane || 0), -0.35, 0.35);
      const aheadPoint = pointAt(car.progress + 38 + car.speed * 12, car.racingLane);
      const angleError = wrap(Math.atan2(aheadPoint.y - car.y, aheadPoint.x - car.x) - car.angle);
      const pathSteering = clamp(angleError * 2.1, -1, 1);
      const pathWeight = Math.abs(car.racingLane) > 1 ? 1 : 0.65;
      steering = steering * (1 - pathWeight) + pathSteering * pathWeight;
      const laterPoint = pointAt(car.progress + 115 + car.speed * 18);
      const bend = Math.abs(wrap(laterPoint.angle - aheadPoint.angle));
      const driverPace = car.driver.pace;
      // Limita a velocidade pela curvatura prevista, usando a mesma escala da física.
      const curvature = bend / Math.max(20, Math.hypot(laterPoint.x - aheadPoint.x, laterPoint.y - aheadPoint.y));
      // Mais próximo da aderência de 2.6 g, com margem para tráfego e correções.
      const cornerGrip = ({ easy: 1.65, normal: 2.05, hard: 2.3 }[difficulty] || 2.05) * car.driver.corner;
      const safeSpeed = Math.sqrt(9.81 * cornerGrip * 0.25 / Math.max(curvature, 0.0001)) / 15;
      const targetCornerSpeed = Math.min(aiSpeed * driverPace, Math.max(0.7, safeSpeed));
      pedal = Math.max(pedal, clamp((targetCornerSpeed - car.speed) * 1.8, -1, 1));
      if (car.speed > targetCornerSpeed + 0.08) pedal = -clamp((car.speed - targetCornerSpeed) * 1.8, 0.12, 1);
      // A rede lê a pista; esta assistência de tráfego mantém distância dos carros.
      for (const other of cars) {
        if (qualifying || other === car || other.done || other.cooldown) continue;
        const dx = other.x - car.x, dy = other.y - car.y;
        const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
        const lateral = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
        const closing = Math.max(0, car.speed - other.speed);
        const gap = (21 + car.speed * 7 + closing * 10) * car.driver.gap;
        if (ahead > 0 && ahead < gap && lateral < 20) {
          const targetSpeed = Math.max(0, other.speed - (gap - ahead) * 0.08);
          if (car.speed > targetSpeed) pedal = Math.min(pedal, -clamp((car.speed - targetSpeed) * 1.5, 0.15, 1));
        }
      }
      car.activations = [car.inputs, hidden, [steering, pedal]];
      return [steering, pedal];
    }

    function exitPit(car) {
      car.throttle = 0; car.brake = 0; car.limiter = false; car.shiftTicks = 0;
      if (car.pitWait > 0) { car.pitWait--; car.speed = 0; car.rpm = 900; return; }
      const route = pitRoutes[car.id - 1];
      const next = route[car.pitNode];
      const heading = Math.atan2(next.y - car.y, next.x - car.x);
      const blocked = cars.some((other) => other !== car && !other.done
        && Math.hypot(other.x - car.x, other.y - car.y) < 22
        && Math.abs(-(other.x - car.x) * Math.sin(heading) + (other.y - car.y) * Math.cos(heading)) < 13
        && (other.x - car.x) * Math.cos(heading) + (other.y - car.y) * Math.sin(heading) > 4);
      if (blocked) { car.speed = 0; car.rpm = 900; return; }
      car.speed = Math.min(track.pit.limit, car.speed + 0.018);
      car.throttle = 0.35; car.gear = 2; car.rpm = 1500 + car.speed * 2200;
      let remaining = car.speed;
      while (remaining > 0 && car.pitNode < route.length) {
        const point = route[car.pitNode];
        const distance = Math.hypot(point.x - car.x, point.y - car.y);
        const step = Math.min(remaining, distance);
        if (distance > 0.0001) {
          const angle = Math.atan2(point.y - car.y, point.x - car.x);
          car.angle = wrap(car.angle + clamp(wrap(angle - car.angle), -0.08, 0.08));
          car.x += (point.x - car.x) * step / distance;
          car.y += (point.y - car.y) * step / distance;
        }
        remaining -= step;
        if (distance <= step + 0.0001) car.pitNode++;
      }
      car.activations = [car.inputs, [], [0, 0.35]];
      if (car.pitNode >= route.length) {
        car.pitExit = false;
        car.angle = pointAt(track.pit.exit).angle;
        car.progress = track.pit.exit;
        car.checkpoint = Math.floor(car.progress / checkpointLength);
        car.lapStart = elapsed;
        car.pitReleasedAt = elapsed;
      }
    }

    function recover(car) {
      if (car.done || car.pitExit || phase !== 'racing') return;
      car.invalidLap = true;
      const point = pointAt(startDistance + car.progress, car.id % 2 ? -10 : 10);
      Object.assign(car, point, { speed: 0, steering: 0, gear: 1, rpm: 900, shiftTicks: 0,
        throttle: 0, brake: 0, limiter: false, cutTicks: 0, launchTicks: 0, cooldown: 120, stalled: 0,
        gripUsage: 0, sliding: false, offRoad: false, bodyRoll: 0, impact: 0,
        tacticTicks: 0, targetLane: 0, racingLane: 0 });
    }

    function standings() {
      if (qualifying) return [...cars].sort((a, b) =>
        (a.bestLap ?? Infinity) - (b.bestLap ?? Infinity) || a.id - b.id);
      return [...cars].sort((a, b) => {
        if (Boolean(a.disconnected) !== Boolean(b.disconnected)) return a.disconnected ? 1 : -1;
        if (a.done && b.done) return a.place - b.place;
        if (a.done) return -1;
        if (b.done) return 1;
        return b.progress - a.progress;
      });
    }

    function step(input = {}) {
      if (phase === 'finished') return;
      for (const player of cars.filter((car) => car.player)) {
      const command = options.online ? input[player.id] || {} : input;
      const shift = command.shiftUp ? 1 : command.shiftDown ? -1 : 0;
      const previousShift = previousShifts.get(player.id) || 0;
      if (player.manual && !player.pitExit && phase === 'racing' && shift && shift !== previousShift && !player.shiftTicks && !player.cooldown) {
        const gear = clamp(player.gear + shift, 1, 6);
        // Bloqueia reduções que ultrapassariam o corte do motor.
        if (gear !== player.gear && (shift > 0 || player.speed * 54 <= gearLimits[gear - 1])) {
          player.gear = gear;
          player.shiftTicks = 14;
          player.cutTicks = 0;
        }
      }
      previousShifts.set(player.id, shift);
      player.lastShift = shift;
      }
      if (phase === 'countdown') {
        for (const car of cars) {
          const command = options.online ? input[car.id] || {} : input;
          car.throttle = car.player ? Number(Boolean(command.accelerate) && !command.brake) : 0.65;
          const target = car.throttle ? 900 + car.throttle * (REV_LIMIT - 900) : 900;
          car.rpm += clamp(target - car.rpm, -95, 125);
          car.limiter = car.rpm >= REV_LIMIT - 20;
          if (car.limiter) car.rpm = countdown % 8 < 4 ? REV_LIMIT : REV_LIMIT - 100;
        }
        if (--countdown <= 0) {
          phase = 'racing';
          cars.forEach((car) => { car.launchTicks = 30; car.limiter = false; });
        }
        return;
      }
      elapsed += 1 / 60;
      const before = cars.map((car) => ({ x: car.x, y: car.y, s: track.nearest(car.x, car.y).progress, pit: car.pitExit }));
      for (const car of cars) {
        if (car.done) continue;
        if (car.pitExit) { exitPit(car); continue; }
        if (car.wallCooldown > 0) car.wallCooldown--;
        if (car.cooldown > 0) { car.cooldown--; continue; }
        const command = options.online ? input[car.id] || {} : input;
        const [steering, pedal] = car.player
          ? [Number(Boolean(command.right)) - Number(Boolean(command.left)), command.brake ? -1 : command.accelerate ? 1 : 0]
          : aiDecision(car);
        advanceCar(track, car, steering, pedal, car.player ? MAX_RACE_SPEED : aiSpeed);
      }

      // Colisões circulares aproximadas, sem permitir empurrar carros para fora.
      for (let i = 0; i < cars.length; i++) {
        for (let j = i + 1; j < cars.length; j++) {
          const a = cars[i], b = cars[j];
          if (qualifying || a.done || b.done || a.cooldown || b.cooldown) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const distance = Math.hypot(dx, dy);
          if (distance >= 17) continue;
          const nx = distance > 0.001 ? dx / distance : Math.cos(a.angle + Math.PI / 2);
          const ny = distance > 0.001 ? dy / distance : Math.sin(a.angle + Math.PI / 2);
          const push = (17 - distance) / 2 + 0.01;
          const aNormal = Math.cos(a.angle) * nx + Math.sin(a.angle) * ny;
          const bNormal = Math.cos(b.angle) * nx + Math.sin(b.angle) * ny;
          const closingSpeed = Math.max(0, a.speed * aNormal - b.speed * bNormal);
          a.impact = Math.max(a.impact || 0, Math.min(1, closingSpeed / 2));
          b.impact = Math.max(b.impact || 0, Math.min(1, closingSpeed / 2));
          for (const [car, sign] of [[a, -1], [b, 1]]) {
            const x = car.x + nx * push * sign, y = car.y + ny * push * sign;
            if (track.contains(x, y, -30)) { car.x = x; car.y = y; }
          }
          // Impulso proporcional à aproximação, sem perder 20% a cada quadro.
          a.speed = clamp(a.speed - closingSpeed * 0.5 * aNormal, 0, a.player ? MAX_RACE_SPEED : aiSpeed);
          b.speed = clamp(b.speed + closingSpeed * 0.5 * bNormal, 0, b.player ? MAX_RACE_SPEED : aiSpeed);
        }
      }

      for (const [index, car] of cars.entries()) {
        if (car.done || car.cooldown || before[index].pit) continue;
        let delta = track.nearest(car.x, car.y).progress - before[index].s;
        if (delta > track.length / 2) delta -= track.length;
        if (delta < -track.length / 2) delta += track.length;
        // Rejeita saltos entre partes do circuito: só movimento local conta.
        if (Math.abs(delta) < 25) car.progress += delta;
        if (car.progress >= (car.checkpoint + 1) * checkpointLength) {
          car.checkpoint++;
          car.checkpointTimes[car.checkpoint] = elapsed;
        }
        car.stalled = delta > 0.1 ? 0 : car.stalled + 1;
        if (!car.player && car.stalled > 120) recover(car);
        if (car.checkpoint >= laps * 12 && car.progress >= track.length * laps) {
          car.done = true;
          car.speed = 0;
          car.rpm = 900;
          car.finishTime = elapsed;
          car.place = ++finishCount;
        }
        const completed = Math.min(laps, Math.floor(car.progress / track.length));
        if (completed > car.completedLaps && car.checkpoint >= completed * 12) {
          const lapTime = elapsed - car.lapStart;
          // Só a classificação tem volta de aquecimento; na corrida todas contam.
          car.lastLap = lapTime;
          car.lastLapKind = car.invalidLap ? 'inválida' : qualifying && car.completedLaps === 0 ? 'aquecimento' : 'válida';
          if ((!qualifying || car.completedLaps >= 1) && !car.invalidLap) {
            car.bestLap = car.bestLap === null ? lapTime : Math.min(car.bestLap, lapTime);
          }
          car.completedLaps = completed;
          car.lapStart = elapsed;
          car.invalidLap = false;
        }
      }
      if (qualifying ? cars.every((car) => car.done) || elapsed >= 300
        : options.online ? cars.filter((car) => car.player).every((car) => car.done) || elapsed >= 900 : cars[0].done) phase = 'finished';
    }

    return {
      cars, laps, pointAt, step, standings, qualifying,
      setTransmission: (mode) => { cars[0].manual = mode === 'manual'; previousShifts.clear(); },
      recoverCar: (id) => { const car = cars.find((item) => item.id === id); if (car) recover(car); },
      gridOrder: () => standings().map((car) => car.id),
      endQualifying: () => { if (qualifying) phase = 'finished'; },
      recoverPlayer: () => recover(cars[0]),
      get phase() { return phase; },
      get countdown() { return Math.ceil(countdown / 60); },
      get startLights() { return phase === 'countdown' ? Math.min(5, 1 + Math.floor((180 - countdown) / 36)) : 0; },
      get elapsed() { return elapsed; },
    };
  };
})();
