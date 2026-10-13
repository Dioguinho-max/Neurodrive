/* A real camera-space interior. No driver body or image covering the windshield. */
(() => {
  window.createNeuroCockpit3D = (THREE, camera) => {
    const root = new THREE.Group(); root.name = 'driver-cabin'; camera.add(root);
    const geometries = new Set(), materials = new Set();
    const mat = (color, roughness = .8, metalness = 0) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness, metalness }); materials.add(m); return m;
    };
    const leather = mat('#181e22'), trim = mat('#424d54', .4, .6), black = mat('#070b0d'), fabric = mat('#353b3d');
    const satin = mat('#78858b', .38, .72), accent = mat('#a5b7ae', .5, .3);
    const grainData = new Uint8Array(64 * 64 * 4);
    let seed = 47;
    for (let i = 0; i < grainData.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      grainData[i] = grainData[i + 1] = grainData[i + 2] = 95 + (seed >>> 26);
      grainData[i + 3] = 255;
    }
    const grain = new THREE.DataTexture(grainData,64,64); grain.needsUpdate = true;
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(8,8);
    leather.bumpMap = fabric.bumpMap = grain; leather.bumpScale = .0018; fabric.bumpScale = .001;
    function mesh(geometry, material, x, y, z, parent = root) {
      geometries.add(geometry); const item = new THREE.Mesh(geometry, material);
      item.position.set(x, y, z); parent.add(item); return item;
    }
    const box = (w,h,d,m,x,y,z,p) => {
      const r=Math.min(.06,w/5,h/5,d/5),shape=new THREE.Shape();
      shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);
      shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);
      shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);
      shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
      const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-r*2,bevelEnabled:true,bevelThickness:r,bevelSize:r/2,bevelSegments:2,steps:1,curveSegments:3});
      geometry.translate(0,0,-(d-r*2)/2);
      return mesh(geometry,m,x,y,z,p);
    };
    const tube = (a,b,r,m,p=root) => {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
      const item = mesh(new THREE.CylinderGeometry(r,r,direction.length(),12),m,...start.clone().add(end).multiplyScalar(.5).toArray(),p);
      item.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize()); return item;
    };
    // Sloped dashboard, padded binnacle and passenger fascia have distinct depth.
    const dash = box(4.8,.44,.85,leather,.5,-.98,-2.12); dash.rotation.x = -.14;
    box(4.8,.12,.95,fabric,.5,-.75,-2.22);
    box(2.1,.32,.12,leather,1.25,-1.03,-1.66);
    box(2.12,.028,.026,satin,1.25,-.89,-1.584);
    box(1.55,.2,.024,fabric,1.47,-1.06,-1.582);
    box(.18,.024,.028,satin,1.47,-.995,-1.56);
    box(1.16,.53,.22,black,0,-.62,-1.88);
    const brow = box(1.24,.045,.36,leather,0,-.35,-1.96); brow.rotation.x = -.15;
    box(1.18,.017,.015,satin,0,-.365,-1.768);
    for (const x of [-.92,.87,1.6]) {
      box(.44,.24,.075,satin,x,-.71,-1.69);
      box(.41,.21,.08,black,x,-.71,-1.65);
      for(let i=0;i<5;i++) { const slat = box(.35,.009,.04,trim,x,-.785+i*.037,-1.6); slat.rotation.x=-.15; }
      box(.025,.065,.025,satin,x+.065,-.705,-1.568);
    }
    // A-pillars, roof edge and door trims frame actual transparent windows.
    function pillar(a,b) {
      const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
      const middle=start.clone().add(end).multiplyScalar(.5);
      const frame=box(.09,delta.length(),.055,fabric,...middle.toArray());
      frame.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
      frame.name='cabin-windshield-pillar';
    }
    pillar([-1.66,-.94,-1.7],[-1.94,1.43,-2.05]);
    pillar([2.52,-.92,-1.7],[2.4,1.43,-2.05]);
    box(4.5,.07,.25,leather,.23,1.46,-2.07);
    box(.15,.52,2.7,leather,-1.63,-1.18,-.75);
    box(.13,.13,2.4,trim,-1.53,-.92,-.75);
    box(.13,.25,.85,fabric,-1.52,-1.2,-1);
    box(.17,.065,.46,leather,-1.46,-1.07,-.92);
    tube([-1.42,-1.0,-1.12],[-1.42,-1.0,-.91],.013,satin);
    // One stitched seam, kept off the windshield and instruments.
    const seam=[];
    for(let x=-1.3;x<2.5;x+=.035) seam.push(x,-.823,-1.632,x+.019,-.823,-1.632);
    const seamGeometry=new THREE.BufferGeometry();seamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(seam,3));geometries.add(seamGeometry);
    const seamMaterial=new THREE.LineBasicMaterial({color:'#85938a'});materials.add(seamMaterial);
    root.add(new THREE.LineSegments(seamGeometry,seamMaterial));
    box(4.8,.16,3.4,black,.4,-1.62,-.65);
    const cabinLight=new THREE.PointLight('#d3e4ed',.65,5,2);cabinLight.position.set(-.4,.25,-.4);root.add(cabinLight);
    const center = box(.58,.6,1.35,leather,.87,-1.38,-1.1); center.rotation.x = -.12;
    // Controls share their support's transform. The horizontal console starts
    // behind the fascia, below the knobs, instead of cutting through them.
    box(.54,.035,.63,trim,.87,-1.15,-.99);
    const stack = new THREE.Group();stack.position.set(.84,-.975,-1.535);stack.rotation.x=-.1;root.add(stack);
    box(.51,.32,.055,black,0,0,0,stack);
    box(.4,.11,.018,trim,0,.062,.037,stack);
    box(.365,.078,.008,mat('#132b2d',.35),0,.062,.051,stack);
    for(let i=0;i<3;i++) {
      const x=-.13+i*.13;
      const knob=mesh(new THREE.CylinderGeometry(.03,.03,.026,24),satin,x,-.075,.046,stack);knob.rotation.x=Math.PI/2;
      mesh(new THREE.CircleGeometry(.024,24),black,x,-.075,.060,stack);
      box(.003,.01,.002,accent,x,-.058,.062,stack);
    }
    // Steering column, rim and three metal spokes, all genuine geometry.
    tube([0,-.94,-1.8],[0,-.88,-1.12],.072,black);
    const wheel = new THREE.Group(); wheel.position.set(0,-.88,-1.14); wheel.rotation.x=-.15; root.add(wheel);
    wheel.name='cabin-steering-wheel';
    mesh(new THREE.TorusGeometry(.36,.035,12,64),leather,0,0,0,wheel);
    mesh(new THREE.TorusGeometry(.324,.008,6,64),trim,0,0,.006,wheel);
    for(const a of [0,Math.PI,Math.PI*1.5]) {
      const spoke=box(.23,.059,.021,trim,Math.cos(a)*.205,Math.sin(a)*.205,0,wheel);spoke.rotation.z=a;
    }
    box(.017,.056,.015,accent,0,.357,.015,wheel);
    for(const side of [-1,1]) for(let i=0;i<2;i++) box(.027,.018,.012,black,side*(.16+i*.045),.002,.023,wheel);
    const hub = mesh(new THREE.CylinderGeometry(.105,.12,.075,32),leather,0,0,.018,wheel);hub.rotation.x=Math.PI/2;
    // Suspended pedals in the footwell; each complete assembly pivots at its mount.
    const pedals = {};
    for (const [name,x,width,height] of [['brake',-.34,.16,.15],['throttle',.34,.095,.23]]) {
      const pivot = new THREE.Group(); pivot.name=`cabin-${name}-pedal`;
      pivot.position.set(x,-1.015,-1.55); root.add(pivot); pedals[name]=pivot;
      tube([0,0,0],[0,-.17,.095],.012,trim,pivot);
      box(width,height,.025,satin,0,-.205,.105,pivot);
      for(let i=0;i<4;i++) box(width*.79,.009,.006,black,0,-.205-height*.3+i*height*.2,.123,pivot);
      const mount=mesh(new THREE.CylinderGeometry(.025,.025,width*.7,16),black,x,-1.015,-1.55);mount.rotation.z=Math.PI/2;
    }
    // Six-speed lever pivots at the boot; automatic mode keeps it parked.
    mesh(new THREE.ConeGeometry(.105,.17,24),black,.81,-1.09,-1.12);
    for(let i=0;i<4;i++) { const fold=mesh(new THREE.TorusGeometry(.084-i*.016,.009,6,24),leather,.81,-1.14+i*.035,-1.12);fold.rotation.x=Math.PI/2; }
    const lever = new THREE.Group(); lever.position.set(.81,-1.03,-1.12); root.add(lever);
    lever.name='cabin-gear-lever';
    tube([0,0,0],[0,.22,0],.012,trim,lever);
    mesh(new THREE.SphereGeometry(.045,20,14),leather,0,.25,0,lever);
    const cap=mesh(new THREE.CircleGeometry(.023,20),satin,0,.294,0,lever);cap.rotation.x=-Math.PI/2;
    // Small offscreen views, rendered only in the active cockpit. Three
    // viewpoints preserve the different rear/left/right fields of view.
    const mirrors=[];
    function mirror(name,x,y,z,w,h,side) {
      const housing=box(w+.035,h+.035,.055,leather,x,y,z);
      housing.name=`cabin-${name}-mirror`;
      const target=new THREE.WebGLRenderTarget(side===0?384:192,128,{depthBuffer:true,stencilBuffer:false});
      target.texture.colorSpace=THREE.SRGBColorSpace;
      const surface=new THREE.MeshBasicMaterial({map:target.texture,toneMapped:false});materials.add(surface);
      const geometry=new THREE.PlaneGeometry(w,h);
      const uv=geometry.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i)); // Optical mirror, not a backwards-facing video feed.
      mesh(geometry,surface,x,y,z+.032);
      mirrors.push({target,view:new THREE.PerspectiveCamera(side===0?42:58,w/h,.5,5000),side});
    }
    tube([.54,1.4,-2.12],[.54,1.02,-2.06],.015,black);
    mirror('rear',.54,.92,-1.98,.64,.205,0);
    tube([-1.67,-.71,-2.13],[-2.1,-.42,-2.12],.022,black);
    mirror('left',-2.12,-.35,-2.04,.31,.22,-1);
    tube([2.22,-.71,-2.13],[2.41,-.42,-2.12],.022,black);
    mirror('right',2.43,-.35,-2.04,.31,.22,1);
    let lastMirror=-Infinity, nextMirror=0;
    const screen = document.createElement('canvas'); screen.width=768;screen.height=320;
    const ctx=screen.getContext('2d');
    const texture=new THREE.CanvasTexture(screen);texture.colorSpace=THREE.SRGBColorSpace;
    const display=new THREE.MeshBasicMaterial({map:texture});materials.add(display);
    mesh(new THREE.PlaneGeometry(1.07,.445),display,0,-.60,-1.759);
    // Batch immobile pieces by material within each animated assembly. Steering,
    // pedals and lever remain separate groups; their geometry does not change.
    function batchParts(parent) {
      for(const child of [...parent.children]) if(child.isGroup) batchParts(child);
      const batches=new Map();
      for(const child of parent.children) {
        if(!child.isMesh||child.name||Array.isArray(child.material))continue;
        const parts=batches.get(child.material)||[];parts.push(child);batches.set(child.material,parts);
      }
      for(const [surface,parts] of batches) {
        if(parts.length<2)continue;
        const baked=parts.map(part=>{
          part.updateMatrix();
          const geometry=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();
          return geometry.applyMatrix4(part.matrix);
        });
        const merged=new THREE.BufferGeometry();
        for(const key of ['position','normal','uv']) {
          const size=baked[0].getAttribute(key).itemSize;
          const values=new Float32Array(baked.reduce((sum,g)=>sum+g.getAttribute(key).array.length,0));
          let offset=0;
          for(const geometry of baked){const data=geometry.getAttribute(key).array;values.set(data,offset);offset+=data.length;}
          merged.setAttribute(key,new THREE.BufferAttribute(values,size));
        }
        merged.computeBoundingSphere();geometries.add(merged);
        const batch=new THREE.Mesh(merged,surface);batch.name='cabin-static-batch';batch.matrixAutoUpdate=false;parent.add(batch);
        for(const part of parts){parent.remove(part);geometries.delete(part.geometry);part.geometry.dispose();}
        baked.forEach(g=>g.dispose());
      }
    }
    batchParts(root);
    let lastDraw=-Infinity, lastMotion=null;
    function gauge(x,value,max,label,text){
      ctx.strokeStyle='#687c80';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,133,100,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<=24;i++){const a=(-215+i*250/24)*Math.PI/180;ctx.strokeStyle=i>19?'#ed785f':'#d2dbd4';ctx.lineWidth=i%3===0?3:1;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*85,133+Math.sin(a)*85);ctx.lineTo(x+Math.cos(a)*(i%3===0?72:80),133+Math.sin(a)*(i%3===0?72:80));ctx.stroke();}
      const angle=(-215+Math.max(0,Math.min(1,value/max))*250)*Math.PI/180;
      ctx.strokeStyle='#ff885c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,133);ctx.lineTo(x+Math.cos(angle)*72,133+Math.sin(angle)*72);ctx.stroke();
      ctx.textAlign='center';ctx.fillStyle='#e0efe5';ctx.font='bold 26px sans-serif';ctx.fillText(text,x,188);ctx.font='15px sans-serif';ctx.fillText(label,x,213);
    }
    root.visible=false;
    return {
      root,
      renderMirrors(renderer,scene,car,quality='performance',now=performance.now()) {
        // One offscreen scene per update, avoiding three expensive passes in the
        // same frame. Each mirror runs at ~6/10/15 Hz for performance/high/ultra.
        const interval=quality==='ultra'?22:quality==='high'?33:55;
        if(!root.visible||!car||now-lastMirror<interval)return;
        lastMirror=now;
        const previousTarget=renderer.getRenderTarget(),shadowUpdate=renderer.shadowMap.autoUpdate;
        const wasVisible=root.visible;
        root.visible=false;renderer.shadowMap.autoUpdate=false;
        try {
          const fx=Math.cos(car.angle),fz=Math.sin(car.angle),rx=-fz,rz=fx;
          const {target,view,side}=mirrors[nextMirror];
          {
            view.position.set(car.x-fx*7+rx*side*4,camera.position.y-.3,car.y-fz*7+rz*side*4);
            view.lookAt(view.position.x-fx*70+rx*side*25,view.position.y-2,view.position.z-fz*70+rz*side*25);
            renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,view);
          }
          nextMirror=(nextMirror+1)%mirrors.length;
        } finally {
          renderer.setRenderTarget(previousTarget);renderer.shadowMap.autoUpdate=shadowUpdate;root.visible=wasVisible;
        }
      },
      update(car, visible, now=performance.now()) {
        root.visible=visible; if(!visible)return;
        const dt=lastMotion===null?1/60:Math.max(0,Math.min(.1,(now-lastMotion)/1000));lastMotion=now;
        const pedalBlend=1-Math.exp(-18*dt);
        const throttle=Math.max(0,Math.min(1,Number(car.throttle)||0));
        const braking=Math.max(0,Math.min(1,Number(car.brake)||0));
        pedals.throttle.rotation.x=THREE.MathUtils.lerp(pedals.throttle.rotation.x,throttle*.34,pedalBlend);
        pedals.brake.rotation.x=THREE.MathUtils.lerp(pedals.brake.rotation.x,braking*.24,pedalBlend);
        const steer=Math.max(-1,Math.min(1,car.steering||0));
        wheel.rotation.z=THREE.MathUtils.lerp(wheel.rotation.z,-steer*1.3,.22);
        const gear=Math.max(1,Math.min(6,car.gear||1));
        lever.rotation.z=THREE.MathUtils.lerp(lever.rotation.z,car.manual?-(Math.floor((gear-1)/2)-1)*.22:0,.2);
        lever.rotation.x=THREE.MathUtils.lerp(lever.rotation.x,car.manual?(gear%2?-.22:.22):0,.2);
        root.rotation.z=THREE.MathUtils.lerp(root.rotation.z,steer*Math.min(car.speed||0,3)*.003,.08);
        if(now-lastDraw<80)return;lastDraw=now;
        ctx.fillStyle='#081215';ctx.fillRect(0,0,768,320);
        gauge(155,car.speed*54,240,'KM/H',String(Math.max(0,Math.round(car.speed*54))));
        gauge(460,car.rpm||0,8000,'RPM',String(Math.round((car.rpm||0)/100)*100));
        ctx.fillStyle='#9eebc2';ctx.textAlign='center';ctx.font='bold 50px sans-serif';ctx.fillText(String(gear),310,130);
        ctx.font='14px sans-serif';ctx.fillText(car.manual?'MANUAL':'AUTO',310,156);
        const en=document.documentElement.lang.startsWith('en');
        ctx.font='18px sans-serif';ctx.fillText(car.tyreCompound==='wet'?(en?'WET':'CHUVA'):(en?'DRY':'SECO'),665,103);
        ctx.fillStyle=car.tyreBurst?'#ff735d':'#bdebcf';ctx.font='bold 24px sans-serif';ctx.fillText(car.tyreBurst?'!':`${Math.max(0,Math.ceil((car.tyreLife??1)*100))}%`,665,147);
        ctx.fillStyle='#263a3d';ctx.fillRect(606,175,118,8);ctx.fillStyle='#92d7b0';ctx.fillRect(606,175,118*Math.max(0,Math.min(1,car.tyreLife??1)),8);
        texture.needsUpdate=true;
      },
      dispose(){camera.remove(root);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());texture.dispose();grain.dispose();mirrors.forEach(m=>m.target.dispose());},
    };
  };
})();
