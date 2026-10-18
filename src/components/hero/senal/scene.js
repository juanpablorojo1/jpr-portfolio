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
import { GAL_ABOUT_OUT } from './gallery';
import { QUALITY, probeGpu, pickLevel, initAdaptive, stepAdaptive } from './quality';
// corridor / network / ecg / convergence: en shots.js, importado por proximidad (startCorridor)
let shotsMod = null;
const loadShots = () => (shotsMod = shotsMod || import('./shots'));

gsap.registerPlugin(ScrollTrigger);

/** Arranca la escena. Devuelve { ready, dispose }. `after`: el canvas del intro 2D (el 3D se inserta después). */
export function bootScene({ S, root, after, assetBase = '/senal/' }) {
  const ctl = { disposed: false, offs: [], renderer: null, pipeline: null, pipelines: [], canvas: null, scene: null, texs: [], nodes: [], info: null };
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
    [ctl.pipeline, ...ctl.pipelines].forEach((pl) => { if (pl && pl.dispose) { try { pl.dispose(); } catch (e) { /* noop */ } } });
    releaseRenderer(ctl);
    if (ctl.canvas) ctl.canvas.remove();
    if (ctl.info && window.__senal === ctl.info) delete window.__senal;
  }
  ctl.dispose = dispose;                          // el último nivel automático (versión estática) libera todo en vivo (C-03)
  return { ready, dispose };
}

// WebGPU: destruye el device. WebGL 2: pierde el contexto. renderer.dispose() es async y no libera nada si init()
// no terminó: boot() la vuelve a llamar si el desmontaje llegó a mitad de init().
function releaseRenderer(ctl) {
  if (!ctl.renderer) return;
  try { Promise.resolve(ctl.renderer.dispose()).catch(() => {}); } catch (e) { /* noop */ }
}

// cede el hilo principal entre etapas del arranque: tareas más cortas, menos tiempo de bloqueo (TBT).
// scheduler.yield() corre con setTimeout(0) en paralelo: con la pestaña oculta la continuación de yield() puede
// quedar retenida y el arranque no debe colgarse de eso (gana el que llegue primero).
const yieldToMain = () => new Promise((r) => {
  const sch = globalThis.scheduler;
  if (sch && typeof sch.yield === 'function') sch.yield().then(r, r);
  setTimeout(r, 0);
});

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
  // el pasillo (Projects → Contact) se declara acá y no donde se arma: sync corre desde S.onView y visibilitychange
  // durante los await del arranque, y leía `corr` en su zona muerta temporal (ReferenceError en la consola)
  let corr = null, corrBuilding = false, corrIn = 0;
  // C-02: después de un cambio de tamaño del drawing buffer (nivel de calidad o resize) el post que NO está en uso
  // (el del pasillo en el hero, el del hero en la galería) rehace sus render targets y recompila recién al dibujarse:
  // se lo dibuja una vez con el scroll quieto, antes de que haga falta
  let warmPost = false;
  const sync = () => {
    if (ctl.disposed || S.dead) return;
    if (shouldRun()) wdRun(); else { wdPause(); if (corr) corr.fbf.pauseAll(); }   // videos de Frame by Frame: pausa fuera de vista
    syncLoop();
  };
  on(document, 'visibilitychange', sync);
  S.onView = sync;
  wdRun();

  // GPU dedicada (Juan: «usá mi GPU, no la placa del procesador»). WebGPU: el hint va al requestAdapter de three.
  // El respaldo WebGL2 de three no pasa powerPreference a getContext: se lo agrega este envoltorio, sólo en este canvas.
  // Es un pedido, no una garantía: en Windows decide la configuración de gráficos del sistema para Chrome.
  // Con qué GPU corrió queda en __senal.gpu, en el HUD (?hud) y en bench() (?qa).
  if (!canvas.__hiPerf) {
    const getCtx = canvas.getContext.bind(canvas);
    canvas.getContext = (type, attrs) => getCtx(type, type === 'webgl2' ? { ...attrs, powerPreference: 'high-performance' } : attrs);
    canvas.__hiPerf = true;
  }
  // nivel de calidad (quality.js): se decide antes del renderer porque el MSAA va en su constructor
  const qBoot = pickLevel(params, await probeGpu(params.has('webgl')));
  if (ctl.disposed || S.dead) return;
  const Qs = { ...qBoot };
  const QL = () => QUALITY[Qs.level];
  let renderer;
  try {
    // ?msaa=0|4 (QA): fuerza el MSAA del pase por encima del nivel, para medir su costo
    const msaa = params.has('msaa') ? params.get('msaa') !== '0' : QL().msaa;
    renderer = new THREE.WebGPURenderer({ canvas, antialias: msaa, forceWebGL: params.has('webgl'), powerPreference: 'high-performance' });
    ctl.renderer = renderer;
    await renderer.init();
  } catch (e) { clearWatchdog(); return S.goStatic('renderer: ' + e.message); }
  if (ctl.disposed) { releaseRenderer(ctl); return; }   // desmontado a mitad de init(): el dispose anterior no liberó el device/contexto
  if (S.dead) return;
  const backend = renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl2';
  const gpu = (() => {
    try {
      const dev = renderer.backend.device, gl = renderer.backend.gl;
      if (dev) {
        const i = dev.adapterInfo || {};
        return [i.vendor, i.architecture, i.description || i.device].filter(Boolean).join(' · ') || 'webgpu (sin adapterInfo)';
      }
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
      }
    } catch (e) { /* sin dato */ }
    return 'desconocida';
  })();
  const isMobile = () => innerWidth < 900;
  // la galería de Projects existe sólo ≥1024 (data-gallery, projects-senal.css); debajo, Projects queda apilado
  const wideMQ = matchMedia('(min-width: 1024px)');
  // DPR por nivel (alto: el de siempre, min(dpr, 2), la cara nítida en retina). En el teléfono nunca menos de 1,5.
  const dprFor = (lv) => { const c = Math.min(devicePixelRatio, QUALITY[lv].dprCap); return isMobile() ? Math.max(c, Math.min(devicePixelRatio, 1.5)) : c; };
  renderer.setPixelRatio(dprFor(Qs.level));
  if (params.has('perf')) console.info('[senal] quality:', Qs.level, '|', Qs.reason);   // D-04: el diagnóstico sólo con ?perf
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
    light: uniform(new THREE.Vector3(0, -1, 0)), dpr: uniform(1),
    galW: uniform(0),                            // peso de la galería (Projects): 0 en el About, 1 con la galería abierta
    abW: uniform(0),                             // peso del About aterrizado (capas de profundidad): 0 en el hero
    abRail: uniform(new THREE.Vector3())         // punto del riel recto frente a la cámara del About (x de cámara, yT, −RAIL_Z)
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
    const fw = fwidth(cell);
    const g = abs(fract(cell).sub(0.5)).div(fw);
    // cerca del horizonte una celda mide menos de ~2 px de alto: las filas de puntos se funden en guiones (moiré).
    // Ahí la retícula se apaga con la distancia en pantalla (D-18); la parte cercana queda igual.
    const alias = float(1).sub(smoothstep(0.22, 0.5, max(fw.x, fw.y)));
    const gl = float(1).sub(clamp(length(g).sub(0.6), 0, 1)).mul(alias);
    const lightFall = exp(distance(p, U.light.xz).mul(-0.55));
    const farFade = smoothstep(-60, -20, positionWorld.z);
    // en el About el piso es casi neutro (el rojo queda en la recta y en el polvo que la rodea)
    floorMat.colorNode = mix(mix(OFF.mul(0.6), RED, 0.55), OFF.mul(0.5), U.abW.mul(0.75));
    // About aterrizado (U.abW): la recta ilumina el piso que tiene debajo y detrás. Una franja a lo largo del riel
    // (sólo depende de z), que se apaga cerca de la lente y se pierde en la niebla del fondo: la retícula es la capa
    // de fondo que se separa de la recta cuando la cámara orbita alrededor de ella. En el hero abW = 0: igual que antes.
    const zr = positionWorld.z.sub(U.abRail.z);
    // La franja vive detrás de la recta (en pantalla: detrás del titular y del hueco de arriba a la derecha); delante
    // de la recta (detrás del cuerpo de texto) se apaga, para no puntear las líneas de lectura.
    const abBand = exp(abs(zr.add(12.0)).mul(-0.1));
    const abFar = smoothstep(-42.0, -14.0, zr), abNear = float(1).sub(smoothstep(-10.0, -3.0, zr));
    const abL = abBand.mul(abFar).mul(abNear).mul(U.abW).mul(U.pulse.mul(0.15).add(0.42));
    // con el pasillo de Projects abierto (galW) el piso de puntos se apaga: el pasillo tiene el suyo
    floorMat.opacityNode = gl.mul(lightFall.mul(farFade).mul(U.pulse.mul(0.5).add(0.22)).add(abL)).mul(U.ignite).mul(float(1).sub(U.galW));
  }
  // 150 de ancho, corrido a la izquierda
  const floorM = new THREE.Mesh(new THREE.PlaneGeometry(150, 110), floorMat);
  floorM.rotation.x = -Math.PI / 2;
  scene.add(floorM);

  /* ---------- polvo del hero (se apaga con el pasillo de Projects abierto) ---------- */
  function makeDust(count, gen) {
    const dustPos = new Float32Array(count * 3), dustSeed = new Float32Array(count);
    for (let i = 0; i < count; i++) { gen(dustPos, i * 3); dustSeed[i] = Math.random(); }
    const dustMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const base = instancedBufferAttribute(new THREE.InstancedBufferAttribute(dustPos, 3));
    const seed = instancedBufferAttribute(new THREE.InstancedBufferAttribute(dustSeed, 1));
    const t = time.mul(0.18).add(seed.mul(40));
    dustMat.positionNode = base.add(vec3(sin(t).mul(0.12), cos(t.mul(0.7)).mul(0.08), sin(t.mul(0.5)).mul(0.1)));
    dustMat.scaleNode = seed.mul(0.022).add(0.008);
    const soft = float(1).sub(smoothstep(0.1, 0.5, length(uv().sub(0.5))));
    const near = exp(distance(positionWorld, U.light).mul(-0.35));
    dustMat.colorNode = mix(OFF.mul(0.5), RED.mul(2.2), near.mul(0.8));
    dustMat.opacityNode = soft.mul(U.ignite).mul(near.mul(1.4).add(0.12)).mul(seed.mul(0.6).add(0.4)).mul(float(1).sub(U.galW));
    const d = new THREE.Sprite(dustMat);
    d.count = count; d.frustumCulled = false; d.userData.dust = count;
    scene.add(d);
    return d;
  }
  const heroDust = makeDust(isMobile() ? 380 : 900, (a, j) => {
    a[j] = (Math.random() - 0.5) * 16; a[j + 1] = (Math.random() - 0.3) * 7; a[j + 2] = 8 - Math.random() * 46;
  });

  /* ---------- About: capas de profundidad (escritorio, sólo con el About aterrizado: U.abW) ----------
     La recta es el eje: la cámara orbita alrededor de ella (updateCamera), así la recta y el titular que se apoya
     encima no se mueven y todo lo demás se separa por parallax. De atrás hacia adelante: niebla en el horizonte del
     piso, la retícula del piso (floorMat), polvo alrededor del riel, el HTML (titular, texto, foto) y, sobre todo,
     motas desenfocadas cerca de la lente ([data-ab-fg], HTML que esta escena posiciona en cada frame).
     Las dos capas 3D quedan invisibles (visible = false) fuera del About: el hero no paga nada. */
  const abGroup = new THREE.Group();              // origen en U.abRail (lo coloca layout)
  scene.add(abGroup);
  // niebla: una franja tenue sobre el horizonte del piso, lejos (36 u detrás del riel), más clara a la derecha,
  // donde no hay texto (sobre la foto y el hueco de arriba). Neutra con un resto cálido del rojo.
  const hazeMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  {
    const lp = positionWorld.sub(U.abRail);
    const band = exp(lp.y.add(0.55).div(1.55).pow(2).negate());
    const side = exp(lp.x.sub(12.0).div(17.0).pow(2).negate()).mul(0.75).add(0.25);
    hazeMat.colorNode = mix(OFF, RED, 0.22).mul(band.mul(side).mul(0.014).mul(U.abW).mul(float(1).sub(U.galW)));
    hazeMat.opacityNode = float(1);
  }
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(140, 18), hazeMat);
  haze.position.set(4, 0, -36);
  haze.frustumCulled = false;
  abGroup.add(haze);
  // polvo del riel: el mismo grano que el del hero, repartido en el campo del About (local a U.abRail), más rojo
  // cuanto más cerca de la recta. Es la capa media: entre el piso y la lente.
  const abDust = (() => {
    const n = 240;
    const pos = new Float32Array(n * 3), sd = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const z = 4.5 - Math.random() * 20;                         // de 2 u frente a la lente a 15 u detrás del riel
      const half = 0.45 * (7 - z) + 1.2;                          // el ancho visible a esa profundidad (+ margen)
      pos[i * 3] = (Math.random() - 0.5) * 2 * half;
      pos[i * 3 + 1] = -1.2 + Math.random() * (2.4 + 0.18 * (7 - z));
      pos[i * 3 + 2] = z;
      sd[i] = Math.random();
    }
    const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const base = instancedBufferAttribute(new THREE.InstancedBufferAttribute(pos, 3));
    const seed = instancedBufferAttribute(new THREE.InstancedBufferAttribute(sd, 1));
    const t = time.mul(0.16).add(seed.mul(40));
    m.positionNode = base.add(vec3(sin(t).mul(0.1), cos(t.mul(0.7)).mul(0.07), sin(t.mul(0.5)).mul(0.08)));
    m.scaleNode = seed.mul(0.02).add(0.009);
    const soft = float(1).sub(smoothstep(0.1, 0.5, length(uv().sub(0.5))));
    const lp = positionWorld.sub(U.abRail);
    const nearRail = exp(lp.yz.length().mul(-0.9));
    m.colorNode = mix(OFF.mul(0.55), RED.mul(2.0), nearRail.mul(0.85));
    m.opacityNode = soft.mul(nearRail.mul(0.9).add(0.2)).mul(seed.mul(0.55).add(0.25)).mul(U.abW).mul(float(1).sub(U.galW));
    const d = new THREE.Sprite(m);
    d.count = n; d.frustumCulled = false;
    abGroup.add(d);
    return d;
  })();
  abGroup.visible = false;

  /* ---------- cintas (traza, halo, ecos y — en fig 2 — el contorno) ---------- */
  function makeRibbon(n, width, intensity, alphaMul) {
    const pos = new Float32Array(n * 2 * 3), bri = new Float32Array(n * 2);
    const idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('bri', new THREE.BufferAttribute(bri, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true });
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

  /* ---------- Projects «negatoscopio» (escritorio ≥1024): corridor.js ----------
     La recta del About sigue a la izquierda como el riel del pasillo: una cinta propia que empieza justo donde
     termina la curva (x −40), mismo ancho y material, con el brillo como función de x (corridor.railBri) → sin
     costura. El cabezal del pasillo (lamp) camina por el riel adelante de la cámara. */
  const RAIL_END_FALLBACK = -60;
  const EXT_N = 220;
  const extCore = makeRibbon(EXT_N, 0.0085, 4.2, uniform(1));
  const extHalo = makeRibbon(EXT_N, 0.028, 0.35, uniform(0.22));
  const lampMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const lampOpacity = uniform(0);
  {
    const r = length(uv().sub(0.5));
    lampMat.colorNode = RED.mul(U.pulse.mul(0.9).add(6.5)).mul(float(1).sub(smoothstep(0.0, 0.5, r)).pow(3));
    lampMat.opacityNode = float(1).sub(smoothstep(0.0, 0.5, r)).mul(lampOpacity);
  }
  const lamp = new THREE.Sprite(lampMat);
  lamp.scale.setScalar(0.24); lamp.renderOrder = 3;
  scene.add(lamp);
  /* El cenital de la vitrina (vitrina.js lo mueve y lo enciende) vive en la escena desde el arranque y nunca sale de la
     lista de luces. Si entraba y salía con el pasillo, three recompilaba los materiales a la vista en cada cruce de
     Projects (con una luz en la escena los Basic arman su modelo de luz) y el precalentado del pasillo, que arma los
     nodos después de restaurar la visibilidad, compilaba las notebooks sin luz: cada llegada compilaba en pleno scroll
     (tirones de 150–580 ms). Con intensidad 0 no aporta nada: todo lo del hero es Basic o Sprite (luz directa 0). */
  const stageLight = new THREE.SpotLight(0xfff4ea, 0, 0, 0.3, 0.55, 2);
  scene.add(stageLight, stageLight.target);
  // corr, corrBuilding, corrIn: declarados arriba, junto a sync
  let stk = null, ecgX = null, ctcX = null;     // Stack (network.js), Experience (ecg.js) y Contact (convergence.js): se enganchan con el pasillo listo

  /* ---------- composición (fracciones del viewport, idénticas a la figura HTML) ---------- */
  const lay = {};
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpV3 = new THREE.Vector3();
  // motas de primer plano del About: [NDC x, NDC y, distancia a la lente] en la pose de aterrizaje (ver layout)
  const AB_FG = [[0.62, 0.5, 3.2], [0.92, -1.15, 2.4], [0.16, -0.8, 2.6]];
  const flat = new Float32Array(N * 3), rail = new Float32Array(N * 3), P = new Float32Array(N * 3);
  const visH = (z) => 2 * (CAM_Z - z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  function layout() {
    const G = S.geom(innerWidth, innerHeight);
    const m = G.m;
    camera.fov = G.fov; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    U.dpr.value = renderer.getPixelRatio();
    warmPost = true;
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
    // About: el eje de la cámara viva es el punto del riel frente a la lente; las capas se arman alrededor de él
    U.abRail.value.set(lay.endPos.x, y, -RAIL_Z);
    abGroup.position.copy(U.abRail.value);
    // motas cerca de la lente: puntos fijos del mundo, puestos en la pose de aterrizaje (sin cámara viva) donde no hay
    // texto ni cara (NDC x, y, distancia a la lente). Arriba a la derecha, sobre el pie de la foto y abajo al centro.
    {
      const fwd = tmpV.copy(lay.endLook).sub(lay.endPos).normalize();
      const right = tmpV2.crossVectors(fwd, THREE.Object3D.DEFAULT_UP).normalize();
      const up = tmpV3.crossVectors(right, fwd);
      const T = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      lay.fg = AB_FG.map(([nx, ny, d]) => lay.endPos.clone().addScaledVector(fwd, d)
        .addScaledVector(right, nx * d * T * camera.aspect).addScaledVector(up, ny * d * T));
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

    // Projects: el pasillo se apoya en la recta del About (su origen depende de esta pose y de yT)
    lay.fov = camera.fov;
    if (corr) corr.place({ yT: lay.yT, railZ: RAIL_Z, aboutPos: lay.endPos, aboutLook: lay.endLook });
    floorM.position.x = -25;
  }
  layout();
  on(window, 'resize', layout);

  /* ---------- post: bloom + viñeta ---------- */
  await yieldToMain();                           // armado de la escena / post / compilación: tareas separadas (TBT)
  if (ctl.disposed || S.dead) return;
  const pipeline = new THREE.RenderPipeline(renderer);
  ctl.pipeline = pipeline;
  const scenePass = pass(scene, camera);
  const col = scenePass.getTextureNode('output');
  const bl = bloom(col, 1.1, 0.55, 0.55);
  if (QL().bloomRes !== 0.5) bl.setResolutionScale(QL().bloomRes);   // alto: el 0,5 de siempre (default de BloomNode)
  ctl.nodes.push(bl, scenePass);   // render targets propios del bloom y del pass
  // en la galería la viñeta afloja: los planos viven en la mitad derecha y no deben hundirse en el borde
  const vig = smoothstep(1.05, 0.25, length(screenUV.sub(0.5).mul(vec2(1.25, 1.0))).mul(mix(float(1.35), float(1.05), U.galW)));
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
      // en el pasillo (G.w) la cinta se afina cerca de cámara: si no, el riel a 1 m se lee como una banda gruesa
      const wk = G.w > 0 ? 1 - G.w + G.w * Math.min(1, toCam.length() / 6) : 1;
      side.crossVectors(tan, toCam).normalize().multiplyScalar(R.width * wk);
      const v = i * 6;
      R.pos[v] = p[0] + side.x; R.pos[v + 1] = p[1] + side.y; R.pos[v + 2] = p[2] + side.z;
      R.pos[v + 3] = p[0] - side.x; R.pos[v + 4] = p[1] - side.y; R.pos[v + 5] = p[2] - side.z;
      const br = briOf(i); R.bri[i * 2] = br; R.bri[i * 2 + 1] = br;
    }
    R.geo.attributes.position.needsUpdate = true;
    R.geo.attributes.bri.needsUpdate = true;
  }
  const tmp3 = [0, 0, 0];
  /* galería: brillo de la recta en función de x. Detrás del cabezal (a su derecha) la estela fresca se apaga hasta el
     piso de fósforo; delante, el riel apenas se adivina y se pierde en la oscuridad. Lo usan la curva y la extensión,
     así la unión en x −40 no se ve. */
  /* Projects: peso del pasillo (0 en el About, 1 abierto). El brillo de la recta en función de x lo da el pasillo
     (corridor.railBri: estela tenue, el cabezal brilla, nada después del final). */
  const G = { w: 0 };
  const railBri = (x) => (corr ? corr.railBri(x) : 0);
  function buildRibbons(t, bend) {
    const gw = G.w, calm = 1 - gw;              // en la galería la recta se calma: sin latido que la cruce
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      const b = smooth(0, 1, bend * 1.7 - s * 0.7);
      const j = i * 3;
      P[j] = flat[j] + (rail[j] - flat[j]) * b;
      P[j + 1] = flat[j + 1] + (rail[j + 1] - flat[j + 1]) * b + S.val[i] * lay.amp * (1 - 0.35 * b) * calm;
      P[j + 2] = flat[j + 2] + (rail[j + 2] - flat[j + 2]) * b;
    }
    const mainP = (i) => { tmp3[0] = P[i * 3]; tmp3[1] = P[i * 3 + 1]; tmp3[2] = P[i * 3 + 2]; return tmp3; };
    const bri = gw > 0 ? (i) => S.bright(i, t) * calm + railBri(P[i * 3]) * gw : (i) => S.bright(i, t);
    stroke(core, mainP, bri);
    stroke(halo, mainP, bri);
    if (gw > 0 || !extCore.built) {
      extCore.built = true;
      const endX = corr ? corr.railEndX() : RAIL_END_FALLBACK;
      const extP = (i) => { tmp3[0] = -40 + (endX + 40) * (i / (EXT_N - 1)); tmp3[1] = lay.yT; tmp3[2] = -RAIL_Z; return tmp3; };
      const extB = (i) => railBri(-40 + (endX + 40) * (i / (EXT_N - 1))) * gw;
      stroke(extCore, extP, extB);
      stroke(extHalo, extP, extB);
    }
    echoes.forEach((R, k) => {
      if (R.alpha.value < 0.005 && R.built) return;
      R.built = true;
      const off = ECHO_OFF[k];
      stroke(R, (i) => { tmp3[0] = P[i * 3] + off.x; tmp3[1] = P[i * 3 + 1] + off.y - S.val[i] * lay.amp * 0.6; tmp3[2] = P[i * 3 + 2] + off.z; return tmp3; }, (i) => S.bright(i, t) * 0.6);
    });
    const hi = Math.min(N - 1, Math.floor(S.headS * N)) * 3;
    head.position.set(P[hi], P[hi + 1], P[hi + 2]);
    if (corr) corr.headWorld(lamp.position); else lamp.position.set(RAIL_END_FALLBACK, lay.yT, -RAIL_Z);
    U.light.value.set(P[hi], P[hi + 1], P[hi + 2]).lerp(lamp.position, gw);   // en el pasillo, la luz es el cabezal
  }

  /* ---------- cámara ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, seen: false };
  on(window, 'pointermove', (e) => { if (e.pointerType === 'mouse') { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; mouse.seen = true; } }, { passive: true });
  const railP = new THREE.Vector3(), railL = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3();
  const endP = new THREE.Vector3(), endL = new THREE.Vector3();
  function railPose(u, outPos, outLook) {
    lay.curve.getPointAt(Math.min(0.999, u), outPos);
    lay.curve.getPointAt(Math.min(1, u + 0.075), outLook);
    outPos.y += 0.55; outLook.y += 0.32;
  }
  const galP = new THREE.Vector3(), galL = new THREE.Vector3();
  const D2R = Math.PI / 180;
  const abPiv = new THREE.Vector3(), AX_X = new THREE.Vector3(1, 0, 0), AX_Y = new THREE.Vector3(0, 1, 0);
  /* La recta, nivelada y en su altura de aterrizaje con la cámara viva. La imagen de una recta es la intersección del
     plano (lente, recta) con la pantalla: queda horizontal si el «arriba» de la cámara vive en ese plano (up = su
     normal) y a la misma altura si el ángulo entre la mirada y el plano es el de la pose de aterrizaje (se corrige
     con un pitch sobre el eje derecho de la cámara, que está en el plano y no la vuelve a inclinar). k: 0..1. */
  const abN = new THREE.Vector3(), abF = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const RAIL_XMAX = -4.95;                       // borde derecho de la vista sobre la recta (layout lo pone en −5)
  const railNormal = (out, cam) => out.set(0, cam.z - -RAIL_Z, lay.yT - cam.y).normalize();   // X × (P0 − C)
  function abLevel(look, k) {
    railNormal(abN, camera.position);
    camera.up.copy(UP).lerp(abN, k).normalize();
    camera.lookAt(look);
    camera.up.copy(UP);
    const s = camera.getWorldDirection(abF).dot(abN);
    const s0 = abF.copy(lay.endLook).sub(lay.endPos).normalize().dot(railNormal(abN, lay.endPos));
    camera.rotateX(-(Math.asin(s) - Math.asin(s0)) * k);
  }
  let abRig = 0;
  function updateCamera(t, dt, p, g = 0) {
    U.abW.value = 0; abRig = 0;
    mouse.x = S.damp(mouse.x, mouse.tx, 3, dt); mouse.y = S.damp(mouse.y, mouse.ty, 3, dt);
    const hp = tmpA.set(0, 0, CAM_Z).lerp(lay.heroTarget, S.dolly(t));
    hp.x += mouse.x * 0.22 + Math.sin(t * 0.13) * 0.04 * S.ign(t);
    hp.y += -mouse.y * 0.06;
    const hl = tmpB.copy(hp).add(tmpC.set(mouse.x * 0.05, 0, -9));
    if (p <= 0.0005) { camera.position.copy(hp); }
    else {
      const u = smooth(0.10, 0.80, p) * lay.uMax;
      railPose(u, railP, railL);
      const w = smooth(0.0, 0.32, p), e = smooth(0.62, 1.0, p);
      // al llegar, un resto del mouse en x: el riel no se mueve (es una recta), el polvo y el piso sí (parallax)
      const mx = lay.anchored ? mouse.x * 0.15 * e : 0;
      endP.copy(lay.endPos); endP.x += mx; endL.copy(lay.endLook); endL.x += mx;
      // About aterrizado: cámara viva con la recta como eje. Orbita alrededor del punto del riel frente a la lente
      // (crane: giro en x sobre la recta misma, que no la mueve; orbit corto: giro en y, que la inclinaría unos px y
      // corrige abLevel, más abajo) y respira en dolly sobre el rayo a la recta (tampoco la mueve). Así la recta, y
      // el titular apoyado en ella, quedan quietos y todo lo demás se separa por parallax.
      // Deriva lenta siempre; el mouse suma ~2° en y y 1,3° en x, con el mismo damp que el pasillo.
      const ab = lay.anchored ? smooth(0.9, 1.0, p) : 0;
      if (ab > 0) {
        abPiv.set(endP.x, lay.yT, -RAIL_Z);
        const dl = Math.sin(t * 0.11 + 0.3) * 0.24 * ab;
        tmpC.copy(endP).sub(abPiv).normalize().multiplyScalar(dl);
        endP.add(tmpC); endL.add(tmpC);
        const crane = -(mouse.y * 1.3 + Math.sin(t * 0.19 + 0.4) * 0.45 + Math.sin(t * 0.071 + 2.1) * 0.25) * D2R * ab;
        const orbit = -(mouse.x * 2.0 + Math.sin(t * 0.13 + 1.1) * 0.6) * D2R * ab;
        endP.sub(abPiv).applyAxisAngle(AX_X, crane).applyAxisAngle(AX_Y, orbit).add(abPiv);
        endL.sub(abPiv).applyAxisAngle(AX_X, crane).applyAxisAngle(AX_Y, orbit).add(abPiv);
      }
      // las capas se van con el texto del About, al empezar el giro hacia Projects
      abRig = ab;
      U.abW.value = ab * (1 - smooth(GAL_ABOUT_OUT, GAL_ABOUT_OUT + 0.25, g));
      railP.lerp(endP, e); railL.lerp(endL, e);
      camera.position.copy(hp).lerp(railP, w);
      hl.lerp(railL, w);
    }
    // Projects: la cámara gira 90° y entra al pasillo (corridor.js). Desde GAL_ABOUT_OUT se mezcla con la del About
    // (la primera llave del pasillo ES la pose del About, así que la mezcla sólo absorbe el parallax del mouse).
    let fov = lay.fov, wo = 0;
    if (G.w > 0 && corr) {
      corr.camPose(g, t, dt, mouse, galP, galL);
      wo = smooth(GAL_ABOUT_OUT, GAL_ABOUT_OUT + 0.15, g);
      camera.position.lerp(galP, wo);
      hl.lerp(galL, wo);
      fov = lay.fov + ((innerWidth / innerHeight > 1.9 ? 30 : 32) - lay.fov) * G.w;   // aspecto del viewport (la lente corrida agranda camera.aspect)
      if (corr.fovAt) fov = lay.fov + (corr.fovAt(g, innerWidth / innerHeight > 1.9 ? 30 : 32) - lay.fov) * G.w;   // la vitrina: óptica más larga
    } else if (corr && corr.idle) corr.idle();
    // la vitrina (corridor.update) corre la lente para dejar la laptop a un lado del cuadro; fuera de Projects, sin corrimiento
    if (!(G.w > 0 && corr) && camera.view && camera.view.enabled) { camera.clearViewOffset(); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
    if (Math.abs(camera.fov - fov) > 1e-4) { camera.fov = fov; camera.updateProjectionMatrix(); }
    const abK = abRig * (1 - wo);
    if (abK > 0) {
      abLevel(hl, abK);
      // el borde derecho de la vista no pasa de x −5 sobre la recta (más allá empieza la curva, que bajaría la línea
      // en el borde): si el dolly o la órbita lo corren, la cámara se desliza a la izquierda, sobre la recta (no la mueve)
      camera.updateMatrixWorld();
      const c = camera.position;
      const ny = abF.set(c.x, lay.yT, -RAIL_Z).project(camera).y;
      const d = abF.set(1, ny, 0.5).unproject(camera).sub(c);
      const xe = c.x + (d.x * (-RAIL_Z - c.z)) / d.z;
      if (xe > RAIL_XMAX) c.x -= xe - RAIL_XMAX;
    } else camera.lookAt(hl);
    // cámara viva en el pasillo: el mouse la gira ~2° (yaw) y 1,3° (pitch), con el damp de arriba
    if (G.w > 0 && corr) {
      camera.rotateY(-mouse.x * 2.0 * D2R * G.w);
      camera.rotateX(-mouse.y * 1.3 * D2R * G.w);
      camera.updateMatrixWorld();
      corr.update(g, t, dt, G.w);
    }
    return smooth(0, 0.3, p);
  }
  /* estado del pasillo para un u: peso, visibilidad (lo usan el loop y lineAt) */
  function updateGallery(g) {
    const on = wideMQ.matches && !!corr;
    // corrIn: si el pasillo termina de armarse con la galería ya abierta (recarga a mitad de Projects), entra en
    // ~0,5 s en lugar de cortar de la pose del About al pasillo
    G.w = on ? smooth(GAL_ABOUT_OUT, GAL_ABOUT_OUT + 0.45, g) * corrIn : 0;
    U.galW.value = G.w;
    lampOpacity.value = G.w * (corr ? corr.fbf.lampK() * corr.lampVis() : 1);
    if (corr) corr.group.visible = G.w > 0.0005;
    S.neg.live = on && G.w > 0.0005;
    if (!S.neg.live) S.neg.hover = -1;
    // Frame by Frame vive en el mismo pasillo: con la galería cerrada, la sala no corre ni reproduce
    S.fbf.live = S.neg.live && G.w > 0.5;
    S.stk.live = S.fbf.live && !!stk;            // Stack: la red armada y enganchada al pasillo
    if (!S.fbf.live) { S.fbf.hover = -1; S.fbf.active = -1; if (corr) corr.fbf.pauseAll(); }
    S.exp.live = S.fbf.live && !!ecgX;           // Experience: la traza armada y enganchada al pasillo
    S.ctc.live = S.fbf.live && !!ctcX;           // Contact: la convergencia armada y enganchada al pasillo
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
  // galería (Projects): u = viewports de scroll desde el aterrizaje del About (trig.end); mismo damp que la cámara
  const gal = { p: 0, target: 0 };
  const galTarget = () => (wideMQ.matches ? Math.max(0, (scrollY - trig.end) / innerHeight) : 0);
  gal.target = gal.p = galTarget();

  /* ---------- loop ---------- */
  const fpsBuf = []; let lastNow = performance.now(), loopOn = false;
  /* Niveles de calidad en vivo (quality.js), con ida y vuelta. Se mide en ventanas de frames válidos (~2 s; la primera,
     de 60, es la prueba corta de frame time): un frame de más de 250 ms (pestaña oculta, ventana tapada, GC largo) no es
     una medición y reinicia la ventana. < 48 fps → un nivel abajo. Ventanas seguidas ≥ 57 fps → un nivel arriba, nunca
     por encima del de arranque; si al subir vuelve a caer, la próxima subida pide el doble de ventanas (2 → 4 → 8 → 16):
     no oscila. En bajo, < 24 fps en 4 ventanas seguidas con la ventana al frente → la versión estática. Con ?q= no se
     mueve. El cambio se aplica con el scroll quieto (cambiar el DPR rehace los render targets y recompila el DOF y el
     bloom: mejor un cuadro largo quieto que un tirón en pleno scroll). */
  const aq = { n: 0, sum: 0, first: true, pending: null, st: initAdaptive(Qs.level, Qs.ceiling) };
  const applyDust = () => {
    const k = QL().dust;
    scene.traverse((o) => { if (o.userData && o.userData.dust) o.count = Math.max(1, Math.round(o.userData.dust * k)); });
  };
  function applyLevel(lv, f) {
    Qs.level = lv;
    const d = dprFor(lv);
    if (renderer.getPixelRatio() !== d) { renderer.setPixelRatio(d); U.dpr.value = d; }   // setPixelRatio rehace el canvas
    bl.setResolutionScale(QL().bloomRes);
    if (corr && corr.bloom) corr.bloom.setResolutionScale(QL().bloomRes);
    applyDust();
    warmPost = true;
    if (params.has('perf')) console.info('[senal] quality: →', lv, f != null ? 'at ' + f.toFixed(1) + ' fps' : '');
  }
  function adaptive(dtMs, t) {
    // C-01: con un cambio pendiente no se mide (la escena todavía dibuja el nivel anterior); al aplicarlo, la ventana
    // arranca de cero: cada ventana mide el nivel efectivo y se baja de a un escalón
    if (aq.pending) {
      aq.n = 0; aq.sum = 0;
      if (performance.now() - lastScrollT > 600) { const p = aq.pending; aq.pending = null; applyLevel(p.lv, p.f); }
      return;
    }
    if (dtMs > 250 || document.hidden) { aq.n = 0; aq.sum = 0; return; }
    if (t <= 6 || Qs.forced) return;                        // el arranque (compilación, latido) no cuenta
    aq.n++; aq.sum += dtMs;
    if (aq.n < (aq.first ? 60 : 120)) return;
    aq.first = false;
    const f = (aq.n * 1000) / aq.sum;
    aq.n = 0; aq.sum = 0;
    const { state, action } = stepAdaptive(aq.st, f, { focused: document.hasFocus() });
    aq.st = state;
    Qs.ceiling = state.ceiling;
    if (!action) return;
    if (action.type === 'level') { aq.pending = { lv: action.level, f }; return; }
    // C-03: a la versión estática en plena sesión. Antes de cortar el loop: pausar los videos del Tambor (el de frente
    // puede tener sonido) y apagar el zumbido de la vitrina; después, liberar la escena, los videos y la GPU (dispose:
    // loop, listeners, ctl.offs con los <video> soltados, geometrías, materiales, texturas, render targets, renderer)
    if (corr) { try { corr.fbf.pauseAll(); corr.idle(); } catch (e) { /* noop */ } }
    S.goStatic('quality: bajo a ' + f.toFixed(1) + ' fps');
    if (ctl.dispose) ctl.dispose();
  }
  S.q = Qs;
  applyDust();                                   // el polvo del hero; el del pasillo y las tomas, al engancharse
  const hud = params.has('hud') ? root.querySelector('.senal-hud') : null;
  if (hud) hud.hidden = false;
  ctl.info = { backend, gpu, t: { rendererReady: Math.round(performance.now()) }, fps: () => (fpsBuf.length ? (fpsBuf.length / (fpsBuf.reduce((a, b) => a + b, 0) / 1000)).toFixed(1) : null), frames: 0, running: () => loopOn, dpr: () => renderer.getPixelRatio(), q: () => ({ ...Qs, msaa: renderer.samples || 0 }) };
  window.__senal = ctl.info;
  // QA (?hud): dónde cae la traza en pantalla para un progreso dado, sin renderizar (sirve con la pestaña oculta).
  // Devuelve el rango de y (px CSS) de la cinta principal entre x0 y x1. El frame siguiente rehace cámara y cintas.
  // cam(): el progreso de la cámara en este momento.
  const qa = hud || params.has('qa');
  if (qa) ctl.info.cam = () => cam.p;
  if (qa) ctl.info.gal = () => gal.p;
  if (hud) ctl.info.lineAt = (p, x0 = 0, x1 = innerWidth, g = 0) => {
    const t = S.now();
    updateGallery(g);
    buildRibbons(t, updateCamera(t, 0, p, g));
    camera.updateMatrixWorld();
    const v = new THREE.Vector3();
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < N; i++) {
      v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).project(camera);
      if (v.z < -1 || v.z > 1) continue;
      const x = ((v.x + 1) / 2) * innerWidth, y = ((1 - v.y) / 2) * innerHeight;
      if (x < x0 || x > x1) continue;
      lo = Math.min(lo, y); hi = Math.max(hi, y);
    }
    return { lo, hi };
  };
  console.info('[senal] backend:', backend, '| gpu:', gpu);
  // medidor de rendimiento (?perf, perf-meter.js): chunk aparte que se pide sólo con el flag; sin él no se importa nada
  if (params.has('perf')) {
    try { const { attachPerfMeter } = await import('./perf-meter.js'); if (!ctl.disposed && !S.dead) attachPerfMeter({ renderer, ctl, backend, gpu }); }
    catch (e) { console.warn('[senal] perf:', e && e.message); }
  }

  /* ---------- Projects: armado diferido del pasillo ----------
     Sólo escritorio ≥1024. Se arma por proximidad: cuando el usuario empieza a bajar (el primer scroll fuera del
     tope ya va hacia el About y Projects, a más de 3 viewports) o si recargó a mitad de página. Antes se armaba
     sólo con el hilo libre a los ~3 s aunque nadie bajara: las 13 capturas (~2 MB), los pósters de Frame by Frame y
     el armado de Stack / Experience / Contact entraban en la carga (delivery-auditor D-01 y D-03). El armado va con
     pausas entre etapas. Hasta que está listo, la galería no abre (G.w = 0) y el HTML de Projects usa su posición de
     respaldo, como siempre. */
  const corrNear = () => cam.target > 0 || gal.target > 0;
  let corrPost = 0;                              // cuadros que quedan del post del pasillo con la galería cerrada (precalentado)

  /* Respaldo del armado (U-fix-2): por proximidad, el armado caía en el primer scroll y lo trababa (frames de
     130-180 ms). Ahora arranca también solo, con el hilo libre, CORR_IDLE_MS después del primer frame: lo que
     llegue primero. 2,5 s: fuera de la traza de Lighthouse (termina a ~2,9 s de la navegación) y con el armado
     entero (~1,8 s headless RTX) listo antes de un primer scroll a los ~8 s. Mientras el usuario scrollea, cada
     etapa espera a que se pinte un frame (yieldBuild) para no competir con el scroll. */
  const CORR_IDLE_MS = 2500;
  let lastScrollT = -1e9;
  const markScroll = () => { lastScrollT = performance.now(); };
  on(window, 'scroll', markScroll, { passive: true });
  on(window, 'wheel', markScroll, { passive: true });
  const yieldBuild = () => (performance.now() - lastScrollT < 150
    ? new Promise((r) => { requestAnimationFrame(() => setTimeout(r, 0)); setTimeout(r, 100); })
    : yieldToMain());
  let corrIdleId = 0;
  ctl.offs.push(() => clearTimeout(corrIdleId));
  function armCorridorIdle() {
    if (!wideMQ.matches || isMobile()) return;
    corrIdleId = setTimeout(() => {
      corrIdleId = 0;
      if (typeof requestIdleCallback === 'function') requestIdleCallback(() => startCorridor(), { timeout: 1000 });
      else startCorridor();
    }, CORR_IDLE_MS);
  }
  function startCorridor() {
    if (corr || corrBuilding || !wideMQ.matches || isMobile() || S.dead || ctl.disposed) return;
    corrBuilding = true;
    const t0 = performance.now();
    loadShots()
      .then(({ buildCorridor }) => (ctl.disposed || S.dead ? null : buildCorridor({ renderer, scene, camera, scenePass, S, ctl, RED, OFF, galW: U.galW, yieldToMain: yieldBuild, stageLight, quality: QL })))
      .then(async (c) => {
        if (!c || ctl.disposed || S.dead) return;
        c.place({ yT: lay.yT, railZ: RAIL_Z, aboutPos: lay.endPos, aboutLook: lay.endLook });
        await c.warm();
        if (ctl.disposed || S.dead) return;
        corr = c; corrPost = 2; applyDust();
        ctl.info.neg = c.info;
        ctl.info.t.corridor = Math.round(performance.now() - t0);
        console.info('[senal] corridor ready in', ctl.info.t.corridor, 'ms');
        startNetwork(c);
        // QA (?qa&u=4.15): salta a esa posición (viewports desde el aterrizaje del About) con la cámara ya asentada,
        // para capturas repetibles; después el loop sigue normal (los textos entran en tiempo real)
        if (qa && params.has('u') && ctl.info.advance) {
          const uq = parseFloat(params.get('u'));
          if (Number.isFinite(uq)) setTimeout(() => { if (ctl.disposed || S.dead) return; ctl.info.advance(3, uq); ctl.info.resume(); console.info('[senal] qa jump u', uq, 'scrollY', Math.round(scrollY)); }, 60);
        }
      })
      .catch((e) => { console.warn('[senal] corridor:', e && e.message); })
      .finally(() => { corrBuilding = false; });
  }

  /* ---------- tomas que siguen a Frame by Frame, con el pasillo ya listo ----------
     Stack (network.js, la red por capas) y después Experience (ecg.js, el electrocardiograma vertical). Cada una se
     arma en el mismo hilo de idle (con pausas), compila sus materiales sin dibujar (tope de 4 s, como el pasillo) y
     recién ahí se engancha al pasillo (setExt). En serie: Experience arranca de la recta en que termina la red (su
     ancla). Hasta que cada una se engancha, su sección usa el layout de respaldo. */
  async function attachExt(c, name, build) {
    const t0 = performance.now();
    try {
      const n = await build();
      if (!n || ctl.disposed || S.dead) return;
      n.warm(true);
      const prevRT = renderer.getRenderTarget();
      let pending = null;
      try {
        if (scenePass.renderTarget) renderer.setRenderTarget(scenePass.renderTarget);
        pending = c.compileAt ? c.compileAt(n.group, camera, scene) : renderer.compileAsync(n.group, camera, scene);
      } catch (e) { /* compila en el primer frame */ }
      finally { renderer.setRenderTarget(prevRT); n.warm(false); }
      try { await Promise.race([pending, new Promise((r) => setTimeout(r, 4000))]); } catch (e) { /* idem */ }
      if (ctl.disposed || S.dead) return;
      c.setExt(n); applyDust();
      ctl.offs.push(() => n.dispose());
      ctl.info.t[name] = Math.round(performance.now() - t0);
      console.info('[senal] ' + name + ' ready in', ctl.info.t[name], 'ms');
      return n;
    } catch (e) { console.warn('[senal] ' + name + ':', e && e.message); return null; }
  }
  async function startNetwork(c) {
    const { buildNetwork, buildEcg, buildConvergence } = await loadShots();
    const n = await attachExt(c, 'network', () => buildNetwork({ corr: c, camera, S, ctl, RED, OFF, galW: U.galW, yieldToMain: yieldBuild }));
    if (n) { stk = n; ctl.info.stk = n.info; }
    if (ctl.disposed || S.dead) return;
    // Experience sigue la recta de la red (sin red: un ancla fija debajo de la última capa)
    const line = n && n.line ? n.line : null;
    const x = await attachExt(c, 'ecg', () => buildEcg({ corr: c, camera, S, ctl, RED, OFF, galW: U.galW, yieldToMain: yieldBuild, line }));
    if (x) { ecgX = x; ctl.info.exp = x.info; }
    if (!x || ctl.disposed || S.dead) return;
    // Contact: todas las líneas convergen en el punto en que termina la traza (su ancla)
    const cv = await attachExt(c, 'contact', () => buildConvergence({ corr: c, camera, S, ctl, RED, OFF, galW: U.galW, yieldToMain: yieldBuild, ecg: x }));
    if (cv) { ctcX = cv; ctl.info.ctc = cv.info; }
  }

  // QA con la pestaña oculta (rAF frenado): avanza la escena N segundos a 60 fps con un reloj simulado.
  let simDt = 0, skipRender = false, tOff = 0;
  if (qa) {
    ctl.info.advance = (sec = 2, u) => {
      renderer.setAnimationLoop(null); loopOn = false;
      if (u != null) window.scrollTo({ top: trig.end + u * innerHeight, behavior: 'instant' });
      // ScrollTrigger actualiza en rAF (frenado con la pestaña oculta): el objetivo se toma del scroll real
      cam.target = Math.min(1, Math.max(0, scrollY / trig.end));
      if (wideMQ.matches) gal.target = galTarget();
      const n = Math.max(1, Math.round(sec * 60));
      simDt = 1 / 60;
      for (let i = 0; i < n; i++) { skipRender = i < n - 1; tOff += 1 / 60; frame(); }
      simDt = 0; skipRender = false;
      gsap.ticker.lagSmoothing(0); gsap.ticker.tick();
      return { u: +gal.p.toFixed(3), cam: +cam.p.toFixed(3), w: +G.w.toFixed(3), ...(corr ? corr.info() : { corridor: 'pending' }) };
    };
    ctl.info.resume = () => { lastNow = performance.now(); syncLoop(); };
    // costo real por frame (CPU + GPU hasta que la cola termina), sin vsync: sirve aun con la pestaña oculta
    ctl.info.bench = async (n = 90, u) => {
      renderer.setAnimationLoop(null); loopOn = false;
      if (u != null) ctl.info.advance(3, u);
      const dev = renderer.backend.device, gl = renderer.backend.gl; const ms = [];
      simDt = 1 / 60;
      for (let i = 0; i < n; i++) {
        const t0 = performance.now(); tOff += 1 / 60; frame();
        if (dev) await dev.queue.onSubmittedWorkDone(); else if (gl) gl.finish();
        ms.push(performance.now() - t0);
      }
      simDt = 0;
      ms.sort((a, b) => a - b);
      return { u: +gal.p.toFixed(2), avg: +(ms.reduce((a, b) => a + b, 0) / n).toFixed(2), p50: +ms[n >> 1].toFixed(2), p95: +ms[Math.floor(n * 0.95)].toFixed(2), max: +ms[n - 1].toFixed(2), dpr: renderer.getPixelRatio(), w: innerWidth, h: innerHeight, backend, gpu };
    };
    ctl.info.corrStage = () => (corr ? 'ready' : ctl.corrStage || (corrBuilding ? 'building' : 'waiting (near: ' + corrNear() + ')'));
    ctl.info.dbg = () => ({ core, halo, extCore, extHalo, echoes, lamp, head, floorM, fig, scene, corr, camera, abGroup, haze, abDust, lay, U });
    ctl.info.mouse = (x, y) => { mouse.tx = x; mouse.ty = y; mouse.seen = true; };
  }

  /* About: motas de primer plano ([data-ab-fg], About.tsx). Son HTML porque van por encima de la foto (una mota 3D
     quedaría detrás del HTML y leería al revés). Puntos fijos del mundo proyectados con la cámara de este mismo
     frame: siguen la órbita, el dolly y el giro de 90° hacia Projects (barren la pantalla y se van). Sólo escriben
     el DOM con el About aterrizado. */
  let fgBox = null, fgEls = null, fgOn = false;
  const fgP = new THREE.Vector3();
  function placeFg() {
    const w = U.abW.value;
    if (w <= 0.001) { if (fgOn) { fgOn = false; if (fgBox) fgBox.style.opacity = '0'; } return; }
    if (!fgBox || !fgBox.isConnected) {
      fgBox = document.querySelector('[data-ab-fg]');
      fgEls = fgBox ? Array.from(fgBox.children) : null;
    }
    if (!fgBox || !lay.fg) return;
    fgOn = true;
    camera.updateMatrixWorld();
    const r = fgBox.getBoundingClientRect();
    for (let k = 0; k < fgEls.length && k < lay.fg.length; k++) {
      const el = fgEls[k];
      fgP.copy(lay.fg[k]).applyMatrix4(camera.matrixWorldInverse);
      const depth = -fgP.z;
      if (depth < 0.3) { el.style.visibility = 'hidden'; continue; }
      fgP.applyMatrix4(camera.projectionMatrix);
      const x = ((fgP.x + 1) / 2) * innerWidth - r.left, y = ((1 - fgP.y) / 2) * innerHeight - r.top;
      el.style.visibility = '';
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(AB_FG[k][2] / depth).toFixed(3)})`;
    }
    fgBox.style.opacity = w.toFixed(3);
  }
  ctl.offs.push(() => { if (fgBox) fgBox.style.opacity = '0'; });

  function frame() {
    if (S.dead || ctl.disposed) { renderer.setAnimationLoop(null); return; }
    const now = performance.now();
    const dtMs = simDt ? simDt * 1000 : now - lastNow; lastNow = now;
    const dt = Math.min(dtMs / 1000, 1 / 20);
    if (dtMs <= 250 && !simDt) { fpsBuf.push(dtMs); if (fpsBuf.length > 120) fpsBuf.shift(); }   // HUD / __senal.fps(): sin pausas
    const st = S.state, t = S.now() + tOff;      // hero-controller ya escribió la traza de este frame
    cam.p = S.damp(cam.p, cam.target, CAM_LAMBDA, dt);
    const p = cam.p;
    st.cam = p;                                  // el About dispara su texto con la cámara (About.tsx)
    gal.target = galTarget();
    // debajo de 1024 no hay galería de la que volver: a 0 sin damp (un resize con el loop en pausa la dejaba vieja)
    gal.p = wideMQ.matches ? S.damp(gal.p, gal.target, CAM_LAMBDA, dt) : 0;
    st.gal = gal.p;                              // Projects (ProjectsGallery.tsx) y el About leen la galería con la cámara
    ctl.info.frames++;
    if (!corr && !corrBuilding && wideMQ.matches && (corrNear() || p > 0.25)) startCorridor();

    U.ignite.value = S.ign(t);
    U.pulse.value = S.pulse(t);
    if (corr) corrIn = corrIn > 0.999 ? 1 : S.damp(corrIn, 1, 6, dt);
    updateGallery(gal.p);
    headOpacity.value = S.headAlpha(t) * (1 - G.w);
    const bend = updateCamera(t, dt, p, gal.p);
    abGroup.visible = U.abW.value * (1 - G.w) > 0.001;
    U.dissolve.value = smooth(0.04, 0.2, p);
    echoes.forEach((e) => { e.alpha.value = smooth(0.1, 0.35, p) * 0.5 * (1 - smooth(0.7, 0.95, p)); });
    // No dibujar lo invisible: lo que en este cuadro tiene opacidad (o brillo) 0 exacto o casi (≤ 1e-4, muy por debajo de un
    // nivel de 8 bits) no se dibuja. Mismo cuadro, menos draw calls y menos relleno: el piso de puntos (150 × 110, media
    // pantalla) y el polvo del hero se seguían dibujando × (1 − galW) = 0 desde Projects hasta Contacto.
    const heroK = 1 - G.w;
    floorM.visible = heroK > 1e-4;
    heroDust.visible = heroK > 1e-4;
    fig.visible = U.dissolve.value < 1 - 1e-4;         // la figura × (1 − dissolve)
    head.visible = headOpacity.value > 1e-4;
    lamp.visible = lampOpacity.value > 1e-4;
    echoes.forEach((e) => { e.mesh.visible = e.alpha.value > 1e-4; });
    extCore.mesh.visible = extHalo.mesh.visible = G.w > 1e-4;   // la extensión del riel: brillo × galW
    buildRibbons(t, bend);
    const bs = 0.95 + U.pulse.value * 0.7 + Math.min(st.vel, 1.2) * 0.35;
    bl.strength.value = bs;

    // con el pasillo abierto, su post (DOF + bloom del rojo + grano); con G.w → 0 empata con el del hero.
    // corrPost: DOS cuadros con el post del pasillo apenas está listo (o tras un cambio de tamaño). En el primer render
    // three arma los nodos y el DOF corre anidado a otra profundidad que en los siguientes: sus pasadas se recompilaban en
    // el segundo render, que era la entrada a Projects (las 4 compilaciones del DOF). Con galW 0 empata con el del hero.
    let pl = pipeline, warmHero = false;
    if (warmPost && corr && !skipRender && performance.now() - lastScrollT > 600) {
      warmPost = false;
      if (G.w > 0) warmHero = true; else corrPost = 2;   // con galW 0 el post del pasillo empata con el del hero
    }
    if (corr && (G.w > 0 || corrPost)) {
      const cb = corr.bloom, w = G.w;
      cb.strength.value = bs + (1.2 - bs) * w; cb.radius.value = 0.55 + 0.05 * w; cb.threshold.value = 0.55 - 0.43 * w;
      // vitrina: halo corto (≤ ~6 px) para que el rojo del canto y la bisagra sea un hilo y no tiña el teclado (D-04)
      const vw = corr.vitW ? corr.vitW() : 0;
      // R2-02: umbral alto en la vitrina: la línea del canto (≤ el rojo de marca, 0,81 lineal) no entra al bloom; sólo
      // la cabeza de la señal, que tiene su propio resplandor en el shader
      if (vw > 0) { cb.radius.value += (0.12 - cb.radius.value) * vw; cb.strength.value += (0.75 - cb.strength.value) * vw; cb.threshold.value += (0.9 - cb.threshold.value) * vw; }
      pl = corr.pipeline; if (corrPost > 0) corrPost--;
    }
    if (!skipRender) { if (warmHero) pipeline.render(); pl.render(); }   // el último render gana el canvas
    placeFg();

    // rótulos en el espacio (mismo frame que el render) y placa bajo el puntero
    const docEl = document.documentElement;
    if (S.neg.live) {
      corr.placeTags();
      const h = mouse.seen ? corr.pick(mouse.tx, mouse.ty, corr.activeTag(gal.p)) : -1;
      if (h !== S.neg.hover) { S.neg.hover = h; docEl.classList.toggle('pj-hot', h >= 0); }
      // Frame by Frame: la pantalla en foco bajo el puntero se abre con clic (VideosStage.tsx)
      const hf = mouse.seen && S.fbf.live ? corr.pickFbf(mouse.tx, mouse.ty) : -1;
      if (hf !== S.fbf.hover) { S.fbf.hover = hf; docEl.classList.toggle('fv-hot', hf >= 0); }
    } else {
      if (docEl.classList.contains('pj-hot')) docEl.classList.remove('pj-hot');
      if (docEl.classList.contains('fv-hot')) docEl.classList.remove('fv-hot');
    }

    if (first) { first = false; clearWatchdog(); window.__senal.t.firstFrame = Math.round(performance.now()); S.onLive(); armCorridorIdle(); }
    if (hud && (Math.round(t * 10) % 5 === 0)) hud.textContent = `${backend} · ${gpu}  ${window.__senal.fps()} fps  dpr ${renderer.getPixelRatio().toFixed(2)}  p ${p.toFixed(3)}  u ${gal.p.toFixed(2)}${corr ? '  ' + corr.info().mode : ''}`;
    if (!simDt) adaptive(dtMs, t);
  }
  // warm-up: compilar todo antes de mostrar (sin tirones en el latido ni en el primer scroll)
  await yieldToMain();
  if (ctl.disposed || S.dead) return;
  updateCamera(S.now(), 0, 0); buildRibbons(S.now(), 0);
  echoes.forEach((e) => { e.alpha.value = 0; });
  abGroup.visible = true;                        // compilar las capas del About ahora (con abW = 0 no se ven)
  // Los materiales de la escena se compilan antes con compileAsync (three arma los nodos de a un objeto por tarea),
  // contra el render target del pase: el mismo contexto que usa el render (formato y muestras que PassNode.setup le pone
  // en el primer render; como en attachExt). El warm-up de abajo los encuentra hechos y sólo arma el post: antes era una
  // sola tarea de 120–350 ms justo cuando el hero revela el texto (delivery-auditor D-01 / D-02). Lo que no se llegue a
  // compilar acá (tope de 4 s, como el pasillo) se compila en el warm-up, como antes.
  try {
    const rt = scenePass.renderTarget;
    rt.samples = renderer.samples;
    rt.texture.type = renderer.getOutputBufferType();
    const prevRT = renderer.getRenderTarget(), prevMRT = renderer.getMRT();
    let pending = null;
    renderer.setRenderTarget(rt); renderer.setMRT(null);
    try { pending = renderer.compileAsync(scene, camera); } finally { renderer.setRenderTarget(prevRT); renderer.setMRT(prevMRT); }
    await Promise.race([pending, new Promise((r) => setTimeout(r, 4000))]);
  } catch (e) { /* se compila en el warm-up */ }
  if (ctl.disposed || S.dead) return;
  updateCamera(S.now(), 0, 0); buildRibbons(S.now(), 0);
  pipeline.render();
  abGroup.visible = false;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (ctl.disposed || S.dead) return;
  syncLoop = () => {
    if (ctl.disposed || S.dead) return;
    if (shouldRun()) { if (!loopOn) { loopOn = true; lastNow = performance.now(); renderer.setAnimationLoop(frame); } }
    else if (loopOn) { loopOn = false; renderer.setAnimationLoop(null); }
  };
  syncLoop();
}
