/* Pódio montado no mesmo cenário e renderizador do autódromo. */
(() => {
  window.createNeuroPodiumScene = (THREE, ranking) => {
    const scene = new THREE.Object3D(), pilots = [], textures = [];
    scene.userData.mapPodium = true;
    const top = ranking.filter(car => !car.disconnected).slice(0, 3);
          const surface = color => new THREE.MeshStandardMaterial({ color, roughness: .4 });
          const dark = surface('#15283b'), white = surface('#eaf5ff');
          const mesh = (geometry, material, parent, x = 0, y = 0, z = 0) => {
            const part = new THREE.Mesh(geometry, material); part.position.set(x, y, z); parent.add(part); return part;
          };
          mesh(new THREE.CylinderGeometry(11, 11, .3, 64), dark, scene, 0, -.15);
          const glow = new THREE.MeshStandardMaterial({ color: '#53e7c0', emissive: '#21745f', emissiveIntensity: .6, roughness: .35 });
          const ring = mesh(new THREE.TorusGeometry(10.8, .065, 8, 96), glow, scene, 0, .05);
          ring.rotation.x = Math.PI / 2;
          for (let row = 0; row < 2; row++) for (let tile = 0; tile < 28; tile++) {
            mesh(new THREE.BoxGeometry(.55, .035, .55), (tile + row) % 2 ? white : dark, scene, -7.45 + tile * .55, .035, 6.1 + row * .55);
          }
          function printed(width, height, paint) {
            const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext?.('2d');
            if (!ctx) return dark;
            paint(ctx);
            const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
            textures.push(map);
            return new THREE.MeshBasicMaterial({ map });
          }
          // Painel de patrocinadores faz parte do cenário, atrás dos pilotos.
          mesh(new THREE.BoxGeometry(23, 10, .35), dark, scene, 0, 5, -4.6);
          for (const x of [-11.8, 11.8]) mesh(new THREE.CylinderGeometry(.13, .13, 10.5, 12), white, scene, x, 5.25, -4.6);
          const banner = printed(1024, 512, ctx => {
            ctx.fillStyle = '#0e2435'; ctx.fillRect(0, 0, 1024, 512);
            ctx.fillStyle = '#55e4bd'; ctx.fillRect(0, 0, 1024, 12);
            ctx.fillStyle = '#eff8ff'; ctx.textAlign = 'center'; ctx.font = 'italic bold 82px sans-serif';
            ctx.fillText('NEURODRIVE', 512, 112);
            ctx.fillStyle = '#55e4bd'; ctx.font = 'bold 25px sans-serif'; ctx.fillText('CELEBRAÇÃO DOS CAMPEÕES', 512, 158);
            for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) {
              ctx.fillStyle = (col + row) % 2 ? '#183449' : '#112b3d'; ctx.fillRect(col * 205 + 4, 190 + row * 78, 197, 70);
              ctx.fillStyle = '#a4bccb'; ctx.font = 'bold 21px sans-serif';
              ctx.fillText(['NEURO', 'PULSO', 'APEX'][((row + col) % 3)], col * 205 + 102, 234 + row * 78);
            }
          });
          mesh(new THREE.PlaneGeometry(22.9, 9.9), banner, scene, 0, 5, -4.41);
          for (const [index, car] of top.entries()) {
            const x = [0, -5, 5][index], height = [3, 2, 1.5][index];
            const medal = new THREE.MeshStandardMaterial({ color: ['#ffd270', '#dce7f0', '#d29870'][index], metalness: .45, roughness: .3 });
            const outline = new THREE.Shape();
            outline.moveTo(-2.15, .12); outline.lineTo(2.15, .12); outline.lineTo(2.15, height - .12);
            outline.lineTo(-2.15, height - .12); outline.closePath();
            const block = new THREE.ExtrudeGeometry(outline, { depth: 3.76, bevelEnabled: true, bevelThickness: .12, bevelSize: .12, bevelSegments: 3, steps: 1 });
            block.translate(0, 0, -1.88);
            mesh(block, dark, scene, x);
            mesh(new THREE.BoxGeometry(4.6, .15, 4), medal, scene, x, height);
            for (const side of [-1, 1]) mesh(new THREE.BoxGeometry(.075, height * .82, .045), medal, scene, x + side * 2.1, height / 2, 2.02);
            mesh(new THREE.BoxGeometry(4.2, .055, .045), glow, scene, x, .1, 2.025);
            const badge = printed(512, 384, ctx => {
              ctx.fillStyle = '#102536'; ctx.fillRect(0, 0, 512, 384);
              ctx.textAlign = 'center'; ctx.fillStyle = ['#ffd270', '#dce7f0', '#d29870'][index];
              ctx.font = 'bold 238px sans-serif'; ctx.fillText(String(index + 1), 256, 245);
              ctx.fillStyle = '#eff8ff'; ctx.font = 'bold 37px sans-serif'; ctx.fillText(car.name || 'Piloto', 256, 325, 465);
            });
            const label = mesh(new THREE.PlaneGeometry(3.95, height * .9), badge, scene, x, height / 2, 2.03);
            label.userData.podiumPlace = index + 1;
            const body = new THREE.Object3D(); body.position.set(x, height, 0); scene.add(body);
            const color = /^#[0-9a-f]{6}$/i.test(car.skin?.color || '') ? car.skin.color : ['#38be98', '#398dd1', '#dc4c66'][index];
            const suit = surface(color), visor = surface('#11202e');
            mesh(new THREE.BoxGeometry(1.45, 1.7, .85), suit, body, 0, 2.35);
            mesh(new THREE.BoxGeometry(.24, 1.6, .04), white, body, 0, 2.35, .45);
            for (const side of [-1, 1]) {
              mesh(new THREE.BoxGeometry(.5, 1.5, .6), suit, body, side * .4, .85);
              mesh(new THREE.BoxGeometry(.6, .25, .95), dark, body, side * .4, .13, .15);
            }
            mesh(new THREE.SphereGeometry(.65, 24, 16), white, body, 0, 3.85);
            mesh(new THREE.BoxGeometry(1.04, .36, .2), visor, body, 0, 3.87, .55);
            const arms = [-1, 1].map(side => {
              const arm = new THREE.Object3D(); arm.position.set(side * .9, 3, 0); body.add(arm);
              mesh(new THREE.CylinderGeometry(.23, .23, 1.8, 12), suit, arm, 0, -.85);
              mesh(new THREE.SphereGeometry(.26, 12, 8), white, arm, 0, -1.75);
              return arm;
            });
            const cup = new THREE.Object3D(); cup.position.z = .6; body.add(cup);
            mesh(new THREE.CylinderGeometry(.8, .35, 1, 24, 1, true), medal, cup, 0, .55);
            mesh(new THREE.CylinderGeometry(.13, .16, .5, 16), medal, cup, 0, -.15);
            mesh(new THREE.BoxGeometry(1.15, .2, .7), dark, cup, 0, -.48);
            for (const side of [-1, 1]) mesh(new THREE.TorusGeometry(.38, .075, 8, 20), medal, cup, side * .75, .5);
            pilots.push({ body, arms, cup, delay: index * .25 });
          }

    return { root: scene,
      update(time) {
        for (const pilot of pilots) {
          pilot.body.visible = time >= 5;
          const lift = Math.min(1, Math.max(0, time - 6 - pilot.delay) / 1.5);
          pilot.arms.forEach((arm, i) => { arm.rotation.z = (i ? -1 : 1) * (1.7 + lift * .8); });
          pilot.cup.position.y = 3.7 + lift * 1.2;
          pilot.body.rotation.y = Math.sin(time * 1.4 + pilot.delay) * .05;
        }
      },
      dispose() {
        const geometries = new Set(), materials = new Set();
        scene.traverse(part => { if (part.geometry) geometries.add(part.geometry); if (part.material) materials.add(part.material); });
        geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
        textures.forEach(item => item.dispose());
        scene.removeFromParent();
      }
    };
  };
})();
