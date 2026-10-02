/* Renderização independente: recebe o estado dos carros sem alterar a simulação.
 * Three.js r160 está em vendor/ para permitir abrir o HTML sem servidor ou internet.
 * Coordenadas: o (x, y) da simulação corresponde a (x, altura, z) no mundo 3D.
 */
(() => {
  'use strict';

  window.createNeuroTrack3D = function createNeuroTrack3D(element) {
    const THREE = window.THREE;
    if (!THREE) throw new Error('Three.js não foi carregado.');

    const track = window.NeuroTrack;
    const canvas = element('track-3d');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#cbdde6');
    const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 5000);
    scene.add(new THREE.HemisphereLight('#eef8ff', '#526845', 2.4));

    const sun = new THREE.DirectionalLight('#fff5dd', 3);
    sun.position.set(-400, 900, 350);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -900, right: 900, top: 800, bottom: -800, near: 1, far: 2000 });
    sun.shadow.bias = -0.001;
    scene.add(sun);

    // Materiais e geometrias compartilhados entre todos os carros.
    const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.65, ...extra });
    const asphalt = material('#343d48');
    const grass = material('#6a9471');
    const white = material('#eef3f5');
    const red = material('#d26758');
    const rubber = material('#19212c');
    const glass = material('#315167', { metalness: 0.35, roughness: 0.2 });
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
      const vertices = [];
      for (let step = 0; step < count; step++) {
        const i = (from + step) % track.points.length;
        const next = (i + 1) % track.points.length;
        const a = track.offset(i, inner), b = track.offset(i, outer);
        const c = track.offset(next, inner), d = track.offset(next, outer);
        for (const point of [a, c, b, b, c, d]) vertices.push(point.x, 0.15, point.y);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.computeVertexNormals();
      surface.side = THREE.DoubleSide;
      const mesh = addMesh(geometry, surface, scene);
      mesh.receiveShadow = true;
      return mesh;
    }

    const ground = addMesh(new THREE.PlaneGeometry(4000, 3500), grass, scene);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ribbon(-track.halfWidth, track.halfWidth, asphalt);
    for (let i = 0; i < track.points.length; i += 2) {
      const surface = i % 4 ? red : white;
      ribbon(-track.halfWidth - 4, -track.halfWidth, surface, i, 2);
      ribbon(track.halfWidth, track.halfWidth + 4, surface, i, 2);
    }
    ribbon(-track.halfWidth + 1, -track.halfWidth + 1.8, white);
    ribbon(track.halfWidth - 1.8, track.halfWidth - 1, white);

    // Linha de largada perpendicular ao sentido da pista.
    const tileGeometry = new THREE.BoxGeometry(4, 0.2, 4);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 16; col++) {
        const point = track.offset(0, -30 + col * 4);
        const tile = addMesh(tileGeometry, (row + col) % 2 ? rubber : white, scene, [
          point.x + Math.cos(point.angle) * row * 4, 0.3,
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
        const point = track.offset(i, side * (track.halfWidth + 16));
        const barrier = addMesh(barrierGeometry, white, scene, [point.x, 2.5, point.y]);
        barrier.rotation.y = -point.angle;
      }
      if (i % 30 === 0) {
        const point = track.offset(i, track.halfWidth + 26);
        const board = addMesh(boardGeometry, red, scene, [point.x, 8, point.y]);
        board.rotation.y = -point.angle;
      }
    }

    // Modelos low-poly: comprimento e largura seguem o desenho original (16 × 9).
    const bodyGeometry = new THREE.BoxGeometry(16, 3.2, 8);
    const cabinGeometry = new THREE.BoxGeometry(7.5, 2.7, 6.5);
    const roofGeometry = new THREE.BoxGeometry(6.5, 0.5, 6.7);
    const wheelGeometry = new THREE.CylinderGeometry(2, 2, 1.4, 10);
    wheelGeometry.rotateX(Math.PI / 2);
    const lampGeometry = new THREE.BoxGeometry(0.4, 1, 2);
    const spoilerGeometry = new THREE.BoxGeometry(1.5, 0.7, 10);
    const models = [];

    function createCarModel(index) {
      const group = new THREE.Group();
      const body = addMesh(bodyGeometry, bodyMaterials[index % 3], group, [0, 3, 0]);
      body.castShadow = true;
      addMesh(cabinGeometry, glass, group, [-1, 5.3, 0]);
      const roof = addMesh(roofGeometry, body.material, group, [-1, 6.9, 0]);
      addMesh(spoilerGeometry, rubber, group, [-7, 5, 0]);
      const frontWheels = [];
      for (const x of [-5, 5]) {
        for (const z of [-4, 4]) {
          const wheel = addMesh(wheelGeometry, rubber, group, [x, 2, z]);
          if (x > 0) frontWheels.push(wheel);
        }
      }
      const brakes = [];
      for (const z of [-2.5, 2.5]) {
        addMesh(lampGeometry, white, group, [8.1, 3.4, z]);
        brakes.push(addMesh(lampGeometry, red, group, [-8.1, 3.4, z]));
      }
      scene.add(group);
      return { group, body, roof, frontWheels, brakes };
    }

    // Um único conjunto de linhas reutilizado para os cinco sensores do líder.
    const sensorPositions = new Float32Array(30);
    const sensorGeometry = new THREE.BufferGeometry();
    sensorGeometry.setAttribute('position', new THREE.BufferAttribute(sensorPositions, 3));
    const sensors = new THREE.LineSegments(sensorGeometry, new THREE.LineBasicMaterial({ color: '#89ffd0' }));
    sensors.frustumCulled = false;
    scene.add(sensors);
    const halo = addMesh(new THREE.RingGeometry(11, 12, 40), new THREE.MeshBasicMaterial({ color: '#48e6a4', side: THREE.DoubleSide }), scene);
    halo.rotation.x = -Math.PI / 2;

    // Câmera orbital manual, utilizável também durante uma pausa.
    let azimuth = 0.55;
    let chaseOrbit = 0;
    let elevation = 0.85;
    let zoom = 1;
    let snapshot = null;
    let dragging = null;
    let viewportWidth = 0;
    let viewportHeight = 0;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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

      const mode = element('camera').value;
      const car = snapshot?.target;
      if (mode === 'chase' && car) {
        // Terceira pessoa: camera atras do carro, olhando adiante na pista.
        const behind = 42 * zoom;
        const angle = car.angle + chaseOrbit;
        camera.position.set(
          car.x - Math.cos(angle) * behind,
          20 * zoom,
          car.y - Math.sin(angle) * behind,
        );
        camera.lookAt(car.x + Math.cos(car.angle) * 32, 4, car.y + Math.sin(car.angle) * 32);
      } else {
        const follow = mode === 'follow' && car;
        const bounds = track.bounds;
        const target = follow
          ? new THREE.Vector3(car.x, 2, car.y)
          : new THREE.Vector3((bounds.minX + bounds.maxX) / 2, 0, (bounds.minY + bounds.maxY) / 2);
        const distance = (follow ? 105 : 1850 * Math.max(1, 1.45 / camera.aspect)) * zoom;
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

    canvas.addEventListener('pointerdown', (event) => {
      dragging = { x: event.clientX, y: event.clientY, id: event.pointerId };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!dragging || dragging.id !== event.pointerId) return;
      if (element('camera').value === 'chase') chaseOrbit -= (event.clientX - dragging.x) * 0.008;
      else azimuth -= (event.clientX - dragging.x) * 0.008;
      elevation = clamp(elevation + (event.clientY - dragging.y) * 0.006, 0.25, 1.48);
      dragging.x = event.clientX;
      dragging.y = event.clientY;
      render();
    });
    canvas.addEventListener('lostpointercapture', () => { dragging = null; });
    canvas.addEventListener('pointerup', () => { dragging = null; });
    canvas.addEventListener('pointercancel', () => { dragging = null; });
    canvas.addEventListener('wheel', (event) => {
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

    return {
      update(population, leader, showSensors, target = leader) {
        snapshot = { leader, target };
        models.forEach((model, index) => { model.group.visible = index < population.length; });
        population.forEach((car, index) => {
          const model = models[index] || (models[index] = createCarModel(index));
          model.group.visible = true;
          model.group.position.set(car.x, 0.3, car.y);
          model.group.rotation.y = -car.angle;
          const surface = car === leader ? leaderMaterial
            : car.alive ? bodyMaterials[index % 3] : crashedMaterial;
          model.body.material = surface;
          model.roof.material = surface;
          model.frontWheels.forEach((wheel) => { wheel.rotation.y = -car.steering * 0.4; });
          model.brakes.forEach((lamp) => { lamp.material = car.activations[2][1] < 0 && car.alive ? brakeMaterial : red; });
        });

        halo.position.set(leader.x, 0.4, leader.y);
        sensors.visible = showSensors;
        [-1.2, -0.6, 0, 0.6, 1.2].forEach((offset, index) => {
          const distance = leader.inputs[index] * 160;
          sensorPositions.set([
            leader.x, 7, leader.y,
            leader.x + Math.cos(leader.angle + offset) * distance, 7,
            leader.y + Math.sin(leader.angle + offset) * distance,
          ], index * 6);
        });
        sensorGeometry.attributes.position.needsUpdate = true;
        render();
      },
    };
  };
})();
