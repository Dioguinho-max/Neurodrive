/* Pódio montado no mesmo cenário e renderizador do autódromo. */
(() => {
  window.createNeuroPodiumScene = (THREE, ranking, { sponsorImages = [] } = {}) => {
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
              const logo = sponsorImages[(row + col) % sponsorImages.length];
              if (logo) {
                // Reuse the track artwork without stretching its 4:1 aspect ratio.
                ctx.drawImage(logo, col * 205 + 10, 202 + row * 78, 185, 46.25);
              } else {
                ctx.fillStyle = '#a4bccb'; ctx.font = 'bold 21px sans-serif';
                ctx.fillText(['APEX', 'NOVA', 'PULSO', 'VERTEX'][(row + col) % 4], col * 205 + 102, 234 + row * 78);
              }
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
            const torso = mesh(new THREE.CylinderGeometry(.75, .57, 1.55, 12), suit, body, 0, 2.35);
            torso.scale.z = .64;
            const belt = mesh(new THREE.CylinderGeometry(.6, .61, .16, 12), dark, body, 0, 1.64);
            belt.scale.z = .7;
            mesh(new THREE.CylinderGeometry(.28, .34, .2, 16), dark, body, 0, 3.18);
            mesh(new THREE.BoxGeometry(.055, 1.27, .035), dark, body, 0, 2.38, .465);
            mesh(new THREE.BoxGeometry(.3, .16, .035), white, body, -.3, 2.75, .45);
            mesh(new THREE.BoxGeometry(.22, .09, .04), medal, body, .3, 2.75, .45);
            for (const side of [-1, 1]) {
              const thigh = mesh(new THREE.CylinderGeometry(.29, .25, .7, 12), suit, body, side * .34, 1.25);
              thigh.scale.z = 1.08;
              mesh(new THREE.SphereGeometry(.25, 12, 8), suit, body, side * .34, .89);
              mesh(new THREE.CylinderGeometry(.24, .2, .62, 12), suit, body, side * .34, .57);
              const boot = mesh(new THREE.SphereGeometry(1, 12, 8), dark, body, side * .34, .19, .13);
              boot.scale.set(.28, .19, .46);
              mesh(new THREE.BoxGeometry(.42, .07, .12), white, body, side * .34, .26, .43);
            }
            const helmet = new THREE.Group(); helmet.position.y = 3.86; body.add(helmet);
            const shell = mesh(new THREE.SphereGeometry(.65, 24, 16), white, helmet);
            shell.scale.set(1, 1.08, .96);
            const glass = mesh(new THREE.SphereGeometry(.666, 24, 8, .25, Math.PI - .5, 1.13, .6), visor, helmet);
            glass.scale.copy(shell.scale);
            const chin = mesh(new THREE.SphereGeometry(.65, 20, 8, .4, Math.PI - .8, 1.78, .36), suit, helmet);
            chin.scale.set(1.025, 1.08, .99);
            for (const side of [-1, 1]) {
              const hinge = mesh(new THREE.CylinderGeometry(.095, .095, .035, 12), dark, helmet, side * .64, .04, 0);
              hinge.rotation.z = Math.PI / 2;
            }
            const arms = [-1, 1].map(side => {
              const arm = new THREE.Object3D(); arm.position.set(side * .77, 2.96, 0); body.add(arm);
              const upper = mesh(new THREE.CylinderGeometry(.23, .21, 1, 12), suit, arm);
              const forearm = mesh(new THREE.CylinderGeometry(.21, .19, 1, 12), suit, arm);
              const elbow = mesh(new THREE.SphereGeometry(.22, 12, 8), suit, arm);
              mesh(new THREE.SphereGeometry(.25, 12, 8), suit, arm);
              const hand = mesh(new THREE.SphereGeometry(1, 12, 8), white, arm);
              hand.scale.set(.2, .24, .18);
              const thumb = mesh(new THREE.SphereGeometry(.095, 10, 6), white, hand, -side * .65, -.1, .45);
              thumb.scale.set(5, 4.17, 5.56);
              hand.userData.podiumHand = side;
              return { arm, upper, forearm, elbow, hand, side };
            });
            const cup = new THREE.Object3D(); cup.position.z = .6; body.add(cup);
            cup.userData.podiumTrophy = true;
            mesh(new THREE.CylinderGeometry(.8, .35, 1, 24, 1, true), medal, cup, 0, .55);
            mesh(new THREE.CylinderGeometry(.13, .16, .5, 16), medal, cup, 0, -.15);
            mesh(new THREE.BoxGeometry(1.15, .2, .7), dark, cup, 0, -.48);
            for (const side of [-1, 1]) mesh(new THREE.TorusGeometry(.38, .075, 8, 20), medal, cup, side * .75, .5);
            pilots.push({ body, arms, cup, helmet, delay: index * .25 });
          }

    const up = new THREE.Vector3(0, 1, 0), wrist = new THREE.Vector3();
    const bend = new THREE.Vector3(), joint = new THREE.Vector3(), direction = new THREE.Vector3();
    const zero = new THREE.Vector3();
    function bone(part, start, end) {
      direction.subVectors(end, start);
      const length = direction.length();
      part.position.copy(start).add(end).multiplyScalar(.5);
      part.scale.y = length;
      part.quaternion.setFromUnitVectors(up, direction.multiplyScalar(1 / length));
    }
    return { root: scene,
      update(time) {
        for (const pilot of pilots) {
          pilot.body.visible = time >= 5;
          const progress = Math.min(1, Math.max(0, time - 6 - pilot.delay) / 1.8);
          const lift = progress * progress * progress * (10 - 15 * progress + 6 * progress * progress);
          const celebration = Math.max(0, time - 7.8 - pilot.delay);
          const sway = (1 - Math.exp(-celebration * 2)) * Math.sin(celebration * 2.4);
          pilot.cup.position.set(sway * .055, 2.6 + lift * 1.8 + sway * .045, .85 - lift * .15);
          // Both gloves stay on the handles. Two equal arm segments bend at
          // the elbow instead of rotating rigid arms beside a floating trophy.
          for (const arm of pilot.arms) {
            wrist.copy(pilot.cup.position).sub(arm.arm.position);
            wrist.x += arm.side * 1.03; wrist.y += .5;
            // Elbows point outward/down, then project the pole perpendicular
            // to the shoulder-to-hand axis for a stable anatomical bend.
            bend.set(arm.side, -.55, .12);
            bend.addScaledVector(wrist, -bend.dot(wrist) / wrist.lengthSq()).normalize();
            joint.copy(wrist).multiplyScalar(.5).addScaledVector(bend, Math.sqrt(Math.max(0, 1.25 ** 2 - wrist.lengthSq() / 4)));
            bone(arm.upper, zero, joint);
            bone(arm.forearm, joint, wrist);
            arm.elbow.position.copy(joint);
            arm.hand.position.copy(wrist);
            arm.hand.quaternion.copy(arm.forearm.quaternion);
          }
          pilot.body.rotation.y = Math.sin(time * 1.1 + pilot.delay) * .035;
          pilot.helmet.rotation.x = -.08 * lift + sway * .015;
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
