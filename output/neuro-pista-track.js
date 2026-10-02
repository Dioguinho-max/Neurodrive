/* Geometria compartilhada pela física e pelas vistas 2D/3D.
 * Uma unidade equivale a 0,25 m; os carros têm cerca de quatro metros.
 */
(() => {
  'use strict';
  const controls = [
    [-300, -280], [100, -280], [450, -260], [560, -80],
    [390, 70], [180, 0], [60, 180], [350, 270],
    [270, 430], [-70, 400], [-280, 220], [-520, 300],
    [-650, 100], [-550, -60], [-500, -260],
  ];
  const points = [];
  const halfWidth = 32;
  const cellSize = 80;
  const grid = new Map();
  const key = (x, y) => `${x},${y}`;

  // Interpolação Catmull–Rom fechada, sem dependência do renderizador.
  function interpolate(a, b, c, d, t) {
    return 0.5 * ((2 * b) + (-a + c) * t
      + (2 * a - 5 * b + 4 * c - d) * t * t
      + (-a + 3 * b - 3 * c + d) * t * t * t);
  }

  for (let i = 0; i < controls.length; i++) {
    const at = (offset) => controls[(i + offset + controls.length) % controls.length];
    for (let step = 0; step < 20; step++) {
      const t = step / 20;
      points.push({
        x: interpolate(at(-1)[0], at(0)[0], at(1)[0], at(2)[0], t),
        y: interpolate(at(-1)[1], at(0)[1], at(1)[1], at(2)[1], t),
      });
    }
  }

  let length = 0;
  const segments = points.map((a, i) => {
    const b = points[(i + 1) % points.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const size = Math.hypot(dx, dy);
    const segment = { a, b, dx, dy, size, start: length };
    length += size;
    // Indexação espacial evita percorrer a pista inteira a cada sensor.
    const padding = halfWidth + 12;
    for (let x = Math.floor((Math.min(a.x, b.x) - padding) / cellSize); x <= Math.floor((Math.max(a.x, b.x) + padding) / cellSize); x++) {
      for (let y = Math.floor((Math.min(a.y, b.y) - padding) / cellSize); y <= Math.floor((Math.max(a.y, b.y) + padding) / cellSize); y++) {
        const cell = key(x, y);
        if (!grid.has(cell)) grid.set(cell, []);
        grid.get(cell).push(segment);
      }
    }
    return segment;
  });

  function nearest(x, y) {
    const candidates = grid.get(key(Math.floor(x / cellSize), Math.floor(y / cellSize))) || [];
    let result = { distance: Infinity, progress: 0 };
    for (const segment of candidates) {
      const t = Math.max(0, Math.min(1, ((x - segment.a.x) * segment.dx + (y - segment.a.y) * segment.dy) / segment.size ** 2));
      const distance = Math.hypot(x - segment.a.x - t * segment.dx, y - segment.a.y - t * segment.dy);
      if (distance < result.distance) result = { distance, progress: segment.start + t * segment.size };
    }
    return result;
  }

  function offset(index, distance) {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const angle = Math.atan2(next.y - previous.y, next.x - previous.x);
    return { x: points[index].x - Math.sin(angle) * distance, y: points[index].y + Math.cos(angle) * distance, angle };
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const bounds = { minX: Math.min(...xs) - 50, maxX: Math.max(...xs) + 50, minY: Math.min(...ys) - 50, maxY: Math.max(...ys) + 50 };
  window.NeuroTrack = {
    points, segments, length, halfWidth, bounds, nearest, offset,
    start: offset(0, 0),
    contains: (x, y, margin = 0) => nearest(x, y).distance < halfWidth - margin,
  };
})();
