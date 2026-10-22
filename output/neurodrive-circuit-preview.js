/* Preview uses the same sampled centerline as the physics, cached per circuit. */
(() => {
  const cache = new Map();
  const descriptions = {
    serra: ['Intermediário', 'Curvas variadas e mudanças de relevo.'],
    veloz: ['Acessível', 'Retas longas e curvas abertas de alta velocidade.'],
    tecnico: ['Exigente', 'Sequências fechadas que exigem precisão.'],
    arena: ['Treino de Drift', 'Pista larga, curvas conectadas e relevo suave.'],
  };
  window.updateNeuroCircuitPreview = (get) => {
    const championship = get('menu-mode').value === 'championship';
    const id = championship ? 'serra' : get('menu-track').value;
    if (!descriptions[id]) return;
    let entry = cache.get(id);
    if (!entry) {
      const track = window.createNeuroTrack(id), points = track.points;
      const minX = Math.min(...points.map(p => p.x)), minY = Math.min(...points.map(p => p.y));
      const width = Math.max(...points.map(p => p.x)) - minX, height = Math.max(...points.map(p => p.y)) - minY;
      const scale = Math.min(270 / width, 150 / height);
      const project = p => [(300 - width * scale) / 2 + (p.x - minX) * scale, (180 - height * scale) / 2 + (p.y - minY) * scale];
      const path = points.map((p, i) => `${i ? 'L' : 'M'}${project(p).map(n => n.toFixed(2)).join(' ')}`).join(' ') + 'Z';
      const [x,y] = project(points[0]);
      entry = { name:track.name, length:track.length / 4000,
        svg:`<svg viewBox="0 0 300 180" aria-hidden="true"><path d="${path}" fill="none" stroke="#99f0c824" stroke-width="14"/><path d="${path}" fill="none" stroke="#99f0c8" stroke-width="3" stroke-linejoin="round"/><circle cx="${x}" cy="${y}" r="5" fill="#f5d88c" stroke="#0c1820" stroke-width="2"/></svg>` };
      cache.set(id, entry);
    }
    get('circuit-preview-map').innerHTML = entry.svg;
    get('circuit-preview-name').textContent = entry.name;
    get('circuit-preview-eyebrow').textContent = championship ? 'CAMPEONATO · PRIMEIRA ETAPA' : 'SEU PRÓXIMO CIRCUITO';
    get('circuit-preview-length').textContent = `${entry.length.toFixed(2)} km · Traçado completo`;
    get('circuit-preview-difficulty').textContent = `Perfil: ${descriptions[id][0]}`;
    get('circuit-preview-description').textContent = descriptions[id][1];
  };
})();
