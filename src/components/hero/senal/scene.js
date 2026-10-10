/* Dirección A — «Señal», escena 3D.
   Firma: un latido, después silencio. La traza roja es la única fuente de luz.
   La figura de Juan es su foto real en 2D plana (sin profundidad ni deformación), con la cara bien iluminada;
   un borde rojo late con la señal y nunca pasa por la cara.
   Reloj, buffer de la traza y scroll vienen de signal.ts / hero-controller.ts (S): este módulo sólo renderiza.
   Port fiel de la maqueta a-senal/main.js (commit da8ae1b del repo de la agencia). Cambios respecto de la maqueta,
   todos de plumbing y ninguno visual: el canvas se crea acá (un contexto nuevo por montaje, StrictMode monta dos veces),
   los listeners se pueden desmontar (dispose), el loop se pausa con el hero tapado (S.inView) y los assets salen de /senal/.
   Va en JS a propósito: el grafo TSL es el de la maqueta tal cual, sin tipar. */
import * as THREE from 'three/webgpu';
import {
  uniform, texture, uv, vec2, vec3, float, smoothstep, exp, abs, fract, clamp, mix, max, min, pass, screenUV,
  length, attribute, time, sin, cos, instancedBufferAttribute, positionWorld, fwidth, distance, luminance
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Arranca la escena. Devuelve { ready, dispose }. `after`: el canvas del intro 2D (el 3D se inserta después). */
export function bootScene({ S, root, after, assetBase = '/senal/' }) {
  const ctl = { disposed: false, offs: [], renderer: null, pipeline: null, canvas: null, scene: null, texs: [], nodes: [], info: null };
  const ready = boot({ S, root, after, assetBase }, ctl).catch((e) => { if (!ctl.disposed) S.goStatic('boot error: ' + (e && e.message)); });
  function dispose() {
    if (ctl.disposed) return;
    ctl.disposed = true;
    S.onView = () => {};
    ctl.offs.forEach((f) => f());
    ctl.offs.length = 0;
    if (ctl.renderer) { try { ctl.renderer.setAnimationLoop(null); } catch (e) { /* noop */ } }
    // recursos de la escena primero (avisan al renderer con su evento 'dispose'), después el post y el renderer
    if (ctl.scene) {
      ctl.scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      ctl.scene.clear();
    }
    ctl.texs.forEach((t) => t.dispose());
    ctl.nodes.forEach((n) => { try { n.dispose(); } catch (e) { /* noop */ } });
    if (ctl.pipeline && ctl.pipeline.dispose) { try { ctl.pipeline.dispose(); } catch (e) { /* noop */ } }
    releaseRenderer(ctl);
    if (ctl.canvas) ctl.canvas.remove();
    if (ctl.info && window.__senal === ctl.info) delete window.__senal;
  }
  return { ready, dispose };
}

// WebGPU: destruye el device. WebGL 2: pierde el contexto. renderer.dispose() es async y no libera nada si init()
// no terminó: boot() la vuelve a llamar si el desmontaje llegó a mitad de init().
function releaseRenderer(ctl) {
  if (!ctl.renderer) return;
  try { Promise.resolve(ctl.renderer.dispose()).catch(() => {}); } catch (e) { /* noop */ }
}

async function boot({ S, root, after, assetBase }, ctl) {
  const params = S.params;
  const on = (target, type, fn, opt) => { target.addEventListener(type, fn, opt); ctl.offs.push(() => target.removeEventListener(type, fn, opt)); };
  const canvas = document.createElement('canvas');
  canvas.className = 'senal-scene';
  canvas.setAttribute('aria-hidden', 'true');
  after.after(canvas);
  ctl.canvas = canvas;
  let first = true;
  // el loop corre sólo con la pestaña visible y el hero a la vista (S.inView lo escribe hero-controller con un IntersectionObserver)
  const shouldRun = () => !document.hidden && S.inView;
  // watchdog de 12 s: cuenta sólo mientras el loop podría correr (pestaña en segundo plano o hero tapado no caen a estático)
  let wdLeft = 12000, wdT0 = 0, wdId = 0, wdDone = false;
  const wdRun = () => { if (!first || wdDone || wdId || !shouldRun()) return; wdT0 = performance.now(); wdId = setTimeout(() => { wdId = 0; wdLeft = 0; if (first) S.goStatic('watchdog timeout'); }, wdLeft); };
  const wdPause = () => { if (!wdId) return; clearTimeout(wdId); wdId = 0; wdLeft = Math.max(0, wdLeft - (performance.now() - wdT0)); };
  const clearWatchdog = () => { clearTimeout(wdId); wdId = 0; wdDone = true; };
  S.watchdog = { remaining: () => (wdId ? Math.max(0, wdLeft - (performance.now() - wdT0)) : wdLeft), running: () => !!wdId };
  ctl.offs.push(clearWatchdog);
  // pausa / reanudación: la disparan visibilitychange y S.onView. syncLoop la completa el loop, más abajo.
  let syncLoop = () => {};
  const sync = () => {
    if (ctl.disposed || S.dead) return;
    if (shouldRun()) wdRun(); else wdPause();
    syncLoop();
  };
  on(document, 'visibilitychange', sync);
  S.onView = sync;
  wdRun();

  let renderer;
  try {
    renderer = new THREE.WebGPURenderer({ canvas, antialias: true, forceWebGL: params.has('webgl') });
    ctl.renderer = renderer;
    await renderer.init();
  } catch (e) { clearWatchdog(); return S.goStatic('renderer: ' + e.message); }
  if (ctl.disposed) { releaseRenderer(ctl); return; }   // desmontado a mitad de init(): el dispose anterior no liberó el device/contexto
  if (S.dead) return;
  const backend = renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl2';
  const isMobile = () => innerWidth < 900;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));   // la cara nítida en retina (mobile y desktop)
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(0x080808, 1);
  renderer.toneMapping = THREE.NoToneMapping;

  const loader = new THREE.TextureLoader();
  let texs;
  try { texs = await Promise.all(['juan-2d.webp', 'juan-2d-rim.png'].map((f) => loader.loadAsync(assetBase + f))); }
  catch (e) { clearWatchdog(); return S.goStatic('textures: ' + e.message); }
  if (ctl.disposed) { texs.forEach((t) => t.dispose()); return; }
  ctl.texs = texs;

  const scene = new THREE.Scene();
  ctl.scene = scene;
  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 120);
  const { CAM_Z, TRACE_Z, N } = S;
  const RAIL_Z = 33.5, END_D = 7, END_H = 1.25;   // recta final del riel; la cámara la mira desde 7 u de distancia y 1,25 u de alto

  const U = {
    ignite: uniform(0), pulse: uniform(0), dissolve: uniform(0), fadeL: uniform(1),
    light: uniform(new THREE.Vector3(0, -1, 0)), dpr: uniform(1)
  };
  const RED = vec3(0.807, 0.02, 0.023);        // #E8272A en lineal
  const OFF = vec3(0.80, 0.77, 0.73);          // #E8E4DE en lineal

  /* ---------- figura: la foto real de Juan, 2D plana (sin desplazamiento ni deformación) ---------- */
  const figMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  const LINE_V = 0.20;                                     // dónde corta la línea de la señal, en v
  {
    texs[0].colorSpace = THREE.SRGBColorSpace;
    const vUv = uv();
    const c = texture(texs[0], vUv);
    const rim = texture(texs[1], vUv).r;                   // borde rojo que late; el archivo lo apaga sobre la cara
    const matte = smoothstep(0.3, 0.95, c.a);
    const fadeH = mix(float(1), smoothstep(0.02, 0.36, vUv.x), U.fadeL);   // fusión horizontal hacia el texto (no llega a la cara)
    const lineCut = smoothstep(LINE_V, LINE_V + 0.12, vUv.y);              // se disuelve en la señal
    const solid = float(1).sub(U.dissolve);
    const L = luminance(c.rgb);
    const col = mix(vec3(L), c.rgb, 0.3);                                    // casi B/N, con un resto de piel
    const faceBias = smoothstep(0.30, 0.80, vUv.y).mul(0.6).add(0.4);       // la cara bien iluminada, el cuerpo cae
    const key = col.mul(faceBias).mul(1.05).mul(U.ignite);
    const fromLine = exp(vUv.y.sub(LINE_V).mul(-9.0)).mul(L.mul(0.8).add(0.2));
    const upL = RED.mul(fromLine).mul(U.ignite.mul(U.pulse.mul(1.3).add(0.4))).mul(0.45);
    const rimL = RED.mul(rim).mul(U.ignite).mul(U.pulse.mul(1.6).add(0.6)).mul(2.6);
    figMat.colorNode = key.add(upL).mul(fadeH).add(rimL).mul(solid);
    figMat.opacityNode = max(matte.mul(fadeH.mul(0.6).add(0.4)), rim).mul(lineCut).mul(smoothstep(0.0, 0.3, U.ignite)).mul(solid);
  }
  const fig = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), figMat);
  fig.renderOrder = 1;
  scene.add(fig);

  /* ---------- piso: retícula de puntos, sólo donde llega la señal ---------- */
  const floorMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  {
    const p = positionWorld.xz;
    const cell = p.div(0.6);
    const g = abs(fract(cell).sub(0.5)).div(fwidth(cell));
    const gl = float(1).sub(clamp(length(g).sub(0.6), 0, 1));
    const lightFall = exp(distance(p, U.light.xz).mul(-0.55));
    const farFade = smoothstep(-60, -20, positionWorld.z);
    floorMat.colorNode = mix(OFF.mul(0.6), RED, 0.55);
    floorMat.opacityNode = gl.mul(lightFall).mul(farFade).mul(U.ignite).mul(U.pulse.mul(0.5).add(0.22));
  }
  const floorM = new THREE.Mesh(new THREE.PlaneGeometry(90, 110), floorMat);
  floorM.rotation.x = -Math.PI / 2;
  scene.add(floorM);

  /* ---------- polvo ---------- */
  const DUST = isMobile() ? 380 : 900;
  const dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 16; dustPos[i * 3 + 1] = (Math.random() - 0.3) * 7; dustPos[i * 3 + 2] = 8 - Math.random() * 46;
    dustSeed[i] = Math.random();
  }
  const dustMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  {
    const base = instancedBufferAttribute(new THREE.InstancedBufferAttribute(dustPos, 3));
    const seed = instancedBufferAttribute(new THREE.InstancedBufferAttribute(dustSeed, 1));
    const t = time.mul(0.18).add(seed.mul(40));
    dustMat.positionNode = base.add(vec3(sin(t).mul(0.12), cos(t.mul(0.7)).mul(0.08), sin(t.mul(0.5)).mul(0.1)));
    dustMat.scaleNode = seed.mul(0.022).add(0.008);
    const soft = float(1).sub(smoothstep(0.1, 0.5, length(uv().sub(0.5))));
    const near = exp(distance(positionWorld, U.light).mul(-0.35));
    dustMat.colorNode = mix(OFF.mul(0.5), RED.mul(2.2), near.mul(0.8));
    dustMat.opacityNode = soft.mul(U.ignite).mul(near.mul(1.4).add(0.12)).mul(seed.mul(0.6).add(0.4));
  }
  const dust = new THREE.Sprite(dustMat);
  dust.count = DUST; dust.frustumCulled = false;
  scene.add(dust);

  /* ---------- cintas (traza, halo, ecos y — en fig 2 — el contorno) ---------- */
  function makeRibbon(n, width, intensity, alphaMul) {
    const pos = new Float32Array(n * 2 * 3), bri = new Float32Array(n * 2);
    const idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('bri', new THREE.BufferAttribute(bri, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const b = attribute('bri', 'float');
    mat.colorNode = RED.mul(intensity).mul(b.add(U.pulse.mul(0.35)));
    mat.opacityNode = clamp(b, 0, 1).mul(alphaMul);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false; mesh.renderOrder = 2;
    scene.add(mesh);
    return { n, pos, bri, geo, mesh, width, alpha: alphaMul };
  }
  const core = makeRibbon(N, 0.0085, 4.2, uniform(1));
  const halo = makeRibbon(N, 0.028, 0.35, uniform(0.22));
  const echoes = [makeRibbon(N, 0.006, 1.6, uniform(0)), makeRibbon(N, 0.006, 1.6, uniform(0))];
  const ECHO_OFF = [new THREE.Vector3(-1.1, -0.12, 0), new THREE.Vector3(1.25, -0.2, 0)];

  const headMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const headOpacity = uniform(0);
  {
    const r = length(uv().sub(0.5));
    headMat.colorNode = RED.mul(7.0).mul(float(1).sub(smoothstep(0.0, 0.5, r)).pow(3));
    headMat.opacityNode = float(1).sub(smoothstep(0.0, 0.5, r)).mul(headOpacity);
  }
  const head = new THREE.Sprite(headMat);
  head.scale.setScalar(0.16); head.renderOrder = 3;
  scene.add(head);

  /* ---------- composición (fracciones del viewport, idénticas a la figura HTML) ---------- */
  const lay = {};
  const flat = new Float32Array(N * 3), rail = new Float32Array(N * 3), P = new Float32Array(N * 3);
  const visH = (z) => 2 * (CAM_Z - z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  function layout() {
    const G = S.geom(innerWidth, innerHeight);
    const m = G.m;
    camera.fov = G.fov; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    U.dpr.value = renderer.getPixelRatio();
    lay.m = m; lay.horizon = G.horizon; lay.amp = G.amp;
    const hT = visH(TRACE_Z), h0 = visH(0);
    lay.yT = (0.5 - G.horizon) * hT;
    lay.halfW = 0.5 * hT * camera.aspect * 2 * G.halfWFrac;

    // cabeza arriba en headFrac, línea de la señal (v = 0.20) sobre el horizonte — igual que .static-fig en CSS
    const head = m ? 0.10 : 0.075, hFrac = (G.horizon - head) / 0.724, topFrac = head - 0.076 * hFrac;
    const ph = hFrac * h0, pw = ph * 583 / 854;
    fig.scale.set(pw, ph, 1);
    fig.position.set((m ? 0 : 0.2) * h0 * camera.aspect, (0.5 - topFrac) * h0 - ph / 2, 0);
    U.fadeL.value = m ? 0.35 : 1;
    lay.fig = { x: fig.position.x, y: fig.position.y, w: pw, h: ph };

    floorM.position.set(0, lay.yT - 1.25, -30);
    const y = lay.yT;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.7, y - 0.95, 7.7), new THREE.Vector3(-0.7, y - 0.8, 4.4),
      new THREE.Vector3(0.7, y - 0.6, 0.6), new THREE.Vector3(0.1, y - 0.4, -4.6),
      new THREE.Vector3(-1.5, y - 0.22, -10.5), new THREE.Vector3(0.7, y - 0.05, -17.5),
      new THREE.Vector3(2.6, y, -24), new THREE.Vector3(1.4, y, -29.6),
      // el riel dobla a la izquierda y queda recto (z constante): de frente es el horizonte del About
      new THREE.Vector3(-1.2, y, -32.9), new THREE.Vector3(-5, y, -RAIL_Z), new THREE.Vector3(-12, y, -RAIL_Z), new THREE.Vector3(-40, y, -RAIL_Z)
    ], false, 'centripetal');
    lay.endPos = new THREE.Vector3(m ? -4.2 : -6, y + (m ? 1.25 : 1.5), m ? -25.5 : -26);
    lay.endLook = new THREE.Vector3(m ? -4.2 : -6, y + (m ? 0.5 : 0.65), -40);
    lay.anchored = false;
    // Escritorio: la pose final pone la recta del riel exactamente sobre el ancla del About ([data-senal-rail]).
    // f = alto del ancla dentro del About / alto del viewport (el About aterriza con su borde superior en el del viewport).
    const anchor = document.querySelector('[data-senal-rail]');
    const sec = anchor && anchor.closest('section');
    if (!m && sec && matchMedia('(min-width: 1024px)').matches) {
      const f = (anchor.getBoundingClientRect().top - sec.getBoundingClientRect().top) / innerHeight;
      if (f > 0.2 && f < 0.8) {
        const T = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const k = (0.5 - f) * 2;                                   // NDC y de la línea
        const ta = (END_H + k * T * END_D) / (END_D - k * T * END_H); // tan del pitch hacia abajo que la deja en f
        const a = Math.atan(ta);
        const halfW = END_D * T * camera.aspect;
        // el borde derecho cae en x −5, donde la cola ya es recta: con −1,6 entraba el final de la curva y la línea
        // bajaba ~18 px en el borde derecho (1440). Con −5 los bordes quedan a ≤0,5 px del ancla (1200/1440/1920, mouse ±0,15).
        const x = -5 - halfW;
        lay.endPos.set(x, y + END_H, -RAIL_Z + END_D);
        lay.endLook.set(x, y + END_H - Math.sin(a) * 10, -RAIL_Z + END_D - Math.cos(a) * 10);
        lay.anchored = true;
      }
    }
    const tmp = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      flat[i * 3] = -lay.halfW + s * 2 * lay.halfW; flat[i * 3 + 1] = y; flat[i * 3 + 2] = TRACE_Z;
      curve.getPointAt(s, tmp);
      rail[i * 3] = tmp.x; rail[i * 3 + 1] = tmp.y; rail[i * 3 + 2] = tmp.z;
    }
    lay.curve = curve;
    // hasta dónde se recorre el riel antes de retroceder a la pose final (antes de la curva)
    lay.uMax = 0.6;
    for (let u = 0.3; u < 0.95; u += 0.005) { curve.getPointAt(u, tmp); if (tmp.z < -25.5) { lay.uMax = u; break; } }
    lay.heroTarget = new THREE.Vector3(0, lay.yT, TRACE_Z);

  }
  layout();
  on(window, 'resize', layout);

  /* ---------- post: bloom + viñeta ---------- */
  const pipeline = new THREE.RenderPipeline(renderer);
  ctl.pipeline = pipeline;
  const scenePass = pass(scene, camera);
  const col = scenePass.getTextureNode('output');
  const bl = bloom(col, 1.1, 0.55, 0.55);
  ctl.nodes.push(bl, scenePass);   // render targets propios del bloom y del pass
  const vig = smoothstep(1.05, 0.25, length(screenUV.sub(0.5).mul(vec2(1.25, 1.0))).mul(1.35));
  pipeline.outputNode = (params.has('nobloom') ? col : col.add(bl)).mul(vig.mul(0.85).add(0.15));

  /* ---------- construir cintas ---------- */
  const side = new THREE.Vector3(), tan = new THREE.Vector3(), toCam = new THREE.Vector3();
  const smooth = S.smooth;
  function stroke(R, getP, briOf) {
    const camPos = camera.position, n = R.n;
    for (let i = 0; i < n; i++) {
      const a = getP(Math.max(0, i - 1)), ax = a[0], ay = a[1], az = a[2];
      const c = getP(Math.min(n - 1, i + 1));
      tan.set(c[0] - ax, c[1] - ay, c[2] - az);
      const p = getP(i);
      toCam.set(camPos.x - p[0], camPos.y - p[1], camPos.z - p[2]);
      side.crossVectors(tan, toCam).normalize().multiplyScalar(R.width);
      const v = i * 6;
      R.pos[v] = p[0] + side.x; R.pos[v + 1] = p[1] + side.y; R.pos[v + 2] = p[2] + side.z;
      R.pos[v + 3] = p[0] - side.x; R.pos[v + 4] = p[1] - side.y; R.pos[v + 5] = p[2] - side.z;
      const br = briOf(i); R.bri[i * 2] = br; R.bri[i * 2 + 1] = br;
    }
    R.geo.attributes.position.needsUpdate = true;
    R.geo.attributes.bri.needsUpdate = true;
  }
  const tmp3 = [0, 0, 0];
  function buildRibbons(t, bend) {
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      const b = smooth(0, 1, bend * 1.7 - s * 0.7);
      const j = i * 3;
      P[j] = flat[j] + (rail[j] - flat[j]) * b;
      P[j + 1] = flat[j + 1] + (rail[j + 1] - flat[j + 1]) * b + S.val[i] * lay.amp * (1 - 0.35 * b);
      P[j + 2] = flat[j + 2] + (rail[j + 2] - flat[j + 2]) * b;
    }
    const mainP = (i) => { tmp3[0] = P[i * 3]; tmp3[1] = P[i * 3 + 1]; tmp3[2] = P[i * 3 + 2]; return tmp3; };
    const bri = (i) => S.bright(i, t);
    stroke(core, mainP, bri);
    stroke(halo, mainP, bri);
    echoes.forEach((R, k) => {
      if (R.alpha.value < 0.005 && R.built) return;
      R.built = true;
      const off = ECHO_OFF[k];
      stroke(R, (i) => { tmp3[0] = P[i * 3] + off.x; tmp3[1] = P[i * 3 + 1] + off.y - S.val[i] * lay.amp * 0.6; tmp3[2] = P[i * 3 + 2] + off.z; return tmp3; }, (i) => S.bright(i, t) * 0.6);
    });
    const hi = Math.min(N - 1, Math.floor(S.headS * N)) * 3;
    head.position.set(P[hi], P[hi + 1], P[hi + 2]);
    U.light.value.set(P[hi], P[hi + 1], P[hi + 2]);
  }

  /* ---------- cámara ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  on(window, 'pointermove', (e) => { if (e.pointerType === 'mouse') { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; } }, { passive: true });
  const railP = new THREE.Vector3(), railL = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3();
  const endP = new THREE.Vector3(), endL = new THREE.Vector3();
  function railPose(u, outPos, outLook) {
    lay.curve.getPointAt(Math.min(0.999, u), outPos);
    lay.curve.getPointAt(Math.min(1, u + 0.075), outLook);
    outPos.y += 0.55; outLook.y += 0.32;
  }
  function updateCamera(t, dt, p) {
    mouse.x = S.damp(mouse.x, mouse.tx, 3, dt); mouse.y = S.damp(mouse.y, mouse.ty, 3, dt);
    const hp = tmpA.set(0, 0, CAM_Z).lerp(lay.heroTarget, S.dolly(t));
    hp.x += mouse.x * 0.22 + Math.sin(t * 0.13) * 0.04 * S.ign(t);
    hp.y += -mouse.y * 0.06;
    const hl = tmpB.copy(hp).add(tmpC.set(mouse.x * 0.05, 0, -9));
    if (p <= 0.0005) { camera.position.copy(hp); camera.lookAt(hl); }
    else {
      const u = smooth(0.10, 0.80, p) * lay.uMax;
      railPose(u, railP, railL);
      const w = smooth(0.0, 0.32, p), e = smooth(0.62, 1.0, p);
      // al llegar, un resto del mouse en x: el riel no se mueve (es una recta), el polvo y el piso sí (parallax)
      const mx = lay.anchored ? mouse.x * 0.15 * e : 0;
      endP.copy(lay.endPos); endP.x += mx; endL.copy(lay.endLook); endL.x += mx;
      railP.lerp(endP, e); railL.lerp(endL, e);
      camera.position.copy(hp).lerp(railP, w);
      camera.lookAt(hl.lerp(railL, w));
    }
    return smooth(0, 0.3, p);
  }

  /* ---------- progreso de la cámara ----------
     ScrollTrigger sólo da el objetivo (0 en el tope, 1 cuando el About aterriza: su borde superior en el del viewport);
     la cámara lo alcanza con damp en el loop de render. El scroll es nativo y nadie lo toca. */
  const zone = root.closest('.transition-zone') || root;
  const cam = { p: 0, target: 0 };
  const trig = ScrollTrigger.create({
    start: 0,
    end: () => Math.max(1, (zone.parentElement ? zone.parentElement.offsetTop : 0) + zone.offsetHeight),
    invalidateOnRefresh: true,
    onUpdate: (self) => { cam.target = self.progress; },
    onRefresh: (self) => { cam.target = self.progress; },
  });
  cam.target = cam.p = trig.progress;            // recarga a mitad de página: arranca donde está, sin vuelo
  ctl.offs.push(() => trig.kill());
  const CAM_LAMBDA = 4;                          // ~0,25 s de constante de tiempo: sigue al dedo, con masa

  /* ---------- loop ---------- */
  const fpsBuf = []; let lastNow = performance.now(), adaptiveDone = false, loopOn = false;
  const hud = params.has('hud') ? root.querySelector('.senal-hud') : null;
  if (hud) hud.hidden = false;
  ctl.info = { backend, t: { rendererReady: Math.round(performance.now()) }, fps: () => (fpsBuf.length ? (fpsBuf.length / (fpsBuf.reduce((a, b) => a + b, 0) / 1000)).toFixed(1) : null), frames: 0, running: () => loopOn };
  window.__senal = ctl.info;
  console.info('[senal] backend:', backend);

  function frame() {
    if (S.dead || ctl.disposed) { renderer.setAnimationLoop(null); return; }
    const now = performance.now();
    const dtMs = now - lastNow; lastNow = now;
    const dt = Math.min(dtMs / 1000, 1 / 20);
    fpsBuf.push(dtMs); if (fpsBuf.length > 120) fpsBuf.shift();
    const st = S.state, t = S.now();             // hero-controller ya escribió la traza de este frame
    cam.p = S.damp(cam.p, cam.target, CAM_LAMBDA, dt);
    const p = cam.p;
    ctl.info.frames++;

    U.ignite.value = S.ign(t);
    U.pulse.value = S.pulse(t);
    headOpacity.value = S.headAlpha(t);
    const bend = updateCamera(t, dt, p);
    U.dissolve.value = smooth(0.04, 0.2, p);
    echoes.forEach((e) => { e.alpha.value = smooth(0.1, 0.35, p) * 0.5 * (1 - smooth(0.7, 0.95, p)); });
    buildRibbons(t, bend);
    bl.strength.value = 0.95 + U.pulse.value * 0.7 + Math.min(st.vel, 1.2) * 0.35;

    pipeline.render();

    if (first) { first = false; clearWatchdog(); window.__senal.t.firstFrame = Math.round(performance.now()); S.onLive(); }
    if (hud && (Math.round(t * 10) % 5 === 0)) hud.textContent = `${backend}  ${window.__senal.fps()} fps  dpr ${renderer.getPixelRatio().toFixed(2)}  p ${p.toFixed(3)}`;
    if (!adaptiveDone && t > 6 && fpsBuf.length >= 120) {
      adaptiveDone = true;
      const f = Number(window.__senal.fps());
      const floor = isMobile() ? 1.5 : 1;                 // en mobile nunca por debajo de 1,5 (la cara se ablanda)
      if (f < 48 && renderer.getPixelRatio() > floor) { renderer.setPixelRatio(floor); U.dpr.value = floor; console.info('[senal] adaptive: dpr →', floor, 'at', f, 'fps'); }
    }
  }
  // warm-up: compilar todo antes de mostrar (sin tirones en el latido ni en el primer scroll)
  updateCamera(S.now(), 0, 0); buildRibbons(S.now(), 0);
  echoes.forEach((e) => { e.alpha.value = 0; });
  pipeline.render();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (ctl.disposed || S.dead) return;
  syncLoop = () => {
    if (ctl.disposed || S.dead) return;
    if (shouldRun()) { if (!loopOn) { loopOn = true; lastNow = performance.now(); renderer.setAnimationLoop(frame); } }
    else if (loopOn) { loopOn = false; renderer.setAnimationLoop(null); }
  };
  syncLoop();
}
