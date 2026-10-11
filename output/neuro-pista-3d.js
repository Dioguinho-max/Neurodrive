/* Renderização independente: recebe o estado dos carros sem alterar a simulação.
 * Three.js r160 está em vendor/ para permitir abrir o HTML sem servidor ou internet.
 * Coordenadas: o (x, y) da simulação corresponde a (x, altura, z) no mundo 3D.
 */
(() => {
  'use strict';

  window.createNeuroTrack3D = function createNeuroTrack3D(element, options = {}) {
    const THREE = window.THREE;
    if (!THREE) throw new Error('Three.js não foi carregado.');

    const track = options.track || window.NeuroTrack;
    const canvas = element('track-3d');
    const listeners = [];
    function listen(type, handler, settings) {
      canvas.addEventListener(type, handler, settings);
      listeners.push([type, handler, settings]);
    }
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: options.quality !== 'performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#b9d5e6');
    scene.fog = new THREE.Fog('#b9d5e6', 1700, 4200);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 5000);
    scene.add(new THREE.HemisphereLight('#eef8ff', '#526845', 2.4));

    const sun = new THREE.DirectionalLight('#fff5dd', 3);
    sun.position.set(-400, 900, 350);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -900, right: 900, top: 800, bottom: -800, near: 1, far: 2000 });
    sun.shadow.bias = -0.001;
    scene.add(sun);
    scene.add(sun.target);

    // Materiais e geometrias compartilhados entre todos os carros.
    const material = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.65, ...extra });
    const textures = [];
    let textureSeed = 1947;
    const random = () => { textureSeed = (Math.imul(textureSeed, 1664525) + 1013904223) >>> 0; return textureSeed / 4294967296; };
    const grain = new Uint8Array(256 * 256 * 4);
    for (let i = 0; i < 256 * 256; i++) {
      const shade = 155 + random() * 30;
      grain.set([shade, shade, shade, 255], i * 4);
    }
    const asphaltMap = new THREE.DataTexture(grain, 256, 256);
    asphaltMap.wrapS = asphaltMap.wrapT = THREE.RepeatWrapping;
    asphaltMap.magFilter = THREE.LinearFilter;
    asphaltMap.minFilter = THREE.LinearMipmapLinearFilter;
    asphaltMap.generateMipmaps = true;
    asphaltMap.needsUpdate = true;
    textures.push(asphaltMap);
    const asphalt = material('#555c65', { map: asphaltMap, roughness: 0.96 });
    const dryAsphaltColor = asphalt.color.clone(), wetAsphaltColor = asphalt.color.clone().multiplyScalar(.6);
    const drySkyColor = scene.background.clone(), rainySkyColor = new THREE.Color('#627789');
    let environmentMap = null;
    function getEnvironment() {
      if (environmentMap) return environmentMap;
      // Céu panorâmico procedural para reflexos da pintura; não exige downloads.
      const data = new Uint8Array(256 * 128 * 4);
      for (let y = 0; y < 128; y++) {
        const top = y / 127;
        for (let x = 0; x < 256; x++) {
          const glow = Math.exp(-((x - 58) ** 2 / 100 + (y - 40) ** 2 / 30));
          const color = top < 0.52 ? [95 + top * 230, 150 + top * 160, 210 + top * 65] : [74, 94, 65];
          data.set([...color.map((channel) => Math.min(255, channel + glow * 110)), 255], (y * 256 + x) * 4);
        }
      }
      environmentMap = new THREE.DataTexture(data, 256, 128);
      environmentMap.mapping = THREE.EquirectangularReflectionMapping;
      environmentMap.colorSpace = THREE.SRGBColorSpace;
      environmentMap.needsUpdate = true;
      textures.push(environmentMap);
      return environmentMap;
    }
    const grassPixels = new Uint8Array(128 * 128 * 4);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const patch = Math.sin(x * Math.PI / 32) * Math.cos(y * Math.PI / 32) * 14 + random() * 23;
      grassPixels.set([100 + patch, 126 + patch, 64 + patch * 0.6, 255], (y * 128 + x) * 4);
    }
    const grassMap = new THREE.DataTexture(grassPixels, 128, 128);
    grassMap.wrapS = grassMap.wrapT = THREE.RepeatWrapping;
    grassMap.repeat.set(100, 90);
    grassMap.magFilter = THREE.LinearFilter; grassMap.minFilter = THREE.LinearMipmapLinearFilter;
    grassMap.generateMipmaps = true; grassMap.needsUpdate = true; textures.push(grassMap);
    const grass = material('#b5c29a', { map: grassMap, roughness: 1 });
    const white = material('#eef3f5');
    const red = material('#d26758');
    const rubber = material('#19212c');
    const glass = material('#172d3d', { metalness: 0.55, roughness: 0.12, clearcoat: 1 });
    const bodyMaterials = [material('#53a8da'), material('#f0b65e'), material('#b09bde')];
    const leaderMaterial = material('#48e6a4', { emissive: '#123d2c', emissiveIntensity: 0.25 });
    const crashedMaterial = material('#657078');
    const brakeMaterial = material('#ff2929', { emissive: '#ff1515', emissiveIntensity: 1 });

    function addMesh(geometry, surface, parent, position) {
      const mesh = new THREE.Mesh(geometry, surface);
      if (position) mesh.position.set(...position);
      parent.add(mesh);
      return mesh;
    }

    // Faixas da pista geradas a partir da mesma linha central da fisica.
    function ribbon(inner, outer, surface, from = 0, count = track.points.length) {
      const vertices = [], uv = [];
      for (let step = 0; step < count; step++) {
        const i = (from + step) % track.points.length;
        const next = (i + 1) % track.points.length;
        // A malha deve acompanhar o relevo também na largura do asfalto.
        const bands = Math.max(1, Math.ceil(Math.abs(outer - inner) / 8));
        for (let band = 0; band < bands; band++) {
        const lo = inner + (outer - inner) * band / bands;
        const hi = inner + (outer - inner) * (band + 1) / bands;
        const a = track.offset(i, lo), b = track.offset(i, hi);
        const c = track.offset(next, lo), d = track.offset(next, hi);
        for (const point of [a, c, b, b, c, d]) {
          vertices.push(point.x, track.heightAt(point.x, point.y) + 0.15, point.y);
          uv.push(point.x / 12, point.y / 12);
        }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geometry.computeVertexNormals();
      surface.side = THREE.DoubleSide;
      const mesh = addMesh(geometry, surface, scene);
      mesh.receiveShadow = true;
      return mesh;
    }

    const terrain = new THREE.PlaneGeometry(4000, 3500, 140, 120);
    terrain.rotateX(-Math.PI / 2);
    const terrainPoints = terrain.attributes.position;
    for (let i = 0; i < terrainPoints.count; i++) {
      terrainPoints.setY(i, track.heightAt(terrainPoints.getX(i), terrainPoints.getZ(i)) - 0.8);
    }
    terrain.computeVertexNormals();
    const ground = addMesh(terrain, grass, scene);
    ground.receiveShadow = true;
    ribbon(-track.halfWidth, track.halfWidth, asphalt);
    for (let i = 0; i < track.points.length; i += 2) {
      const surface = i % 4 ? red : white;
      ribbon(-track.halfWidth - 4, -track.halfWidth, surface, i, 2);
      ribbon(track.halfWidth, track.halfWidth + 4, surface, i, 2);
    }
    const roadMarking = white.clone();
    roadMarking.polygonOffset = true;
    roadMarking.polygonOffsetFactor = -1;
    roadMarking.polygonOffsetUnits = -1;
    ribbon(-track.halfWidth + 1, -track.halfWidth + 1.8, roadMarking);
    ribbon(track.halfWidth - 1.8, track.halfWidth - 1, roadMarking);

    function circuitPoint(distance, lane = 0) {
      const wrapped = ((distance % track.length) + track.length) % track.length;
      const segment = track.segments.find((part) => wrapped < part.start + part.size) || track.segments[0];
      const t = (wrapped - segment.start) / segment.size;
      const angle = Math.atan2(segment.dy, segment.dx);
      return { x: segment.a.x + segment.dx * t - Math.sin(angle) * lane,
        y: segment.a.y + segment.dy * t + Math.cos(angle) * lane, angle };
    }

    // Mesmas seis posições escalonadas usadas pela simulação: 30 unidades entre vagas.
    if (options.racePresentation) {
      for (let slot = 0; slot < 6; slot++) {
        const lane = slot % 2 ? 11 : -11;
        const vertices = [];
        const stripe = (a, b, c, d) => {
          for (const [along, across] of [a, b, c, c, b, d]) {
            const p = circuitPoint(-slot * 30 + along, lane + across);
            vertices.push(p.x, track.heightAt(p.x, p.y) + 0.24, p.y);
          }
        };
        stripe([9, -6], [10, -6], [9, 6], [10, 6]);
        for (const side of [-1, 1]) {
          stripe([-10, side * 6], [10, side * 6], [-10, side * 6 + 0.65], [10, side * 6 + 0.65]);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();
        addMesh(geometry, white, scene).name = `starting-grid-slot-${slot + 1}`;
      }
    }

    if (options.racePresentation && track.pit) {
      function pitSurface(from, to, left, right, surface) {
        const vertices = [], uv = [];
        for (let d = from; d < to; d += 1) {
          const end = Math.min(to, d + 1);
          // O asfalto principal já ocupa toda a largura da pista: o pit só preenche o lado externo.
          const edgeLeft = (s) => Math.max(track.halfWidth, left(s));
          const edgeRight = (s) => Math.max(edgeLeft(s), right(s));
          if (edgeRight(d) === edgeLeft(d) && edgeRight(end) === edgeLeft(end)) continue;
          const bands = Math.max(1, Math.ceil(Math.max(edgeRight(d) - edgeLeft(d), edgeRight(end) - edgeLeft(end)) / 8));
          for (let band = 0; band < bands; band++) {
          const lo = (s) => edgeLeft(s) + (edgeRight(s) - edgeLeft(s)) * band / bands;
          const hi = (s) => edgeLeft(s) + (edgeRight(s) - edgeLeft(s)) * (band + 1) / bands;
          for (const [along, lane] of [[d, lo(d)], [end, lo(end)], [d, hi(d)],
            [d, hi(d)], [end, lo(end)], [end, hi(end)]]) {
            const p = circuitPoint(along, lane);
            vertices.push(p.x, track.heightAt(p.x, p.y) + 0.19, p.y);
            uv.push(p.x / 12, p.y / 12);
          }
          }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geometry.computeVertexNormals();
        const mesh = addMesh(geometry, surface, scene); mesh.receiveShadow = true;
        mesh.userData.pitPavement = surface === asphalt;
      }
      const pitBegin = track.pit.garage(0).distance - 20;
      const entryLane = (s) => {
        const t = clamp((s - track.pit.entry) / (track.pit.entryEnd - track.pit.entry), 0, 1);
        return track.pit.lane(s) * t * t * (3 - 2 * t);
      };
      pitSurface(track.pit.entry, pitBegin, () => track.halfWidth, (s) => {
        const apron = clamp((s - (pitBegin - 20)) / 20, 0, 1);
        return entryLane(s) + 18 + apron * 40;
      }, asphalt);
      const apronEnd = track.pit.garage(5).distance + 20;
      // Uma superfície contínua, com a mesma textura e escala do asfalto principal.
      pitSurface(pitBegin, track.pit.exit, (d) => Math.min(track.halfWidth - 0.8, track.pit.lane(d) - 10), (d) => {
        const blend = Math.max(0, Math.min(1, (d - apronEnd) / 50));
        // Inclui o piso inteiro das garagens (fundo em halfWidth + 103), não só a área de troca.
        return (track.halfWidth + 110) * (1 - blend) + (track.pit.lane(d) + 10) * blend;
      }, asphalt);
      const pitLine = material('#f4cf67', { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 });
      for (const side of [-1, 1]) {
        pitSurface(track.pit.entry, pitBegin, (d) => entryLane(d) + side * 9 - .3,
          (d) => entryLane(d) + side * 9 + .3, pitLine);
      }
      pitSurface(pitBegin, track.pit.exit, (d) => track.pit.lane(d) - 9, (d) => track.pit.lane(d) - 8.4, pitLine);
      pitSurface(pitBegin, track.pit.exit, (d) => track.pit.lane(d) + 8.4, (d) => track.pit.lane(d) + 9, pitLine);
      const paint = material('#e2e8e9', { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
      pitSurface(track.pit.entry, pitBegin, (d) => entryLane(d) + 13,
        (d) => entryLane(d) + 13.6, paint);
      // Faixas de aproximação acompanham o mesmo corredor usado pelo piloto automático.
      for (let d = track.pit.entryEnd - 80; d < pitBegin; d += 12) {
        pitSurface(d, d + 4, (s) => entryLane(s) - .35, (s) => entryLane(s) + .35, paint);
      }
      for (let bay = 0; bay < 6; bay++) {
        const garage = track.pit.garage(bay);
        for (const side of [-1, 1]) pitSurface(garage.distance + side * 9, garage.distance + side * 9 + 0.6,
          () => garage.lane - 16, () => garage.lane + 10, paint);
        pitSurface(garage.distance - 9, garage.distance + 9, () => garage.lane - 16, () => garage.lane - 15.4, pitLine);
      }
      for (let d = pitBegin; d < track.pit.mergeStart - 20; d += 22) {
        pitSurface(d, d + 8, () => track.halfWidth + 3, () => track.halfWidth + 3.7, paint);
        pitSurface(d, d + 12, (s) => track.halfWidth + 10 + (s - d) * 1.4,
          (s) => track.halfWidth + 11 + (s - d) * 1.4, paint);
      }
    }

    // Vegetação instanciada: centenas de árvores com apenas duas chamadas de desenho.
    const treeSites = [];
    for (let i = 0; i < track.points.length; i += 4) {
      for (const side of [-1, 1]) {
        const point = track.offset(i, side * (track.halfWidth + 90 + (i * 17 % 100)));
        if (options.racePresentation && Math.hypot(point.x - track.start.x, point.y - track.start.y) < 500) continue;
        if (track.nearest(point.x, point.y).distance > track.halfWidth + 65) treeSites.push(point);
      }
    }
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.4, 2, 12, 5), material('#6d5945'), treeSites.length);
    const foliageGeometry = new THREE.SphereGeometry(11, 12, 8);
    foliageGeometry.scale(1, 1.35, 0.9);
    const crowns = new THREE.InstancedMesh(foliageGeometry, material('#3f6536', { roughness: 1 }), treeSites.length);
    const treeTransform = new THREE.Object3D();
    treeSites.forEach((point, i) => {
      const scale = 0.8 + (i * 13 % 9) / 15;
      treeTransform.scale.setScalar(scale);
      treeTransform.position.set(point.x, track.heightAt(point.x, point.y) + 6 * scale, point.y);
      treeTransform.updateMatrix(); trunks.setMatrixAt(i, treeTransform.matrix);
      treeTransform.position.y += 17 * scale;
      treeTransform.updateMatrix(); crowns.setMatrixAt(i, treeTransform.matrix);
    });
    scene.add(trunks, crowns);

    const sponsorNames = ['APEX / MOTORS', 'NOVA / ENERGY', 'PULSO / RACING', 'VERTEX / TIRES'];
    const sponsorColors = ['#143b5c', '#304b32', '#802c46', '#293456'];
    const signPostGeometry = new THREE.BoxGeometry(1, 10, 1);
    sponsorNames.forEach((name, index) => {
      const label = document.createElement('canvas');
      label.width = 512; label.height = 128;
      const ctx = label.getContext?.('2d');
      if (!ctx) return;
      ctx.fillStyle = sponsorColors[index]; ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = '#f4c85b'; ctx.fillRect(0, 112, 512, 16);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 38px sans-serif';
      ctx.textAlign = 'center'; ctx.fillText(name, 256, 76);
      const texture = new THREE.CanvasTexture(label);
      texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
      const face = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
      for (let i = index * 15 + 8; i < track.points.length; i += 60) {
        if (options.racePresentation && track.segments[i].start >= track.pit.garage(0).distance - 50
          && track.segments[i].start <= track.pit.exit + 30) continue;
        const point = track.offset(i, track.halfWidth + 48);
        if (track.nearest(point.x, point.y).distance < track.halfWidth + 25) continue;
        const panel = addMesh(new THREE.PlaneGeometry(48, 12), face, scene,
          [point.x, track.heightAt(point.x, point.y) + 10, point.y]);
        panel.rotation.y = -point.angle;
        for (const side of [-1, 1]) {
          const x = point.x + Math.cos(point.angle) * side * 18;
          const z = point.y + Math.sin(point.angle) * side * 18;
          addMesh(signPostGeometry, rubber, scene, [x, track.heightAt(x, z) + 5, z]);
        }
      }
    });

    // Instalações próximas à largada, fora da faixa de corrida e das barreiras.
    const grandstandDetails = new THREE.Object3D();
    const pitRoofs = [];
    const pitEngineers = [];
    scene.add(grandstandDetails);
    if (options.racePresentation) {
      const block = new THREE.BoxGeometry(1, 1, 1);
      const concrete = material('#a6adb0');
      const steel = material('#394653', { metalness: 0.5 });
      const navy = material('#234e70');
      const seatPaint = [material('#4e8bc1'), material('#f0bf53'), material('#d35653')];
      function buildingPart(distance, lane, height, size, surface, parent = scene) {
        const point = circuitPoint(distance, lane);
        const mesh = addMesh(block, surface, parent, [point.x, track.heightAt(point.x, point.y) + height, point.y]);
        mesh.scale.set(...size);
        mesh.rotation.y = -point.angle;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
      }
      function clearSite(distance, lane, length, width) {
        return [-length / 2, 0, length / 2].every((along) => [-width / 2, width / 2].every((across) => {
          const point = circuitPoint(distance + along, lane + across);
          return track.nearest(point.x, point.y).distance > track.halfWidth + 44;
        }));
      }

      // Garagens abertas: paredes laterais, fundo, bancada e porta recolhida.
      for (let bay = 0; bay < 6; bay++) {
        const distance = track.pit.garage(bay).distance;
        const lane = track.halfWidth + 90;
        buildingPart(distance, lane + 13, 9, [24, 18, 1], concrete);
        for (const side of [-1, 1]) buildingPart(distance + side * 11.5, lane, 9, [1, 18, 26], concrete);
        buildingPart(distance, lane - 14, 14, [24, 2, 2], seatPaint[bay % 3]);
        const roofMaterial = steel.clone(); roofMaterial.transparent = true;
        pitRoofs.push(buildingPart(distance, lane, 19, [26, 2, 30], roofMaterial));
        buildingPart(distance, lane + 10, 3, [15, 6, 3], navy, grandstandDetails);
        buildingPart(distance - 8, lane + 6, 3, [3, 6, 4], red, grandstandDetails);
        for (let row = 0; row < 3; row++) buildingPart(distance, lane - 13.5, 15.5 + row * 0.7, [20, 0.3, 0.6], concrete);
        const sign = document.createElement('canvas'); sign.width = 256; sign.height = 64;
        const context = sign.getContext?.('2d');
        if (context) {
          context.fillStyle = '#142537'; context.fillRect(0, 0, 256, 64);
          context.fillStyle = '#ffffff'; context.font = 'bold 28px sans-serif'; context.textAlign = 'center';
          context.fillText(`BOX ${String(bay + 1).padStart(2, '0')}`, 128, 42);
          const texture = new THREE.CanvasTexture(sign); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
          const point = circuitPoint(distance, lane - 15.1);
          const plate = addMesh(new THREE.PlaneGeometry(18, 4), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }), scene,
            [point.x, track.heightAt(point.x, point.y) + 14, point.y]);
          plate.rotation.y = -point.angle;
        }
      }
      // Duas estações por equipe, fora da área de troca, também no online.
      for (let bay = 0; bay < 6; bay++) {
      for (const [index, along] of [-4, 4].entries()) {
        const station = new THREE.Object3D(); station.userData.pitEngineer = true;
        station.userData.bay = bay;
        const point = circuitPoint(track.pit.garage(bay).distance + along, track.halfWidth + 86);
        station.position.set(point.x, track.heightAt(point.x, point.y) + .2, point.y);
        station.rotation.y = -point.angle; scene.add(station);
        const uniform = material(['#293e60', '#7b375f', '#976337', '#356859', '#594b86', '#246b88'][bay], { roughness: .8 });
        const skin = material(index ? '#986749' : '#d9a180');
        const lightTrim = material('#dbe7eb');
        addMesh(roundedBox(5.8, .3, 2.5, .1), navy, station, [0, 2.55, 2.1]);
        for (const x of [-2.4, 2.4]) addMesh(new THREE.BoxGeometry(.2, 2.5, 2), steel, station, [x, 1.25, 2.1]);
        addMesh(roundedBox(3.5, 2, .3, .1), navy, station, [0, 3.8, 2.7]);
        addMesh(new THREE.BoxGeometry(.22, .65, .25), steel, station, [0, 2.95, 2.7]);
        addMesh(roundedBox(2.5, .12, .8, .05), lightTrim, station, [0, 2.77, 1.45]);
        const keyboard = new THREE.InstancedMesh(new THREE.BoxGeometry(.17, .025, .13), navy, 27);
        const keyMatrix = new THREE.Matrix4();
        for (let row = 0; row < 3; row++) for (let key = 0; key < 9; key++) {
          keyboard.setMatrixAt(row * 9 + key, keyMatrix.makeTranslation(-.98 + key * .24, 2.84, 1.2 + row * .22));
        }
        station.add(keyboard);
        addMesh(roundedBox(.32, .15, .5, .1), lightTrim, station, [1.9, 2.8, 1.55]);
        addMesh(roundedBox(1.4, 1.7, .9, .22), uniform, station, [0, 2.45, 0]);
        addMesh(roundedBox(.12, 1.25, .05, .02), lightTrim, station, [0, 2.45, .46]);
        for (const side of [-1, 1]) {
          addMesh(roundedBox(.5, 1.55, .55, .13), uniform, station, [side * .38, .9, 0]);
          addMesh(roundedBox(.58, .3, .9, .1), navy, station, [side * .38, .19, .18]);
        }
        const head = new THREE.Object3D(); head.position.set(0, 3.65, 0); station.add(head);
        addMesh(new THREE.SphereGeometry(.58, 16, 12), skin, head);
        const cap = addMesh(new THREE.SphereGeometry(.61, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), uniform, head, [0, .08, 0]);
        addMesh(roundedBox(1, .1, .55, .05), uniform, cap, [0, .1, .4]);
        for (const side of [-1, 1]) addMesh(roundedBox(.18, .5, .38, .08), navy, head, [side * .56, 0, 0]);
        addMesh(roundedBox(.08, .08, .65, .03), navy, head, [.58, -.22, .35]);
        const hands = [];
        for (const side of [-1, 1]) {
          const arm = new THREE.Object3D(); arm.position.set(side * .7, 2.8, .25); station.add(arm);
          addMesh(roundedBox(.38, .45, 1.1, .13), uniform, arm, [0, -.06, .4]);
          addMesh(roundedBox(.35, .21, .4, .09), skin, arm, [0, .01, 1]); hands.push(arm);
        }
        const screen = document.createElement('canvas'); screen.width = 256; screen.height = 128;
        const ctx = screen.getContext?.('2d');
        let map;
        if (ctx) {
          map = new THREE.CanvasTexture(screen); map.colorSpace = THREE.SRGBColorSpace; textures.push(map);
          const display = addMesh(new THREE.PlaneGeometry(3.2, 1.72), new THREE.MeshBasicMaterial({ map }), station, [0, 3.8, 2.53]);
          display.rotation.y = Math.PI;
        }
        pitEngineers.push({ station, bay, head, hands, ctx, map, lastUpdate: -Infinity, index: bay * 2 + index });
      }
      }
      const towerLane = track.halfWidth + 76;
      if (clearSite(48, towerLane, 26, 30)) {
        buildingPart(48, towerLane, 16, [24, 32, 26], concrete);
        buildingPart(48, towerLane, 30, [26, 10, 28], glass);
        buildingPart(48, towerLane, 36, [30, 2, 32], steel);
      }

      // Arquibancadas em degraus; assentos são faixas compartilhadas, sem milhares de meshes.
      for (const distance of [-105, -25, 55]) {
        const lane = -track.halfWidth - 78;
        if (!clearSite(distance, lane - 6, 64, 38)) continue;
        for (let row = 0; row < 5; row++) {
          const across = lane - row * 5;
          buildingPart(distance, across, 2 + row * 2, [64, 4 + row * 4, 5], concrete);
          buildingPart(distance, across, 4.6 + row * 4, [60, 1.2, 3], seatPaint[row % 3]);
          for (let seat = 0; seat < 12; seat++) {
            if ((seat + row) % 4 === 0) continue;
            buildingPart(distance - 27 + seat * 5, across, 6 + row * 4, [1.5, 2.5, 1.5], seatPaint[(seat + row) % 3], grandstandDetails);
          }
        }
        for (const along of [-31, 31]) buildingPart(distance + along, lane - 20, 17, [1.5, 34, 1.5], steel);
        buildingPart(distance, lane - 10, 35, [70, 2, 34], navy);
      }

      // Pórtico acima da linha; pilares ficam fora da área por onde os carros passam.
      const start = circuitPoint(0);
      const span = track.halfWidth + 44;
      const beamHeight = Math.max(...[-span, 0, span].map((lane) => {
        const point = circuitPoint(0, lane);
        return track.heightAt(point.x, point.y);
      })) + 34;
      for (const lane of [-span, span]) {
        const point = circuitPoint(0, lane);
        const base = track.heightAt(point.x, point.y);
        const post = addMesh(block, steel, scene, [point.x, (beamHeight + base) / 2, point.y]);
        post.scale.set(4, beamHeight - base, 4); post.castShadow = true;
      }
      const beam = addMesh(block, navy, scene, [start.x, beamHeight, start.y]);
      beam.rotation.y = -start.angle; beam.scale.set(5, 9, span * 2 + 6); beam.castShadow = true;
      const bannerCanvas = document.createElement('canvas');
      bannerCanvas.width = 1024; bannerCanvas.height = 128;
      const ctx = bannerCanvas.getContext?.('2d');
      if (ctx) {
        ctx.fillStyle = '#16324c'; ctx.fillRect(0, 0, 1024, 128);
        ctx.fillStyle = '#f5c758'; ctx.fillRect(0, 112, 1024, 16);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 60px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('NEURODRIVE  /  RACING', 512, 82);
        const texture = new THREE.CanvasTexture(bannerCanvas);
        texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
        const face = addMesh(new THREE.PlaneGeometry(span * 2, 8),
          new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }), scene,
          [start.x - Math.cos(start.angle) * 2.6, beamHeight, start.y - Math.sin(start.angle) * 2.6]);
        face.rotation.y = -start.angle - Math.PI / 2;
      }
    }

    // Linha de largada perpendicular ao sentido da pista.
    const tileGeometry = new THREE.BoxGeometry(4, 0.2, 4);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < track.halfWidth / 2; col++) {
        const point = track.offset(0, -track.halfWidth + 2 + col * 4);
        const tile = addMesh(tileGeometry, (row + col) % 2 ? rubber : white, scene, [
          point.x + Math.cos(point.angle) * row * 4, track.heightAt(point.x, point.y) + 0.3,
          point.y + Math.sin(point.angle) * row * 4,
        ]);
        tile.rotation.y = -point.angle;
      }
    }

    // Barreiras externas e placas de curva ajudam a ler a pista em terceira pessoa.
    const barrierGeometry = new THREE.BoxGeometry(20, 5, 2);
    const boardGeometry = new THREE.BoxGeometry(2, 16, 14);
    for (let i = 0; i < track.points.length; i += 3) {
      for (const side of [-1, 1]) {
        if (options.racePresentation && side === 1 && ((track.segments[i].start >= track.pit.mergeStart - 20
          && track.segments[i].start <= track.pit.exit + 20) || (track.segments[i].start >= track.pit.entry - 15
          && track.segments[i].start <= track.pit.entryEnd + 20))) continue;
        const point = track.offset(i, side * (track.halfWidth + 40));
        const barrier = addMesh(barrierGeometry, white, scene, [point.x, track.heightAt(point.x, point.y) + 2.5, point.y]);
        barrier.rotation.y = -point.angle;
      }
      if (i % 30 === 0) {
        if (options.racePresentation && track.segments[i].start >= track.pit.garage(0).distance - 30
          && track.segments[i].start <= track.pit.exit + 30) continue;
        const point = track.offset(i, track.halfWidth + 26);
        const board = addMesh(boardGeometry, red, scene, [point.x, track.heightAt(point.x, point.y) + 8, point.y]);
        board.rotation.y = -point.angle;
      }
    }

    // Modelos low-poly: comprimento e largura seguem o desenho original (16 × 9).
    function roundedBox(width, height, depth, radius) {
      const geometry = new THREE.BoxGeometry(width, height, depth, 6, 4, 4);
      const position = geometry.attributes.position, normals = geometry.attributes.normal;
      const point = new THREE.Vector3(), center = new THREE.Vector3(), normal = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i);
        center.set(Math.max(-width / 2 + radius, Math.min(width / 2 - radius, point.x)),
          Math.max(-height / 2 + radius, Math.min(height / 2 - radius, point.y)),
          Math.max(-depth / 2 + radius, Math.min(depth / 2 - radius, point.z)));
        normal.copy(point).sub(center).normalize();
        point.copy(center).addScaledVector(normal, radius);
        position.setXYZ(i, point.x, point.y, point.z);
        normals.setXYZ(i, normal.x, normal.y, normal.z);
      }
      return geometry;
    }
    // Recortes reais na carroceria: a roda cabe dentro da caixa sem atravessar a lataria.
    const bodyOutline = new THREE.Shape();
    const archRadius = 2.05, archAngle = Math.asin(0.25 / archRadius);
    bodyOutline.moveTo(-8, -1.6); bodyOutline.lineTo(-5 - Math.cos(archAngle) * archRadius, -1.6);
    bodyOutline.absarc(-5, -1.35, archRadius, Math.PI + archAngle, -archAngle, true);
    bodyOutline.lineTo(5 - Math.cos(archAngle) * archRadius, -1.6);
    bodyOutline.absarc(5, -1.35, archRadius, Math.PI + archAngle, -archAngle, true);
    bodyOutline.lineTo(8, -1.6); bodyOutline.lineTo(8, 1.2);
    bodyOutline.quadraticCurveTo(8, 1.6, 7.6, 1.6); bodyOutline.lineTo(-7.6, 1.6);
    bodyOutline.quadraticCurveTo(-8, 1.6, -8, 1.2); bodyOutline.closePath();
    const bodyGeometry = new THREE.ExtrudeGeometry(bodyOutline, { depth: 7.8, bevelEnabled: true,
      bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 2, curveSegments: 16, steps: 1 });
    bodyGeometry.translate(0, 0, -3.9);
    const cabinGeometry = new THREE.BoxGeometry(7.5, 2.7, 6.5);
    const cabinVertices = cabinGeometry.attributes.position;
    for (let i = 0; i < cabinVertices.count; i++) {
      if (cabinVertices.getY(i) > 0) {
        cabinVertices.setX(i, cabinVertices.getX(i) * 0.72 - 0.45);
        cabinVertices.setZ(i, cabinVertices.getZ(i) * 0.88);
      }
    }
    cabinGeometry.computeVertexNormals();
    const roofGeometry = roundedBox(5.5, 0.5, 5.8, 0.2);
    const wheelRadius = 1.65;
    const wetBandGeometry = new THREE.TorusGeometry(wheelRadius * .86, .045, 4, 24);
    const wetBandMaterial = material('#57b8ed', { roughness: .8 });
    const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 1.2, 16);
    wheelGeometry.rotateX(Math.PI / 2);
    const ultraWheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 1.2, 32);
    ultraWheelGeometry.rotateX(Math.PI / 2);
    const treadPixels = new Uint8Array(128 * 64 * 4);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) {
      const groove = y % 16 < 2 || (x + Math.floor(y / 4)) % 16 < 2;
      const shade = groove ? 65 : 155 + random() * 15;
      treadPixels.set([shade, shade, shade, 255], (y * 128 + x) * 4);
    }
    const treadMap = new THREE.DataTexture(treadPixels, 128, 64);
    treadMap.wrapS = treadMap.wrapT = THREE.RepeatWrapping;
    treadMap.magFilter = THREE.LinearFilter; treadMap.minFilter = THREE.LinearMipmapLinearFilter;
    treadMap.generateMipmaps = true; treadMap.needsUpdate = true; textures.push(treadMap);
    const tireRubber = material('#292c30', { map: treadMap, bumpMap: treadMap, bumpScale: 0.035, roughness: 0.98 });
    const hubGeometry = new THREE.CylinderGeometry(1.05, 1.05, 1.24, 24);
    hubGeometry.rotateX(Math.PI / 2);
    const spokeGeometry = roundedBox(1.9, 0.16, 1.28, 0.06);
    const rimGeometry = new THREE.TorusGeometry(1.05, 0.07, 6, 24);
    const sidewallGeometry = new THREE.TorusGeometry(1.46, 0.09, 6, 24);
    const alloy = material('#c5ced8', { metalness: 0.8, roughness: 0.3 });
    const headlights = material('#e8f6ff', { emissive: '#b9ddff', emissiveIntensity: 0.6, roughness: 0.18 });
    const grilleGeometry = new THREE.BoxGeometry(0.2, 0.9, 4.6);
    const exhaustGeometry = new THREE.CylinderGeometry(0.35, 0.35, 1, 12);
    exhaustGeometry.rotateZ(Math.PI / 2);
    const bumperGeometry = new THREE.BoxGeometry(0.5, 0.8, 7.6);
    const lampGeometry = new THREE.BoxGeometry(0.4, 1, 2);
    const spoilerGeometry = new THREE.BoxGeometry(1.5, 0.7, 10);
    const stripeGeometry = new THREE.BoxGeometry(16.05, 0.08, 1.2);
    const roofStripeGeometry = new THREE.BoxGeometry(5.55, 0.08, 1.2);
    const models = [];
    // Pools fixos: efeitos não criam objetos ou texturas a cada quadro.
    const fxTransform = new THREE.Object3D();
    const skidPool = [], smokePool = [];
    let skidIndex = 0, smokeIndex = 0;
    const skids = options.racePresentation ? new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.025, 1),
      new THREE.MeshBasicMaterial({ color: '#181b1e', transparent: true, opacity: 0.5, depthWrite: false }), 256) : null;
    const smoke = options.racePresentation ? new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshBasicMaterial({ color: '#d2d4d4', transparent: true, opacity: 0.16, depthWrite: false }), 48) : null;
    for (const pool of [skids, smoke]) {
      if (!pool) continue;
      fxTransform.scale.setScalar(0); fxTransform.updateMatrix();
      for (let i = 0; i < pool.count; i++) pool.setMatrixAt(i, fxTransform.matrix);
      pool.frustumCulled = false;
      scene.add(pool);
    }
    function updateTireEffects() {
      const now = Date.now();
      for (const [mesh, pool, lifetime] of [[skids, skidPool, 12000], [smoke, smokePool, 1300]]) {
        if (!mesh) continue;
        pool.forEach((effect, i) => {
          const age = Math.min(1, (now - effect.at) / lifetime);
          fxTransform.position.set(effect.x, effect.y + (mesh === smoke ? age * 4 : 0), effect.z);
          fxTransform.rotation.set(effect.bank, -effect.angle, effect.pitch, 'YZX');
          if (mesh === smoke) fxTransform.scale.setScalar((1 + age * 3) * (1 - age));
          else fxTransform.scale.set(effect.length, 1, 0.95 * (1 - age));
          fxTransform.updateMatrix(); mesh.setMatrixAt(i, fxTransform.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }
    }

    function updatePitCrew(model, active, time, lift) {
      if (!active) { if (model.crew) model.crew.visible = false; return; }
      if (!model.crew) {
        const crew = new THREE.Object3D(); crew.userData.pitCrew = true; model.group.add(crew);
        const suit = material('#c92d42', { roughness: .82 }), helmet = material('#f5f2e3', { roughness: .28 }),
          visor = material('#102432', { metalness: .45, roughness: .15 }), trim = material('#233344');
        model.mechanics = [];
        for (const x of [-5, 5]) for (const side of [-1, 1]) {
          const person = new THREE.Object3D(); crew.add(person);
          addMesh(roundedBox(1.45, 1.8, 1, 0.28), suit, person, [0, 2.45, 0]);
          addMesh(roundedBox(1.4, .18, 1.02, .06), trim, person, [0, 1.65, 0]);
          addMesh(roundedBox(.1, 1.35, .06, .02), helmet, person, [0, 2.45, -side * .52]);
          addMesh(roundedBox(.42, .24, .06, .04), helmet, person, [-.4, 2.85, -side * .52]);
          addMesh(new THREE.CylinderGeometry(.28, .32, .35, 12), trim, person, [0, 3.45, 0]);
          addMesh(new THREE.SphereGeometry(.69, 20, 14), helmet, person, [0, 3.98, 0]);
          addMesh(roundedBox(1.08, .43, .34, .15), visor, person, [0, 4.04, -side * .51]);
          addMesh(roundedBox(.78, .15, .27, .06), trim, person, [0, 3.69, -side * .52]);
          for (const leg of [-1, 1]) {
            addMesh(roundedBox(.55, 1.4, .6, .18), suit, person, [leg * .4, .95, 0]);
            addMesh(roundedBox(.48, .42, .22, .08), trim, person, [leg * .4, .85, -side * .31]);
            addMesh(roundedBox(.6, .38, .95, .13), rubber, person, [leg * .4, .21, -side * .2]);
            addMesh(roundedBox(.48, .42, .9, .15), helmet, person, [leg * .76, 3, 0]);
          }
          const arms = new THREE.Object3D(); person.add(arms); arms.position.y = 2.65;
          for (const arm of [-1, 1]) {
            const mesh = addMesh(roundedBox(.4, .46, 1.3, .16), suit, arms, [arm * .68, -.15, -side * .5]);
            mesh.rotation.x = side * 0.2;
            addMesh(roundedBox(.43, .4, .42, .13), rubber, arms, [arm * .63, -.23, -side * 1.12]);
          }
          // Um auxiliar por roda: mesmo acabamento, uniforme azul e mãos livres para transportá-la.
          const helper = person.clone(true);
          helper.userData.tyreAssistant = true;
          const helperSuit = material('#28658c', { roughness: .82 });
          helper.traverse((part) => { if (part.material === suit) part.material = helperSuit; });
          crew.add(helper);
          const tool = new THREE.Object3D(); arms.add(tool); tool.position.set(.55, -.16, -side * 1.25);
          addMesh(roundedBox(.48, .48, .64, .13), helmet, tool);
          const barrel = addMesh(new THREE.CylinderGeometry(.17, .21, .52, 16), alloy, tool, [0, 0, -side * .42]);
          barrel.rotation.x = Math.PI / 2;
          const socket = addMesh(new THREE.CylinderGeometry(.13, .13, .24, 6), trim, tool, [0, 0, -side * .78]);
          socket.rotation.x = Math.PI / 2;
          addMesh(roundedBox(.23, .58, .27, .07), rubber, tool, [0, -.4, .05]);
          const hose = new THREE.CatmullRomCurve3([new THREE.Vector3(.55, 1.9, -side * 1.2),
            new THREE.Vector3(1.25, .7, -side * .3), new THREE.Vector3(1.2, .15, side * 1),
            new THREE.Vector3(-.3, .12, side * 1.7)]);
          addMesh(new THREE.TubeGeometry(hose, 16, .055, 6, false), rubber, person);
          const spare = addMesh(wheelGeometry, tireRubber, person, [-0.8, 1.3, -side * 0.8]);
          addMesh(hubGeometry, rubber, spare);
          for (let spoke = 0; spoke < 3; spoke++) addMesh(spokeGeometry, alloy, spare).rotation.z = spoke * Math.PI / 3;
          for (const face of [-1, 1]) addMesh(rimGeometry, alloy, spare, [0, 0, face * .64]);
          const delivery = spare.clone(true); crew.add(delivery);
          delivery.userData.deliveryWheel = true;
          model.mechanics.push({ person, arms, tool, socket, spare, helper, delivery, x, side });
        }
        addMesh(roundedBox(3, 0.4, 2.5, 0.15), suit, crew, [9.2, 0.3, 0]);
        model.jack = addMesh(new THREE.BoxGeometry(0.6, 1, 0.6), alloy, crew, [8, 0.6, 0]);
        const handle = addMesh(new THREE.CylinderGeometry(0.13, 0.13, 4, 8), helmet, crew, [10.5, 1.5, 0]);
        handle.rotation.z = -0.6;
        model.crew = crew;
      }
      model.crew.visible = true; model.crew.position.y = -lift;
      model.jack.scale.y = 0.7 + lift; model.jack.position.y = 0.6 + lift / 2;
      const arrival = Math.min(1, time / 0.8, Math.max(0, 8 - time));
      for (const mechanic of model.mechanics) {
        mechanic.person.position.set(mechanic.x, 0, mechanic.side * (9 - arrival * 2.4));
        const working = time > 1.5 && time < 6.5;
        mechanic.arms.rotation.x = mechanic.side * Math.sin(time * 24) * (working ? .015 : 0);
        mechanic.socket.rotation.y = working ? time * 24 : 0;
        const approach = clamp((time - .8) / 1.6, 0, 1);
        const retreat = clamp((time - 6) / 1.5, 0, 1);
        const travel = approach * (1 - retreat);
        mechanic.helper.position.set(mechanic.x + 2.3, 0, mechanic.side * (12 - travel * 3.2));
        // Entrega contínua, em coordenadas da equipe, sem teletransportar a roda entre as mãos.
        const handoff = clamp((time - 2.8) / .8, 0, 1);
        const from = mechanic.helper.position.clone().add(new THREE.Vector3(-.8, 1.7, -mechanic.side * .8));
        const to = mechanic.person.position.clone().add(new THREE.Vector3(-.8, 1.7, -mechanic.side * .8));
        mechanic.delivery.position.copy(from).lerp(to, handoff);
        mechanic.delivery.visible = time < 4.2;
        mechanic.spare.visible = false;
        // Após montar o pneu novo, o auxiliar recolhe o usado e se afasta.
        if (time >= 4.5) {
          mechanic.delivery.visible = true;
          mechanic.delivery.position.copy(to).lerp(from, clamp((time - 4.5) / .8, 0, 1));
        }
      }
    }

    function createCarModel(index) {
      const group = new THREE.Group();
      const playerPaint = material('#48e6a4', { metalness: 0.35, roughness: 0.4,
        clearcoat: options.quality === 'ultra' ? 1 : 0.6, clearcoatRoughness: 0.15,
        envMapIntensity: options.quality === 'ultra' ? 1.4 : 1 });
      const playerStripe = material('#163d33');
      const body = addMesh(bodyGeometry, bodyMaterials[index % 3], group, [0, 3, 0]);
      body.castShadow = true;
      addMesh(cabinGeometry, glass, group, [-1, 5.3, 0]);
      const roof = addMesh(roofGeometry, body.material, group, [-1.45, 6.9, 0]);
      const stripes = [addMesh(stripeGeometry, playerStripe, group, [0, 4.65, 0]),
        addMesh(roofStripeGeometry, playerStripe, group, [-1.45, 7.2, 0])];
      stripes.forEach((stripe) => { stripe.visible = false; });
      addMesh(spoilerGeometry, rubber, group, [-7, 5, 0]);
      addMesh(bumperGeometry, rubber, group, [8.2, 1.7, 0]);
      addMesh(bumperGeometry, rubber, group, [-8.2, 1.7, 0]);
      addMesh(grilleGeometry, rubber, group, [8.03, 2.8, 0]);
      for (const side of [-1, 1]) {
        addMesh(exhaustGeometry, alloy, group, [-8.3, 1.9, side * 2.5]);
        addMesh(new THREE.BoxGeometry(5, 0.3, 0.15), rubber, group, [0, 1.9, side * 4]);
      }
      const decalCanvas = document.createElement('canvas');
      decalCanvas.width = 512; decalCanvas.height = 128;
      const decalContext = decalCanvas.getContext?.('2d');
      if (decalContext) {
        decalContext.fillStyle = '#101923'; decalContext.fillRect(0, 0, 512, 128);
        decalContext.fillStyle = '#f7f7f1'; decalContext.fillRect(5, 5, 120, 118);
        decalContext.fillStyle = '#162537'; decalContext.font = 'bold 82px sans-serif';
        decalContext.textAlign = 'center'; decalContext.fillText(String(index + 1).padStart(2, '0'), 65, 93);
        decalContext.fillStyle = '#ffffff'; decalContext.font = 'bold 38px sans-serif';
        decalContext.fillText('NEURODRIVE', 318, 58);
        decalContext.font = '22px sans-serif'; decalContext.fillText('MOTORSPORT', 318, 94);
        const map = new THREE.CanvasTexture(decalCanvas); map.colorSpace = THREE.SRGBColorSpace; textures.push(map);
        const surface = new THREE.MeshStandardMaterial({ map, roughness: 0.35 });
        for (const side of [-1, 1]) {
          const panel = addMesh(new THREE.PlaneGeometry(4.4, 1.3), surface, group, [0, 3, side * 4.015]);
          if (side < 0) panel.rotation.y = Math.PI;
        }
      }
      const mirrorGeometry = new THREE.BoxGeometry(1.4, 0.65, 1.4);
      for (const side of [-1, 1]) {
        const mirror = addMesh(mirrorGeometry, body.material, group, [2, 4.7, side * 4.4]);
        mirror.userData.paint = true;
      }
      const frontWheels = [], wheels = [];
      for (const x of [-5, 5]) {
        for (const z of [-4, 4]) {
          // Fundo e revestimento da caixa permanecem no carro quando a roda é removida.
          const side = Math.sign(z);
          const lining = material('#171d23', { roughness: .96, side: THREE.DoubleSide });
          const well = new THREE.Shape(), angle = Math.asin(.25 / 1.98);
          well.moveTo(-Math.cos(angle) * 1.98, -.25);
          well.absarc(0, 0, 1.98, Math.PI + angle, -angle, true);
          well.closePath();
          const back = addMesh(new THREE.ExtrudeGeometry(well, { depth: .65, bevelEnabled: false, curveSegments: 16 }),
            lining, group, [x, wheelRadius, side * 3.05]);
          if (side < 0) back.rotation.y = Math.PI;
          back.userData.wheelWell = true;
          const disc = addMesh(new THREE.CylinderGeometry(.82, .82, .14, 24), alloy,
            group, [x, wheelRadius, side * 3.72]);
          disc.rotation.x = Math.PI / 2;
          const caliper = addMesh(roundedBox(.3, .65, .24, .08), red, group, [x + .65, wheelRadius, side * 3.76]);
          const hub = addMesh(new THREE.CylinderGeometry(.2, .2, .3, 12), alloy,
            group, [x, wheelRadius, side * 3.85]);
          hub.rotation.x = Math.PI / 2;
          const pivot = new THREE.Group();
          pivot.position.set(x, wheelRadius, z); group.add(pivot);
          const wheel = addMesh(options.quality === 'ultra' ? ultraWheelGeometry : wheelGeometry, tireRubber, pivot);
          addMesh(hubGeometry, rubber, wheel);
          for (let spoke = 0; spoke < 3; spoke++) addMesh(spokeGeometry, alloy, wheel).rotation.z = spoke * Math.PI / 3;
          for (const face of [-1, 1]) {
            addMesh(rimGeometry, alloy, wheel, [0, 0, face * 0.64]);
            addMesh(sidewallGeometry, tireRubber, wheel, [0, 0, face * 0.56]);
            const wetBand = addMesh(wetBandGeometry, wetBandMaterial, wheel, [0, 0, face * .65]);
            wetBand.userData.wetTyre = true; wetBand.visible = false;
          }
          // Freio e cubo acompanham a roda, não a inclinação da carroceria.
          for (const part of [disc, caliper, hub]) {
            part.position.sub(pivot.position);
            pivot.add(part);
          }
          wheels.push({ pivot, wheel, x, z });
          if (x > 0) frontWheels.push(pivot);
        }
      }
      const brakes = [];
      for (const z of [-2.5, 2.5]) {
        addMesh(lampGeometry, headlights, group, [8.1, 3.4, z]);
        brakes.push(addMesh(lampGeometry, red, group, [-8.1, 3.4, z]));
      }
      scene.add(group);
      return { group, body, roof, frontWheels, wheels, brakes, stripes, playerPaint, playerStripe, lastX: null, lastY: null, spin: 0 };
    }

    // Mola criticamente amortecida: retorna sem oscilar e independe do FPS.
    function smoothSuspension(model, key, target, dt, frequency, reset) {
      const state = model[key] ||= { value: target, velocity: 0 };
      if (reset) { state.value = target; state.velocity = 0; }
      else if (dt > 0) {
        const offset = state.value - target;
        const impulse = state.velocity + frequency * offset;
        const decay = Math.exp(-frequency * dt);
        state.value = target + (offset + impulse * dt) * decay;
        state.velocity = (state.velocity - frequency * impulse * dt) * decay;
      }
      return state.value;
    }

    function updateNameplate(model, car, isSelf) {
      const visible = options.showNames && car.player && !car.disconnected;
      if (!visible) { if (model.nameplate) model.nameplate.visible = false; return; }
      if (!model.nameplate) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 96;
        const context = canvas.getContext?.('2d');
        if (!context) return;
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        textures.push(texture);
        const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false, toneMapped: false }));
        label.position.set(0, 13, 0);
        label.scale.set(31, 5.8, 1);
        model.group.add(label);
        model.nameplate = label;
        model.nameContext = context;
      }
      model.nameplate.visible = true;
      const name = Array.from(String(car.name || 'Piloto')).slice(0, 24).join('');
      const key = `${isSelf}:${name}`;
      if (model.nameKey === key) return;
      model.nameKey = key;
      const ctx = model.nameContext;
      ctx.clearRect(0, 0, 512, 96);
      ctx.fillStyle = '#101923e8'; ctx.fillRect(0, 0, 512, 96);
      ctx.fillStyle = isSelf ? '#f5c758' : '#83cfff'; ctx.fillRect(0, 86, 512, 10);
      ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff'; ctx.fillText(name, 256, 44, 480);
      model.nameplate.material.map.needsUpdate = true;
    }

    // Um único conjunto de linhas reutilizado para os cinco sensores do líder.
    const sensorPositions = new Float32Array(30);
    const sensorGeometry = new THREE.BufferGeometry();
    sensorGeometry.setAttribute('position', new THREE.BufferAttribute(sensorPositions, 3));
    const sensors = new THREE.LineSegments(sensorGeometry, new THREE.LineBasicMaterial({ color: '#89ffd0' }));
    sensors.frustumCulled = false;
    scene.add(sensors);

    // Câmera orbital manual, utilizável também durante uma pausa.
    let azimuth = 0.55;
    let chaseOrbit = 0;
    let elevation = 0.85;
    let zoom = 1;
    let snapshot = null;
    let dragging = null;
    let viewportWidth = 0;
    let viewportHeight = 0;
    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

    let finishCameraAt = null;
    let ceremony = null;
    let introProgress = null;
    function render() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      if (width !== viewportWidth || height !== viewportHeight) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        viewportWidth = width;
        viewportHeight = height;
      }

      const mode = finishCameraAt !== null ? 'finish' : element('camera').value;
      const car = snapshot?.target;
      pitRoofs.forEach((roof) => {
        roof.visible = true;
        roof.material.opacity = 1;
        roof.material.depthWrite = true;
      });
      if (options.quality === 'ultra') {
        const focus = car && mode !== 'overview';
        const x = focus ? car.x : 0, z = focus ? car.y : 0;
        sun.position.set(x - 400, 900, z + 350);
        sun.target.position.set(x, 0, z);
        const extent = focus ? 230 : 1000;
        Object.assign(sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent });
        sun.shadow.camera.updateProjectionMatrix();
      }
      const speedRatio = car ? Math.min(1, car.speed / (car.maxSpeed || 3.2)) : 0;
      const raceCamera = options.speedEffects && mode === 'chase';
      const desiredFov = introProgress !== null ? 45 : raceCamera ? 56 + speedRatio * 22 : 45;
      // A tomada aérea não precisa enxergar objetos a centímetros da lente.
      // Um near maior preserva a precisão entre asfalto, terreno e marcações.
      const near = introProgress !== null && introProgress < .68 ? 10 : .5;
      if (camera.near !== near) {
        camera.near = near; camera.far = 5000; camera.updateProjectionMatrix();
      }
      const fieldOfView = camera.fov + (desiredFov - camera.fov) * 0.12;
      if (camera.fov !== fieldOfView) {
        camera.fov = fieldOfView;
        camera.updateProjectionMatrix();
      }
      if (introProgress !== null && car) {
        // Primeiro mostra o traçado inteiro; o carro só entra no segundo plano.
        const close = clamp((introProgress - .68) / .32, 0, 1);
        const t = close * close * (3 - 2 * close);
        if (introProgress < .68) {
          const bounds = track.bounds;
          const cx = (bounds.minX + bounds.maxX) / 2, cz = (bounds.minY + bounds.maxY) / 2;
          const radius = Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2 + track.halfWidth + 40;
          const vertical = camera.fov * Math.PI / 360;
          const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
          const distance = radius * .95 / Math.sin(Math.min(vertical, horizontal));
          const far = Math.max(5000, distance + radius * 2);
          if (camera.far !== far) { camera.far = far; camera.updateProjectionMatrix(); }
          const angle = -.8 + introProgress * .16;
          const height = track.heightAt(cx, cz);
          camera.position.set(cx + Math.cos(angle) * distance * .38, height + distance * .925, cz + Math.sin(angle) * distance * .38);
          camera.lookAt(cx, height, cz);
        } else if (car.pitExit || car.pitState) {
          const nearest = track.nearest(car.x, car.y);
          const tangent = Math.atan2(nearest.ty, nearest.tx);
          const distance = 40 + (1 - t) * 25;
          const x = car.x + Math.cos(tangent) * 8 + Math.sin(tangent) * distance;
          const z = car.y + Math.sin(tangent) * 8 - Math.cos(tangent) * distance;
          camera.position.set(x, Math.max(track.heightAt(x, z) + 5, track.heightAt(car.x, car.y) + 8), z);
          camera.lookAt(car.x, track.heightAt(car.x, car.y) + 3, car.y);
        } else {
        const angle = car.angle + .7 + (1 - t) * .7;
        const radius = 45 + (1 - t) * 210;
        const x = car.x - Math.cos(angle) * radius, z = car.y - Math.sin(angle) * radius;
        camera.position.set(x, Math.max(track.heightAt(x, z) + 18, track.heightAt(car.x, car.y) + 24 + (1 - t) * 140), z);
        camera.lookAt(car.x, track.heightAt(car.x, car.y) + 3, car.y);
        }
      } else if (ceremony) {
        const close = clamp((ceremony.time - 4) / 3, 0, 1);
        const origin = ceremony.origin;
        const eye = new THREE.Vector3(-28 * (1 - close) + 8 * close, 36 - close * 17, 80 - close * 38);
        eye.applyAxisAngle(new THREE.Vector3(0, 1, 0), -origin.angle);
        camera.position.set(origin.x + eye.x, ceremony.height + eye.y, origin.y + eye.z);
        camera.lookAt(origin.x, ceremony.height + 7, origin.y);
      } else if (car?.pitState === 'service') {
        const x = car.x + Math.cos(car.angle) * 15 + Math.sin(car.angle) * 24;
        const z = car.y + Math.sin(car.angle) * 15 - Math.cos(car.angle) * 24;
        camera.position.set(x, Math.max(track.heightAt(x, z) + 5, track.heightAt(car.x, car.y) + 8), z);
        camera.lookAt(car.x, track.heightAt(car.x, car.y) + 3, car.y);
      } else if (mode === 'finish' && car && !car.pitExit) {
        const elapsed = Math.min(6, Math.max(0, (Date.now() - finishCameraAt) / 1000));
        const orbit = car.angle + 0.7 + (options.speedEffects === false ? 0 : elapsed * 0.09);
        const x = car.x + Math.cos(orbit) * 32, z = car.y + Math.sin(orbit) * 32;
        camera.position.set(x, Math.max(track.heightAt(x, z) + 9, track.heightAt(car.x, car.y) + 14), z);
        camera.lookAt(car.x, track.heightAt(car.x, car.y) + 3, car.y);
      } else if ((mode === 'chase' || mode === 'finish') && car?.pitExit) {
        // Enquadra o carro pela frente aberta da garagem, não por trás da parede.
        const nearest = track.nearest(car.x, car.y);
        const tangent = Math.atan2(nearest.ty, nearest.tx);
        const x = car.x + Math.cos(tangent) * 12 + Math.sin(tangent) * 40;
        const z = car.y + Math.sin(tangent) * 12 - Math.cos(tangent) * 40;
        camera.position.set(x, Math.max(track.heightAt(x, z) + 5, track.heightAt(car.x, car.y) + 8), z);
        camera.lookAt(car.x, track.heightAt(car.x, car.y) + 3, car.y);
      } else if (mode === 'chase' && car) {
        // Terceira pessoa: camera atras do carro, olhando adiante na pista.
        const impactMotion = raceCamera ? (car.impact || 0) : 0;
        const behind = (raceCamera ? 30 + speedRatio * 4 : 42) * zoom;
        const angle = car.angle + chaseOrbit;
        camera.position.set(
          car.x - Math.cos(angle) * behind,
          Math.max(
            track.heightAt(car.x, car.y) + (car.pitExit ? 30 : raceCamera ? 11 - speedRatio * 2.5 : 20) * zoom,
            track.heightAt(car.x - Math.cos(angle) * behind, car.y - Math.sin(angle) * behind) + 8,
          ),
          car.y - Math.sin(angle) * behind,
        );
        const lookX = car.x + Math.cos(car.angle) * 32;
        const lookY = car.y + Math.sin(car.angle) * 32;
        camera.lookAt(lookX, track.heightAt(lookX, lookY) + 4, lookY);
        camera.position.y += Math.sin(Date.now() * 0.065) * impactMotion * 0.35;
      } else {
        const follow = mode === 'follow' && car;
        const bounds = track.bounds;
        const target = follow
          ? new THREE.Vector3(car.x, track.heightAt(car.x, car.y) + 2, car.y)
          : new THREE.Vector3((bounds.minX + bounds.maxX) / 2, 0, (bounds.minY + bounds.maxY) / 2);
        const circuitSize = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
        const distance = (follow ? 105 : circuitSize * 1.45 * Math.max(1, 1.45 / camera.aspect)) * zoom;
        const angle = azimuth + (follow ? car.angle + Math.PI : 0);
        camera.position.set(
          target.x + Math.cos(angle) * Math.cos(elevation) * distance,
          target.y + Math.sin(elevation) * distance,
          target.z + Math.sin(angle) * Math.cos(elevation) * distance,
        );
        camera.lookAt(target);
      }
      renderer.render(scene, camera);
    }

    listen('pointerdown', (event) => {
      dragging = { x: event.clientX, y: event.clientY, id: event.pointerId };
      canvas.setPointerCapture(event.pointerId);
    });
    listen('pointermove', (event) => {
      if (!dragging || dragging.id !== event.pointerId) return;
      if (element('camera').value === 'chase') chaseOrbit -= (event.clientX - dragging.x) * 0.008;
      else azimuth -= (event.clientX - dragging.x) * 0.008;
      elevation = clamp(elevation + (event.clientY - dragging.y) * 0.006, 0.25, 1.48);
      dragging.x = event.clientX;
      dragging.y = event.clientY;
      render();
    });
    listen('lostpointercapture', () => { dragging = null; });
    listen('pointerup', () => { dragging = null; });
    listen('pointercancel', () => { dragging = null; });
    listen('wheel', (event) => {
      event.preventDefault();
      zoom = clamp(zoom * Math.exp(event.deltaY * 0.001), 0.45, 1.8);
      render();
    }, { passive: false });

    element('camera').onchange = render;
    element('rotate').onclick = () => {
      if (element('camera').value === 'chase') chaseOrbit += Math.PI / 8;
      else azimuth += Math.PI / 8;
      render();
    };
    element('zoom-in').onclick = () => { zoom = clamp(zoom / 1.2, 0.45, 1.8); render(); };
    element('zoom-out').onclick = () => { zoom = clamp(zoom * 1.2, 0.45, 1.8); render(); };
    element('camera-reset').onclick = () => {
      azimuth = 0.55;
      chaseOrbit = 0;
      elevation = 0.85;
      zoom = 1;
      element('camera').value = 'overview';
      render();
    };

    function setQuality(quality) {
      options.quality = quality;
      const light = quality === 'performance';
      const ultra = quality === 'ultra';
      scene.environment = light ? null : getEnvironment();
      asphalt.bumpMap = ultra ? asphaltMap : null;
      asphalt.bumpScale = ultra ? 0.12 : 0;
      asphaltMap.anisotropy = ultra ? Math.min(8, renderer.capabilities?.getMaxAnisotropy?.() || 1) : 1;
      asphaltMap.needsUpdate = true;
      const shadowSize = ultra ? 2048 : 1024;
      if (sun.shadow.mapSize.x !== shadowSize) {
        sun.shadow.map?.dispose(); sun.shadow.map = null;
        sun.shadow.mapSize.set(shadowSize, shadowSize);
      }
      trunks.castShadow = crowns.castShadow = ultra;
      if (!ultra) {
        sun.position.set(-400, 900, 350); sun.target.position.set(0, 0, 0);
        Object.assign(sun.shadow.camera, { left: -900, right: 900, top: 800, bottom: -800 });
        sun.shadow.camera.updateProjectionMatrix();
      }
      for (const surface of [...bodyMaterials, leaderMaterial, ...models.map((model) => model.playerPaint)]) {
        surface.clearcoat = ultra ? 1 : 0.6;
        surface.clearcoatRoughness = 0.15;
        surface.envMapIntensity = ultra ? 1.4 : 1;
      }
      models.forEach((model) => model.wheels.forEach(({ wheel }) => { wheel.geometry = ultra ? ultraWheelGeometry : wheelGeometry; }));
      grandstandDetails.visible = !light;
      if (smoke) smoke.visible = !light && options.speedEffects !== false;
      renderer.setPixelRatio(ultra ? Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2.5) : Math.min(window.devicePixelRatio || 1, light ? 1 : 2));
      renderer.shadowMap.enabled = !light;
      sun.castShadow = !light;
      scene.traverse((object) => {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => { if (material) material.needsUpdate = true; });
      });
    }
    setQuality(options.quality);
    return {
      setQuality,
      setFinishCamera(active) { finishCameraAt = active ? Date.now() : null; },
      setIntro(progress) { introProgress = progress; },
      setCeremony(ranking, milliseconds = 0) {
        if (!ranking) { ceremony?.podium.dispose(); ceremony = null; return; }
        if (!window.createNeuroPodiumScene) return;
        if (!ceremony) {
          const distance = track.pit.garage(0).distance;
          const origin = circuitPoint(distance, -6);
          const podium = window.createNeuroPodiumScene(THREE, ranking);
          const terrain = Array.from({ length: 24 }, (_, i) => {
            const angle = i * Math.PI / 12;
            return track.heightAt(origin.x + Math.cos(angle) * 23, origin.y + Math.sin(angle) * 23);
          });
          const height = Math.max(...terrain) + .7;
          const depth = height - Math.min(...terrain) + .2;
          const foundation = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, depth / 2, 48), material('#15283b'));
          foundation.position.y = -depth / 4 - .31; podium.root.add(foundation);
          podium.root.position.set(origin.x, height, origin.y); podium.root.rotation.y = -origin.angle;
          podium.root.scale.setScalar(2); scene.add(podium.root);
          ceremony = { podium, origin, height, distance, ids: ranking.filter(car => !car.disconnected).slice(0, 3).map(car => car.id), time: 0 };
        }
        ceremony.time = milliseconds / 1000; ceremony.podium.update(ceremony.time);
      },
      createPreview(previewCanvas) {
        // Uma única vitrine, com cópia do mesmo modelo e recursos próprios.
        const source = models[0] || (models[0] = createCarModel(0));
        const previewScene = new THREE.Scene();
        previewScene.background = new THREE.Color('#09131d');
        previewScene.environment = getEnvironment();
        const previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true });
        previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
        previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        const view = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
        const model = source.group.clone(true);
        model.position.set(0, 0, 0); model.rotation.set(0, 0, 0); model.visible = true;
        model.children.filter((part) => part.isGroup).forEach((pivot) => {
          pivot.position.y = wheelRadius; pivot.position.z = Math.sign(pivot.position.z) * 4;
          pivot.rotation.set(0, 0, 0); pivot.children[0].visible = true; pivot.children[0].scale.set(1, 1, 1);
        });
        const geometries = new Set(), surfaces = new Set();
        model.traverse((part) => {
          if (part.isSprite) part.visible = false;
          if (part.userData.pitCrew) part.visible = false;
          if (part.geometry) { part.geometry = part.geometry.clone(); geometries.add(part.geometry); }
          if (part.material) { part.material = part.material.clone(); surfaces.add(part.material); }
        });
        model.children[3].visible = model.children[4].visible = true;
        previewScene.add(model);
        previewScene.add(new THREE.HemisphereLight('#e2f2ff', '#34414f', 2.4));
        const key = new THREE.DirectionalLight('#fff3df', 3); key.position.set(15, 25, 15); previewScene.add(key);
        const rim = new THREE.DirectionalLight('#93cfff', 2); rim.position.set(-15, 12, -20); previewScene.add(rim);
        const platform = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 0.35, 64),
          new THREE.MeshStandardMaterial({ color: '#273948', roughness: 0.65 }));
        platform.position.y = -0.3; previewScene.add(platform);
        geometries.add(platform.geometry); surfaces.add(platform.material);
        // Piso, painéis e luzes da garagem usam recursos próprios da vitrine.
        function scenery(geometry, material, x, y, z) {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(x, y, z); previewScene.add(mesh);
          geometries.add(geometry); surfaces.add(material); return mesh;
        }
        scenery(new THREE.BoxGeometry(110, .2, 110), new THREE.MeshStandardMaterial({ color: '#101d29', roughness: .38, metalness: .45 }), 0, -.6, 0);
        scenery(new THREE.BoxGeometry(100, 28, .5), new THREE.MeshStandardMaterial({ color: '#182937', roughness: .8 }), 0, 13, -35);
        for (const x of [-24, -12, 0, 12, 24]) {
          scenery(new THREE.BoxGeometry(.14, 23, .2), new THREE.MeshBasicMaterial({ color: '#30544e' }), x, 12, -34.6);
        }
        for (const x of [-18, 18]) {
          scenery(new THREE.BoxGeometry(.25, .08, 48), new THREE.MeshBasicMaterial({ color: '#79eabc' }), x, -.45, 0);
          scenery(new THREE.BoxGeometry(.3, 1, 24), new THREE.MeshBasicMaterial({ color: '#d8f3ef' }), x, 22, 0);
        }
        const garageGlow = new THREE.PointLight('#76edb2', 4, 70, 1.4);
        garageGlow.position.set(-12, 8, -15); previewScene.add(garageGlow);
        let azimuth = 0.7, elevation = 0.4, disposed = false, lastWidth = 0, lastHeight = 0;
        function draw() {
          if (disposed) return;
          const width = Math.max(1, previewCanvas.clientWidth || 600), height = Math.max(1, previewCanvas.clientHeight || 300);
          if (width !== lastWidth || height !== lastHeight) {
            previewRenderer.setSize(width, height, false); view.aspect = width / height; view.updateProjectionMatrix();
            lastWidth = width; lastHeight = height;
          }
          const radius = view.aspect < 1.4 ? 44 : 35;
          view.position.set(Math.cos(azimuth) * radius * Math.cos(elevation), 3 + Math.sin(elevation) * radius, Math.sin(azimuth) * radius * Math.cos(elevation));
          view.lookAt(0, 3, 0); previewRenderer.render(previewScene, view);
        }
        return {
          draw,
          rotate(x, y = 0) { azimuth += x; elevation = Math.max(0.12, Math.min(1.35, elevation + y)); draw(); },
          reset() { azimuth = 0.7; elevation = 0.4; draw(); },
          setSkin(skin) {
            const matte = skin.finish === 'matte', metallic = skin.finish === 'metallic';
            for (const part of model.children.filter((part, index) => index === 0 || index === 2 || part.userData.paint)) {
              const paint = part.material;
              paint.color.set(skin.color); paint.emissive?.set('#000000');
              paint.roughness = matte ? 0.82 : metallic ? 0.27 : 0.4;
              paint.metalness = matte ? 0.08 : metallic ? 0.75 : 0.35;
              paint.clearcoat = matte ? 0.08 : 0.6;
            }
            for (const index of [3, 4]) model.children[index].material.color.set(skin.accent);
            draw();
          },
          dispose() { disposed = true; geometries.forEach((item) => item.dispose()); surfaces.forEach((item) => item.dispose()); previewRenderer.dispose(); },
        };
      },
      dispose() {
        listeners.forEach(([type, handler, settings]) => canvas.removeEventListener(type, handler, settings));
        const geometries = new Set(), materials = new Set();
        scene.traverse((object) => {
          if (object.geometry) geometries.add(object.geometry);
          if (object.material) materials.add(object.material);
        });
        geometries.forEach((geometry) => geometry.dispose());
        if (!geometries.has(wheelGeometry)) wheelGeometry.dispose();
        if (!geometries.has(ultraWheelGeometry)) ultraWheelGeometry.dispose();
        models.forEach((model) => { materials.add(model.playerPaint); materials.add(model.playerStripe); });
        materials.forEach((surface) => surface.dispose());
        textures.forEach((texture) => texture.dispose());
        sun.shadow.map?.dispose();
        renderer.dispose();
      },
      update(population, leader, showSensors, target = leader, finished = false) {
        const wet = clamp(leader?.wetness || 0, 0, 1);
        const rain = clamp(leader?.rainIntensity || 0, 0, 1);
        asphalt.roughness = .96 - wet * .63;
        asphalt.color.lerpColors(dryAsphaltColor, wetAsphaltColor, wet);
        scene.background.lerpColors(drySkyColor, rainySkyColor, rain);
        sun.intensity = 3 - rain * 1.8;
        const engineerTime = Date.now();
        for (const engineer of pitEngineers) {
          // Não anima nem redesenha monitores fora do alcance da câmera.
          engineer.station.visible = engineer.station.position.distanceToSquared(camera.position) < 320 * 320;
          if (!engineer.station.visible) continue;
          const teamCar = population.find(car => car.id === engineer.bay + 1);
          const t = engineerTime / 1000 + engineer.index;
          engineer.head.rotation.y = Math.sin(t * .55) * .12;
          engineer.hands.forEach((arm, index) => { arm.rotation.x = Math.sin(t * 7 + index * 2) * .055; });
          if (engineer.ctx && engineerTime - engineer.lastUpdate >= (options.quality === 'performance' ? 500 : 250)) {
            engineer.lastUpdate = engineerTime;
            const ctx = engineer.ctx;
            ctx.fillStyle = '#081521'; ctx.fillRect(0, 0, 256, 128);
            ctx.fillStyle = '#63ebbc'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(`BOX ${engineer.bay + 1} / TELEMETRIA`, 10, 22);
            ctx.fillStyle = '#edf7ff'; ctx.font = '16px monospace';
            ctx.fillText(teamCar ? `${Math.round((teamCar.speed || 0) * 54)} km/h   M${teamCar.gear || 1}` : 'AGUARDANDO PILOTO', 10, 48);
            ctx.fillText(teamCar ? `PNEUS ${Math.round((teamCar.tyreLife ?? 1) * 100)}%` : 'SEM TELEMETRIA', 10, 72);
            ctx.fillStyle = '#203c4c'; ctx.fillRect(10, 91, 236, 15);
            ctx.fillStyle = '#63ebbc'; ctx.fillRect(10, 91, 236 * Math.min(1, (teamCar?.rpm || 0) / 8000), 15);
            engineer.map.needsUpdate = true;
          }
        }
        snapshot = { leader, target };
        models.forEach((model, index) => { model.group.visible = index < population.length; });
        population.forEach((car, index) => {
          const model = models[index] || (models[index] = createCarModel(index));
          const original = car;
          updateNameplate(model, car, car === target);
          // Animação somente visual: tempos, voltas, colisões e recompensas já estão fechados.
          if (ceremony) {
            const place = ceremony.ids.indexOf(car.id);
            if (place < 0) { model.group.visible = false; return; }
            const t = clamp((ceremony.time - place * .4) / 4, 0, 1);
            const remaining = 100 * (1 - t) ** 3;
            const p = circuitPoint(ceremony.distance + [0, -25, 25][place] - remaining, 24);
            car = { ...car, ...p, speed: 1.25 * (1 - t) ** 2, steering: 0, pitState: null, pitExit: false, bodyRoll: 0 };
            model.coast = null;
          } else if (options.racePresentation && !car.pitExit && (finished || car.done)) {
            if (!model.coast) {
              const nearest = track.nearest(car.x, car.y);
              if (Number.isFinite(nearest.distance)) {
                const lane = (car.x - nearest.x) * -nearest.ty + (car.y - nearest.y) * nearest.tx;
                model.coast = { at: Date.now(), progress: nearest.progress, lane,
                  speed: Math.max(0, model.lastSpeed ?? car.speed), x: car.x, y: car.y, angle: car.angle };
              }
            }
            if (model.coast) {
              const coast = model.coast;
              const t = Math.min(6, Math.max(0, (Date.now() - coast.at) / 1000));
              const distance = coast.speed * 60 * (t - t * t / 12);
              const p = circuitPoint(coast.progress + distance, coast.lane * Math.exp(-distance / 240));
              const blend = Math.min(1, t / 0.8);
              const angleDelta = Math.atan2(Math.sin(p.angle - coast.angle), Math.cos(p.angle - coast.angle));
              car = { ...car, x: p.x, y: p.y,
                angle: coast.angle + angleDelta * blend, speed: coast.speed * (1 - t / 6), steering: 0 };
              if (original === target) snapshot.target = car;
            }
          } else {
            model.coast = null;
            model.lastSpeed = car.speed;
          }
          model.group.visible = true;
          const service = car.pitState === 'service';
          const serviceTime = service ? (480 - car.pitTimer) / 60 : 0;
          const lift = service ? Math.min(1, Math.max(0, serviceTime - 0.7), Math.max(0, 7.7 - serviceTime)) * 0.9 : 0;
          model.group.position.set(car.x, track.heightAt(car.x, car.y) + 0.15 + lift, car.y);
          updatePitCrew(model, service, serviceTime, lift);
          const forwardX = Math.cos(car.angle), forwardY = Math.sin(car.angle);
          const pitch = Math.atan2(track.heightAt(car.x + forwardX * 8, car.y + forwardY * 8)
            - track.heightAt(car.x - forwardX * 8, car.y - forwardY * 8), 16);
          const bank = -Math.atan2(track.heightAt(car.x - forwardY * 4, car.y + forwardX * 4)
            - track.heightAt(car.x + forwardY * 4, car.y - forwardX * 4), 8);
          const suspensionTime = Date.now();
          const suspensionDt = Math.min(.1, Math.max(0, (suspensionTime - (model.suspensionTime ?? suspensionTime)) / 1000));
          const headingDelta = model.lastHeading === undefined ? 0 : Math.atan2(Math.sin(car.angle - model.lastHeading), Math.cos(car.angle - model.lastHeading));
          const teleported = model.lastX !== null && Math.hypot(car.x - model.lastX, car.y - model.lastY) > 30;
          // Online: deriva a aceleração lateral do movimento interpolado, sem novas mensagens.
          const lateral = suspensionDt > 0 ? headingDelta / suspensionDt * Math.max(0, car.speed) * 15 : 0;
          const desiredRoll = service || car.pitExit || car.cooldown || teleported ? 0
            : clamp(Number.isFinite(car.bodyRoll) ? car.bodyRoll : lateral / 9.81 * .075, -.085, .085);
          const resetSuspension = teleported || Boolean(car.cooldown);
          model.rollSpring ||= { value: 0, velocity: 0 };
          model.suspensionRoll = smoothSuspension(model, 'rollSpring', desiredRoll, suspensionDt, 7, resetSuspension);
          const visualBank = smoothSuspension(model, 'bankSpring', bank, suspensionDt, 12, resetSuspension);
          const visualPitch = smoothSuspension(model, 'pitchSpring', pitch, suspensionDt, 12, resetSuspension);
          const visualHeight = smoothSuspension(model, 'heightSpring', track.heightAt(car.x, car.y) + .15, suspensionDt, 14, resetSuspension);
          const roadHeight = track.heightAt(car.x, car.y) + .15;
          model.group.position.y = clamp(visualHeight, roadHeight - .35, roadHeight + .35) + lift;
          model.lastHeading = car.angle; model.suspensionTime = suspensionTime;
          model.group.rotation.set(visualBank + model.suspensionRoll, -car.angle, visualPitch, 'YZX');
          model.group.updateMatrixWorld(true);
          // Limite de compressão: protege assoalho e para-choques nas cristas.
          let clearance = 0;
          for (const x of [-8.3, 0, 8.3]) for (const z of [-3.9, 0, 3.9]) {
            const underside = model.group.localToWorld(new THREE.Vector3(x, 1.2, z));
            clearance = Math.max(clearance, track.heightAt(underside.x, underside.z) + .25 - underside.y);
          }
          if (clearance > 0) { model.group.position.y += clearance; model.group.updateMatrixWorld(true); }
          const distance = model.lastX === null ? 0 : Math.hypot(car.x - model.lastX, car.y - model.lastY);
          model.fxTravel = (model.fxTravel || 0) + distance;
          // O pedal responde imediatamente; a força física do freio sobe gradualmente.
          const brakingHard = (car.activations?.[2]?.[1] ?? 0) < -0.85;
          const strongTireStress = car.speed * 54 >= 130 && brakingHard;
          if (skids && !model.coast && !car.offRoad && !car.cooldown && strongTireStress
            && distance > 0 && distance < 20 && model.fxTravel >= 4) {
            for (const side of [-1, 1]) {
              const x = car.x - forwardX * 5 - forwardY * side * 4;
              const z = car.y - forwardY * 5 + forwardX * side * 4;
              const effect = { x, z, y: track.heightAt(x, z) + 0.25, at: Date.now(), angle: car.angle,
                bank, pitch, length: Math.min(8, model.fxTravel + 1) };
              skidPool[skidIndex++ % 256] = effect;
              if (options.speedEffects !== false && options.quality !== 'performance') smokePool[smokeIndex++ % 48] = effect;
            }
            model.fxTravel = 0;
          } else if (!strongTireStress || distance >= 20) model.fxTravel = 0;
          // O giro acompanha o deslocamento, sem depender do FPS ou girar durante a pausa.
          if (distance < 30) {
            const direction = (car.x - (model.lastX ?? car.x)) * forwardX + (car.y - (model.lastY ?? car.y)) * forwardY;
            model.spin = (model.spin - Math.sign(direction) * distance / wheelRadius) % (Math.PI * 2);
          }
          model.lastX = car.x; model.lastY = car.y;
          const up = new THREE.Vector3(0, 1, 0).applyQuaternion(model.group.quaternion);
          model.wheels.forEach(({ pivot, wheel, x, z }, wheelIndex) => {
            // Contra-inclinação e altura independentes mantêm o pneu apoiado.
            pivot.rotation.x = -model.suspensionRoll;
            const contact = model.group.localToWorld(new THREE.Vector3(x, wheelRadius, z));
            const height = track.heightAt(contact.x, contact.z) + 0.15 + wheelRadius + lift;
            pivot.position.y = wheelRadius + (height - contact.y) / up.y;
            const removal = service ? Math.min(1, Math.max(0, serviceTime - 2), Math.max(0, 6 - serviceTime)) : 0;
            pivot.position.z = z + Math.sign(z) * removal * 1.5;
            wheel.visible = !(service && serviceTime > 3.2 && serviceTime < 4.2);
            wheel.rotation.z = model.spin;
            const flat = car.tyreBurst && car.burstWheel === wheelIndex;
            wheel.scale.set(flat ? .8 : 1, flat ? .65 : 1, 1);
            wheel.children.filter(part => part.userData.wetTyre).forEach(part => { part.visible = car.tyreCompound === 'wet'; });
            pivot.rotation.y = x > 0 ? -car.steering * .4 : 0;
            // Confere toda a banda de rodagem, inclusive as bordas e pneus furados.
            // Repete porque mover no eixo local também altera a posição no relevo.
            for (let pass = 0; pass < 2; pass++) {
              wheel.updateWorldMatrix(true, false);
              let correction = -Infinity;
              for (let sample = 0; sample < 16; sample++) for (const side of [-.6, .6]) {
                const angle = sample * Math.PI / 8;
                const point = new THREE.Vector3(Math.cos(angle) * wheelRadius, Math.sin(angle) * wheelRadius, side).applyMatrix4(wheel.matrixWorld);
                correction = Math.max(correction, track.heightAt(point.x, point.z) + .19 + lift - point.y);
              }
              pivot.position.y += correction / up.y;
            }
          });
          const customized = car.skin;
          if (customized) {
            model.playerPaint.color.set(car.skin.color);
            model.playerStripe.color.set(car.skin.accent);
            const matte = car.skin.finish === 'matte';
            const metallic = car.skin.finish === 'metallic';
            model.playerPaint.roughness = matte ? 0.82 : metallic ? 0.27 : 0.4;
            model.playerPaint.metalness = matte ? 0.08 : metallic ? 0.75 : 0.35;
            model.playerPaint.clearcoat = matte ? 0.08 : options.quality === 'ultra' ? 1 : 0.6;
          }
          model.stripes.forEach((stripe) => { stripe.visible = Boolean(customized); });
          const surface = customized ? model.playerPaint : original === leader ? leaderMaterial
            : car.alive ? bodyMaterials[index % 3] : crashedMaterial;
          model.body.material = surface;
          model.roof.material = surface;
          model.group.children.filter((part) => part.userData.paint).forEach((part) => { part.material = surface; });
          model.frontWheels.forEach((wheel) => { wheel.rotation.y = -car.steering * 0.4; });
          model.brakes.forEach((lamp) => { lamp.material = car.activations[2][1] < 0 && car.alive ? brakeMaterial : red; });
        });

        sensors.visible = showSensors;
        [-1.2, -0.6, 0, 0.6, 1.2].forEach((offset, index) => {
          const distance = leader.inputs[index] * 160;
          sensorPositions.set([
            leader.x, track.heightAt(leader.x, leader.y) + 7, leader.y,
            leader.x + Math.cos(leader.angle + offset) * distance,
            track.heightAt(leader.x + Math.cos(leader.angle + offset) * distance,
              leader.y + Math.sin(leader.angle + offset) * distance) + 7,
            leader.y + Math.sin(leader.angle + offset) * distance,
          ], index * 6);
        });
        sensorGeometry.attributes.position.needsUpdate = true;
        updateTireEffects();
        render();
      },
    };
  };
})();
