(() => {
  'use strict';

  // 1. Configuração e acesso aos elementos da página
  const root = document.getElementById('neuro-pista');
  const element = (id) => root.querySelector(`#np-${id}`);
  const FULL_TURN = Math.PI * 2;
  let populationSize = 40;
  const track = window.NeuroTrack;
  const MAX_SPEED = 3.2;
  const SENSOR_RANGE = 160;
  const SENSOR_ANGLES = [-1.2, -0.6, 0, 0.6, 1.2];
  const INPUT_NAMES = [
    'Esq. externa', 'Esq. frontal', 'Frente',
    'Dir. frontal', 'Dir. externa', 'Velocidade',
  ];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const format = (value) => value.toFixed(3);
  const copyBrain = (brain) => brain.map((layer) => layer.map((row) => row.slice()));

  // Semente fixa: a mesma sequência permite comparar alterações na simulação.
  let seed = 73819;

  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function gaussian() {
    return Math.sqrt(-2 * Math.log(Math.max(1e-9, random())))
      * Math.cos(FULL_TURN * random());
  }

  // 2. Rede neural: seis entradas, seis neurônios ocultos e duas saídas
  // Cada linha contém seis pesos e, na última posição, o viés do neurônio.
  function createBrain() {
    // Ponto de partida informado: procurar espaço livre e reduzir a velocidade
    // quando o sensor frontal encurta. A evolução continua ajustando os pesos.
    // Não usa a linha central da pista para comandar o carro.
    const hidden = Array.from({ length: 6 }, (_, neuron) =>
      Array.from({ length: 7 }, (_, input) => input === neuron ? 1 : 0));
    const outputs = [
      [-1.5, -3, 0, 3, 1.5, 0, 0],
      [0, 0, 2.5, 0, 0, -2, 0.2],
    ];
    return [hidden, outputs].map((layer) => layer.map((weights) =>
      weights.map((weight) => weight + gaussian() * 0.025)));
  }

  function forward(brain, inputs) {
    const activations = [inputs];

    for (const layer of brain) {
      const previous = activations[activations.length - 1];
      const outputs = layer.map((weights) => {
        const bias = weights[weights.length - 1];
        const sum = weights.slice(0, -1).reduce(
          (total, weight, index) => total + weight * previous[index],
          bias,
        );
        return Math.tanh(sum);
      });
      activations.push(outputs);
    }

    return activations;
  }

  // 3. Geometria da pista, sensores e criação dos carros
  function isOnRoad(x, y, margin = 0) {
    return track.contains(x, y, margin);
  }

  function readSensors(car) {
    return SENSOR_ANGLES.map((offset) => {
      let distance = 0;
      for (; distance < SENSOR_RANGE; distance += 4) {
        const x = car.x + Math.cos(car.angle + offset) * distance;
        const y = car.y + Math.sin(car.angle + offset) * distance;
        if (!isOnRoad(x, y)) {
          // Refina a borda para evitar saltos de quatro unidades nos sensores.
          let near = Math.max(0, distance - 4);
          let far = distance;
          for (let step = 0; step < 3; step++) {
            const middle = (near + far) / 2;
            if (isOnRoad(car.x + Math.cos(car.angle + offset) * middle,
              car.y + Math.sin(car.angle + offset) * middle)) near = middle;
            else far = middle;
          }
          distance = near;
          break;
        }
      }
      return distance / SENSOR_RANGE;
    });
  }

  function createCar(brain, index) {
    const car = {
      brain,
      id: index + 1,
      x: track.start.x,
      y: track.start.y,
      angle: track.start.angle,
      speed: 0,
      steering: 0,
      progress: 0,
      best: 0,
      alive: true,
      done: false,
      age: 0,
      stalledTicks: 0,
    };
    car.inputs = [...readSensors(car), 0];
    car.activations = forward(brain, car.inputs);
    return car;
  }

  let generation = 1;
  let ticks = 0;
  let record = 0;
  let population = Array.from(
    { length: populationSize },
    (_, index) => createCar(createBrain(), index),
  );
  let leader = population[0];
  let running = false;
  let rate = 1;
  let totalFinishes = 0;
  let track3D = null;

  // 4. Neuroevolução: preserva até três elites e adapta a seleção à população.
  function nextGeneration() {
    population.sort((a, b) => b.best - a.best);
    record = Math.max(record, population[0].best);
    const elite = population.slice(0, 6).map((car) => copyBrain(car.brain));

    population = Array.from({ length: populationSize }, (_, index) => {
      let brain;

      if (index < Math.min(3, populationSize - 1)) {
        brain = copyBrain(elite[index]);
      } else if (populationSize > 10 && index > populationSize - 4) {
        brain = createBrain();
      } else {
        brain = copyBrain(elite[Math.floor(random() * elite.length)]);
        for (const layer of brain) {
          for (const weights of layer) {
            for (let i = 0; i < weights.length; i++) {
              if (random() < 0.2) {
                weights[i] = clamp(weights[i] + gaussian() * (index % 7 === 0 ? 0.18 : 0.045), -6, 6);
              }
            }
          }
        }
      }

      return createCar(brain, index);
    });

    generation++;
    ticks = 0;
    leader = population[0];
    element('announce').textContent =
      `Geração ${generation}. Melhor percurso: ${Math.round(record / track.length * 100)}%.`;
  }

  // 5. Um passo de física e decisão para toda a população
  function tick() {
    if (ticks >= Math.ceil(track.length / MAX_SPEED * 5) || !population.some((car) => car.alive)) {
      nextGeneration();
    }
    ticks++;

    for (const car of population) {
      if (!car.alive) continue;

      car.inputs = [...readSensors(car), car.speed / MAX_SPEED];
      car.activations = forward(car.brain, car.inputs);
      const [steering, pedal] = car.activations[2];

      // Atuadores suaves: volante não muda de um extremo ao outro instantaneamente.
      car.steering += clamp(steering - car.steering, -0.06, 0.06);
      const acceleration = pedal >= 0 ? pedal * 0.055 : pedal * 0.13;
      car.speed = clamp(car.speed + acceleration - 0.01, 0, MAX_SPEED);
      car.angle += car.steering * 0.065 * car.speed / MAX_SPEED;
      const previousProgress = track.nearest(car.x, car.y).progress;
      car.x += Math.cos(car.angle) * car.speed;
      car.y += Math.sin(car.angle) * car.speed;

      // Mede o progresso ao longo do circuito, incluindo a linha de chegada.
      let distanceDelta = track.nearest(car.x, car.y).progress - previousProgress;
      if (distanceDelta > track.length / 2) distanceDelta -= track.length;
      if (distanceDelta < -track.length / 2) distanceDelta += track.length;
      car.progress += distanceDelta;
      car.age++;

      if (car.progress > car.best + 0.1) {
        car.best = car.progress;
        car.stalledTicks = 0;
      } else {
        car.stalledTicks++;
      }

      record = Math.max(record, car.best);
      if (car.progress >= track.length) {
        car.done = true;
        car.alive = false;
        totalFinishes++;
      } else if (
        !isOnRoad(car.x, car.y, 9)
        || car.stalledTicks > 160
        || car.progress < -50
      ) {
        car.alive = false;
      }
    }

    const alive = population.filter((car) => car.alive);
    leader = (alive.length ? alive : population).reduce(
      (best, car) => car.best > best.best ? car : best,
    );
  }

  // 6. Desenho: cores do CSS e preparação dos canvases
  const colors = {};

  function updatePalette() {
    const probe = document.createElement('span');
    root.appendChild(probe);
    const variables = {
      foreground: '--foreground',
      muted: '--muted-foreground',
      road: '--muted',
      edge: '--border',
      positive: '--viz-series-1',
      negative: '--viz-series-2',
      background: '--background',
    };

    for (const [name, variable] of Object.entries(variables)) {
      probe.style.color = `var(${variable})`;
      colors[name] = getComputedStyle(probe).color;
    }
    probe.remove();
  }

  function prepareCanvas(id) {
    const canvas = element(id);
    const width = canvas.clientWidth;
    const height = id === 'network' ? 380 : 280;
    const pixelRatio = window.devicePixelRatio || 1;

    if (canvas.width !== Math.round(width * pixelRatio) || canvas.height !== height * pixelRatio) {
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = height * pixelRatio;
    }

    const context = canvas.getContext('2d');
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    return { context, width, height };
  }

  function drawTrack() {
    const progress = Math.max(0, leader.progress / track.length * 100).toFixed(1);
    const status = leader.done ? ' · volta completa' : leader.alive ? '' : ' · encerrado';
    element('track-label').textContent = `Líder #${leader.id} · percurso ${progress}%${status}`;

    if (track3D) {
      const target = population.find((car) => car.id === Number(element('target').value)) || leader;
      track3D.update(population, leader, element('sensors').checked, target);
      return;
    }

    const { context, width, height } = prepareCanvas('track');
    const bounds = track.bounds;
    const scale = Math.min((width - 20) / (bounds.maxX - bounds.minX), (height - 24) / (bounds.maxY - bounds.minY));
    context.save();
    context.translate(width / 2, height / 2);
    context.scale(scale, scale);
    context.translate(-(bounds.minX + bounds.maxX) / 2, -(bounds.minY + bounds.maxY) / 2);
    context.beginPath();
    track.points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.lineJoin = 'round';
    context.lineWidth = track.halfWidth * 2;
    context.strokeStyle = colors.road;
    context.stroke();
    context.lineWidth = 1 / scale;
    context.strokeStyle = colors.edge;
    context.setLineDash([12, 16]);
    context.stroke();
    context.setLineDash([]);

    if (element('sensors').checked) {
      context.strokeStyle = colors.positive;
      context.lineWidth = 1 / scale;
      SENSOR_ANGLES.forEach((angle, index) => {
        const distance = leader.inputs[index] * SENSOR_RANGE;
        context.beginPath();
        context.moveTo(leader.x, leader.y);
        context.lineTo(
          leader.x + Math.cos(leader.angle + angle) * distance,
          leader.y + Math.sin(leader.angle + angle) * distance,
        );
        context.stroke();
      });
    }

    // O líder é desenhado por último para aparecer sobre os demais carros.
    const drawingOrder = [...population.filter((car) => car !== leader), leader];
    for (const car of drawingOrder) {
      context.save();
      context.translate(car.x, car.y);
      context.rotate(car.angle);
      context.globalAlpha = car === leader ? 1 : car.alive ? 0.45 : 0.15;
      context.fillStyle = car === leader ? colors.positive : colors.foreground;
      context.fillRect(-8, -4.5, 16, 9);
      context.fillStyle = colors.background;
      context.fillRect(1, -3, 3, 6);
      context.restore();
    }
    context.restore();

  }

  let networkNodes = [];

  function drawNetwork() {
    const { context, width } = prepareCanvas('network');
    const activations = leader.activations;
    const positionsX = [52, width / 2, width - 48];
    const selected = Number(element('neuron').value);
    networkNodes = [];
    const positionsY = activations.map((layer) => layer.map(
      (_, index) => layer.length === 2 ? 125 + index * 130 : 52 + index * 59,
    ));

    context.font = '12px sans-serif';
    context.textAlign = 'center';
    context.fillStyle = colors.muted;
    ['Entradas', 'Oculta', 'Saídas'].forEach((label, index) => {
      context.fillText(label, positionsX[index], 15);
    });

    // Conexões: a intensidade representa o produto entrada × peso.
    for (let layer = 0; layer < 2; layer++) {
      for (let target = 0; target < activations[layer + 1].length; target++) {
        for (let source = 0; source < activations[layer].length; source++) {
          const value = leader.brain[layer][target][source] * activations[layer][source];
          const focused = selected === (layer === 0 ? target : target + 6);
          context.globalAlpha = focused ? clamp(Math.abs(value) * 0.6, 0.3, 0.95) : 0.08;
          context.strokeStyle = value >= 0 ? colors.positive : colors.negative;
          context.lineWidth = focused ? 1 + Math.min(3, Math.abs(value) * 2) : 0.7;
          context.beginPath();
          context.moveTo(positionsX[layer], positionsY[layer][source]);
          context.lineTo(positionsX[layer + 1], positionsY[layer + 1][target]);
          context.stroke();
        }
      }
    }

    context.globalAlpha = 1;
    for (let layer = 0; layer < 3; layer++) {
      activations[layer].forEach((value, index) => {
        const x = positionsX[layer];
        const y = positionsY[layer][index];
        context.beginPath();
        context.arc(x, y, 14, 0, FULL_TURN);
        context.fillStyle = colors.road;
        context.fill();
        context.globalAlpha = Math.max(0.15, Math.abs(value));
        context.fillStyle = value >= 0 ? colors.positive : colors.negative;
        context.fill();
        context.globalAlpha = 1;
        context.fillStyle = colors.foreground;

        context.textAlign = 'center';
        const label = layer === 0 ? ['E2', 'E1', 'Frente', 'D1', 'D2', 'Vel.'][index]
          : layer === 1 ? `H${index + 1}` : index === 0 ? 'Direção' : 'Pedal';
        context.fillText(label, x, y - 20);
        // Valores fora do preenchimento mantêm contraste em ambos os temas.
        context.fillText(value.toFixed(2), x, y + 26);
        if (layer > 0) {
          const neuron = layer === 1 ? index : index + 6;
          networkNodes.push({ x, y, neuron, label });
          if (selected === neuron) {
            context.beginPath();
            context.arc(x, y, 18, 0, FULL_TURN);
            context.strokeStyle = colors.foreground;
            context.lineWidth = 2;
            context.stroke();
          }
        }
      });
    }

    element('network-title').textContent = `Rede do líder #${leader.id} · 6 → 6 → 2`;
    const [steering, pedal] = activations[2];
    element('steering-meter').value = steering;
    element('pedal-meter').value = pedal;
    element('applied').textContent = `Volante aplicado: ${format(leader.steering)} · Velocidade: ${(leader.speed * 0.25 * 60 * 3.6).toFixed(0)} km/h`;
    element('sum').textContent = running ? 'Pause para conferir os produtos e o viés.' : element('sum').textContent;
    const direction = steering < -0.08 ? 'Esquerda' : steering > 0.08 ? 'Direita' : 'Reto';
    const action = pedal >= 0 ? 'Acelerar' : 'Frear';
    element('actions').textContent =
      `${direction} ${format(steering)} · ${action} ${format(Math.abs(pedal))}`;
  }

  // 7. Inspeção do neurônio e atualização dos indicadores
  function inspectNeuron() {
    const selected = Number(element('neuron').value);
    const layer = selected < 6 ? 0 : 1;
    const neuron = selected < 6 ? selected : selected - 6;
    const weights = leader.brain[layer][neuron];
    const inputs = leader.activations[layer];
    const bias = weights[6];
    const sum = bias + inputs.reduce((total, input, index) => total + input * weights[index], 0);

    element('sum').textContent = `z = ${format(sum)} → tanh(z) = ${format(Math.tanh(sum))}`;
    element('terms').innerHTML = inputs.map((input, index) => `
      <tr>
        <td>${layer === 0 ? INPUT_NAMES[index] : `H${index + 1}`}</td>
        <td class="text-end">${format(input)} × ${format(weights[index])}</td>
        <td class="text-end">${format(input * weights[index])}</td>
      </tr>
    `).join('') + `
      <tr>
        <td>Viés</td>
        <td class="text-end">1 × ${format(bias)}</td>
        <td class="text-end">${format(bias)}</td>
      </tr>
    `;
  }

  function draw() {
    updatePalette();
    drawTrack();
    drawNetwork();

    const alive = population.filter((car) => car.alive).length;
    const bestProgress = Math.min(100, record / track.length * 100).toFixed(1);
    element('stats').textContent =
      `Geração ${generation} · Vivos ${alive}/${populationSize} · Recorde ${bestProgress}% · Voltas ${totalFinishes}`;
    element('inspect').hidden = running;
    if (!running) inspectNeuron();
  }

  // 8. Preferências opcionais da visualização na conversa
  // No navegador comum, a ausência de window.openai não impede a simulação.
  function savePreferences() {
    window.openai?.setWidgetState?.({
      modelContent: {
        simulation: 'Neuroevolução de carros',
        speed: rate,
        sensors: element('sensors').checked,
      },
      privateContent: { neuron: element('neuron').value },
    })?.catch(() => {});
  }

  function restorePreferences(state) {
    if (!state) return;
    const speed = Number(state.modelContent?.speed);
    rate = [1, 4, 12].includes(speed) ? speed : 1;
    element('rate').value = String(rate);
    element('sensors').checked = state.modelContent?.sensors !== false;

    const neuron = Number(state.privateContent?.neuron);
    element('neuron').value = String(
      Number.isInteger(neuron) && neuron >= 0 && neuron < 8 ? neuron : 0,
    );
  }

  // 9. Inicialização e eventos dos controles
  function refreshPopulationControls() {
    element('target').innerHTML = '<option value="auto">Líder automático</option>'
      + population.map((car) => `<option value="${car.id}">Carro #${car.id}</option>`).join('');
    element('target').value = 'auto';
    element('track-title').textContent = `Circuito · ${populationSize} carros · ${(track.length * 0.25 / 1000).toFixed(2)} km`;
  }

  function initializeControls() {
    refreshPopulationControls();
    element('target').onchange = draw;
    element('apply-count').onclick = () => {
      const count = Number(element('count').value);
      if (!Number.isInteger(count) || count < 1 || count > 100) {
        element('count').setCustomValidity('Escolha um número inteiro de 1 a 100.');
        element('count').reportValidity();
        return;
      }
      element('count').setCustomValidity('');
      populationSize = count;
      generation = 1;
      ticks = 0;
      record = 0;
      totalFinishes = 0;
      population = Array.from({ length: populationSize }, (_, index) => createCar(createBrain(), index));
      leader = population[0];
      refreshPopulationControls();
      draw();
      element('announce').textContent = `Treinamento reiniciado com ${count} carros.`;
    };
    element('count').oninput = () => element('count').setCustomValidity('');
    element('neuron').innerHTML = Array.from({ length: 8 }, (_, index) => {
      const label = index < 6
        ? `Oculta H${index + 1}`
        : index === 6 ? 'Saída: direção' : 'Saída: pedal';
      return `<option value="${index}">${label}</option>`;
    }).join('');
    restorePreferences(window.openai?.widgetState);

    element('play').onclick = () => {
      running = !running;
      element('play').textContent = running ? 'Pausar' : 'Continuar treinamento';
      draw();
    };

    element('step').onclick = () => {
      running = false;
      element('play').textContent = 'Continuar treinamento';
      tick();
      draw();
      element('announce').textContent = `Passo ${ticks} da geração ${generation}`;
    };

    function selectNeuron() {
      running = false;
      element('play').textContent = 'Continuar treinamento';
      draw();
      savePreferences();
      element('announce').textContent = 'Neurônio selecionado; simulação pausada.';
    }
    element('neuron').onchange = selectNeuron;
    element('network').onclick = (event) => {
      const bounds = element('network').getBoundingClientRect();
      const x = (event.clientX - bounds.left) * element('network').clientWidth / bounds.width;
      const y = (event.clientY - bounds.top) * 380 / bounds.height;
      const node = networkNodes.find((item) => Math.hypot(item.x - x, item.y - y) <= 23);
      if (!node) return;
      element('neuron').value = String(node.neuron);
      selectNeuron();
    };

    element('rate').onchange = () => {
      rate = Number(element('rate').value);
      savePreferences();
    };

    element('sensors').onchange = () => {
      draw();
      savePreferences();
    };

    window.addEventListener('openai:set_globals', (event) => {
      restorePreferences(event.detail?.globals?.widgetState);
      draw();
    });
    new ResizeObserver(draw).observe(root);
  }

  // 10. Animação com física fixa a 60 passos por segundo de simulação
  let previousTime = 0;
  let accumulatedTime = 0;

  function frame(time) {
    if (running) {
      accumulatedTime += Math.min(time - previousTime, 80) * rate;
      let steps = 0;
      while (accumulatedTime >= 1000 / 60 && steps < 60) {
        tick();
        accumulatedTime -= 1000 / 60;
        steps++;
      }
      draw();
    } else {
      accumulatedTime = 0;
    }

    previousTime = time;
    requestAnimationFrame(frame);
  }

  // O desenho 3D lê os carros; a física e a neuroevolução continuam independentes.
  try {
    track3D = window.createNeuroTrack3D(element);
    element('track').hidden = true;
    element('track-3d').hidden = false;
    element('camera-controls').hidden = false;
    element('3d-status').textContent = 'Arraste para girar · use a roda do mouse para aproximar · líder em verde';
  } catch (error) {
    element('3d-status').textContent = '3D indisponível neste navegador. A simulação continua em 2D.';
    console.warn('Não foi possível iniciar a pista 3D:', error);
  }

  initializeControls();
  draw();
  requestAnimationFrame(frame);
})();
