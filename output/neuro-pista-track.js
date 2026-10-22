/* Geometria compartilhada pela física e pelas vistas 2D/3D.
 * Uma unidade equivale a 0,25 m; os carros têm cerca de quatro metros.
 */
(() => {
  'use strict';
  const original = [
    [-300, -280], [100, -280], [450, -260], [560, -80],
    [390, 70], [180, 0], [60, 180], [350, 270],
    [270, 430], [-70, 400], [-280, 220], [-520, 300],
    [-650, 100], [-550, -60], [-500, -260],
  ].map(([x, y]) => [x * 1.35, y * 1.35]);
  window.NeuroTracks = [
    { id: 'serra', name: 'Serra Verde', width: 52, controls: original },
    { id: 'veloz', name: 'Autódromo Veloz', width: 56, controls: [
      [-650,-220], [0,-220], [650,-220], [850,0], [650,220], [0,220], [-650,220], [-850,0],
    ] },
    { id: 'tecnico', name: 'Vale Técnico', width: 48, controls: [
      [-600,-350], [-100,-350], [400,-350], [650,-150], [520,70], [240,40],
      [80,250], [360,400], [180,600], [-180,520], [-350,300], [-650,340], [-800,80], [-700,-140],
    ] },
    { id: 'arena', name: 'Arena Drift', driftOnly: true, width: 82, controls: [
      [-650,-360], [-100,-360], [430,-280], [630,-30], [370,170],
      [80,100], [-160,310], [-530,350], [-760,100],
    ] },
  ];
  window.createNeuroTrack = function createNeuroTrack(id = 'serra') {
  const config = window.NeuroTracks.find((item) => item.id === id) || window.NeuroTracks.find(item => item.id === 'serra');
  const controls = config.controls;
  const points = [];
  const halfWidth = config.width;
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
    // Inclui as garagens e o pátio dos boxes nas consultas de posição e câmera.
    const padding = halfWidth + 120;
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
      if (distance < result.distance) result = {
        distance, progress: segment.start + t * segment.size,
        x: segment.a.x + t * segment.dx, y: segment.a.y + t * segment.dy,
        tx: segment.dx / segment.size, ty: segment.dy / segment.size,
      };
    }
    return result;
  }

  // Sensors only need inside/outside, not a nearest-point object for every segment.
  function contains(x, y, margin = 0) {
    const radius = halfWidth - margin;
    if (!(radius > 0)) return false;
    const candidates = grid.get(key(Math.floor(x / cellSize), Math.floor(y / cellSize)));
    if (!candidates) return false;
    const limit = radius * radius;
    for (const segment of candidates) {
      const t = Math.max(0, Math.min(1, ((x - segment.a.x) * segment.dx + (y - segment.a.y) * segment.dy) / segment.size ** 2));
      const dx = x - segment.a.x - t * segment.dx, dy = y - segment.a.y - t * segment.dy;
      if (dx * dx + dy * dy < limit) return true;
    }
    return false;
  }

  function offset(index, distance) {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const angle = Math.atan2(next.y - previous.y, next.x - previous.x);
    return { x: points[index].x - Math.sin(angle) * distance, y: points[index].y + Math.cos(angle) * distance, angle };
  }

  const xs = points.map((p) => p.x);
  function pointAt(distance, lane = 0) {
    const s = ((distance % length) + length) % length;
    const segment = segments.find((part) => s < part.start + part.size) || segments[0];
    const t = (s - segment.start) / segment.size;
    const angle = Math.atan2(segment.dy, segment.dx);
    return { x: segment.a.x + segment.dx * t - Math.sin(angle) * lane,
      y: segment.a.y + segment.dy * t + Math.cos(angle) * lane, angle };
  }
  const pit = {
    limit: 60 / 54, entry: 20, entryEnd: 360, mergeStart: 640, exit: 810,
    garage: (index) => ({ distance: 400 + index * 26, lane: halfWidth + 72 }),
    lane(distance) {
      const t = Math.max(0, Math.min(1, (distance - this.mergeStart) / (this.exit - this.mergeStart)));
      return (halfWidth + 52) * (1 - t * t * (3 - 2 * t));
    },
    route(index) {
      const garage = this.garage(index), route = [];
      for (let step = 0; step <= 24; step++) {
        const t = step / 24;
        route.push(pointAt(garage.distance + 18 * t ** 3,
          garage.lane - 20 * (1 - (1 - t) ** 3)));
      }
      for (let distance = garage.distance + 18; distance < this.exit; distance += 3) route.push(pointAt(distance, this.lane(distance)));
      route.push(pointAt(this.exit, 0));
      return route;
    },
  };
  const ys = points.map((p) => p.y);
  const bounds = { minX: Math.min(...xs) - 50, maxX: Math.max(...xs) + 50, minY: Math.min(...ys) - 50, maxY: Math.max(...ys) + 50 };
  // Terreno contínuo: mesma superfície para asfalto, gramado, carros e câmera.
  const reliefScale = config.id === 'arena' ? .15 : config.id === 'veloz' ? 0.4 : config.id === 'tecnico' ? 1.2 : 1;
  function heightAt(x, y) {
    return 30 + reliefScale * (18 * Math.sin(x / 300) + 12 * Math.cos(y / 220)
      + 8 * Math.sin((x + y) / 400));
  }
  // Trace the actual distance boundary. Simple offset curves fold over themselves
  // in tight hairpins, producing decorative rails inside the driveable area.
  let cachedBarriers;
  function barrierSegments() {
    if (cachedBarriers) return cachedBarriers;
    const radius = halfWidth + 40, step = 12, padding = radius + step;
    const x0 = bounds.minX - padding, y0 = bounds.minY - padding;
    const nx = Math.ceil((bounds.maxX + padding - x0) / step);
    const ny = Math.ceil((bounds.maxY + padding - y0) / step);
    const rows = Array.from({ length: ny + 1 }, (_, j) => Array.from({ length: nx + 1 }, (_, i) => {
      const x = x0 + i * step, y = y0 + j * step;
      return { x, y, d: Math.min(radius + step, nearest(x, y).distance) - radius };
    }));
    const result = [];
    function triangle(vertices) {
      const ends = [];
      for (let i = 0; i < 3; i++) {
        const a = vertices[i], b = vertices[(i + 1) % 3];
        if ((a.d < 0) === (b.d < 0)) continue;
        const t = a.d / (a.d - b.d);
        ends.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
      if (ends.length !== 2 || Math.hypot(ends[1].x - ends[0].x, ends[1].y - ends[0].y) < 1e-8) return;
      const middle = nearest((ends[0].x + ends[1].x) / 2, (ends[0].y + ends[1].y) / 2);
      const side = Math.sign(((ends[0].x + ends[1].x) / 2 - middle.x) * -middle.ty
        + ((ends[0].y + ends[1].y) / 2 - middle.y) * middle.tx);
      const angle = Math.atan2(ends[1].y - ends[0].y, ends[1].x - ends[0].x);
      ends.forEach(point => { point.angle = angle; });
      result.push({ ends, side, progress: middle.progress });
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = rows[j][i], b = rows[j][i + 1], c = rows[j + 1][i + 1], d = rows[j + 1][i];
      triangle([a, b, c]); triangle([a, c, d]);
    }
    return cachedBarriers = result;
  }
  return {
    id: config.id, name: config.name,
    points, segments, length, halfWidth, bounds, nearest, offset, heightAt, pointAt, pit, barrierSegments,
    start: offset(0, 0),
    contains,
  };
  };
  window.NeuroTrack = window.createNeuroTrack();
})();
