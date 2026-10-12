/* Projects «Vitrina en el vacío» dentro de la escena persistente «Señal» (port de la maqueta A, 2026-10-12).
   Juan (2026-10-12): «Vitrina me gusta, pero despedazar la pantalla hace que no se entienda nada [...] capaz con una
   laptop y una screen del home de cada pagina alcanza». Sin despiece: cada proyecto es UNA laptop íntegra con el home
   real del producto en la pantalla, nítido y casi de frente. La profundidad sale de las capas que rodean al objeto:
   el nombre gigante detrás, el vidrio de la vitrina, la señal roja, el haz cenital, el polvo y el texto delante.

   Objeto elegido: una laptop de aluminio grafito que se abre (la tapa es el gesto del relevo: se entorna, la señal sale
   del canto, la siguiente llega girando desde la profundidad y abre la suya). Descartadas: laptop + display flotante
   (dos pantallas por proyecto, se pierde «un objeto») y pantalla que sale del marco (vuelve a romper la interfaz).

   Nitidez (el «se ve borroso» de Juan): la pantalla es un MeshBasic con la captura remuestreada UNA vez a su tamaño en
   la estadía (≈1:1 en px del dispositivo, DPR ≤ 2), sRGB, sin tone mapping, mipmaps + anisotropía 16, pintada en el
   pase MSAA. El post del pasillo (bloom, viñeta, DOF, grano) no la toca: corridor.js la excluye con `mask` (el cuadro
   de la pantalla proyectado en cada frame). En la estadía la cámara orbita ±12° del eje de la pantalla.

   Coordenadas: todo se arma en las de la vitrina (VF, como la maqueta: x a la derecha del About, y arriba, −z hacia la
   profundidad; TraumaVision en el origen, con su base sobre la recta del About). `group` es hijo del grupo del pasillo
   (corridor.js) con giro −90° en y: la recta del About es el eje x de la vitrina. */
import * as THREE from 'three/webgpu';
import {
  uniform, texture, uv, vec2, vec3, float, smoothstep, exp, abs, mix, length, sin, cos, fract, dot, min, max, step,
  positionLocal, positionWorld, cameraPosition, distance, normalize, cross, attribute, instancedBufferAttribute, screenUV, time
} from 'three/tsl';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GAL_PROJECTS, GAL_DWELLS, GAL_END, GAL_ABOUT_OUT, VIT_TRACE, VIT_OPEN, VIT_POWER } from './gallery';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const range = (x, a, b) => clamp01((x - a) / (b - a));
const sm = (x) => x * x * (3 - 2 * x);
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const sineIO = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const quartOut = (x) => 1 - Math.pow(1 - x, 4);

const N = GAL_PROJECTS.length;
const D = GAL_DWELLS;
const LAST_OUT = D[N - 1][1];

/* ---------- la laptop (metros de la escena) ---------- */
const SW = 3.2, SH = 1.6;                        // pantalla 2:1 (los homes de los cuatro productos son 2:1)
const BZ = 0.055, CHIN = 0.12;                   // bisel mínimo; mentón un poco más alto
const LW = SW + 2 * BZ, LIDH = SH + BZ + CHIN, LID_T = 0.028;
const BASE_H = 0.06, LD = 2.05, FRONT = -0.3;    // la base, 30 cm detrás de la recta
const HINGE_Y = BASE_H + 0.003, HINGE_Z = FRONT - LD + 0.07;
const OPEN = -0.11;                              // tapa abierta: 6° hacia atrás del plano vertical
/** centro visual del objeto (laptop abierta), en su espacio local */
const CENTER = V(0, 0.82, FRONT - LD * 0.62);
/** contorno de la vitrina (el que dibuja la señal), en el plano de la recta */
const CW = LW / 2 + 0.36, CH = LIDH + HINGE_Y + 0.32;

/** Arma la vitrina. Devuelve el controlador o null si se desmontó a mitad. */
export async function buildVitrina({ renderer, camera, S, ctl, RED, OFF, appear, yieldToMain, assetBase = '/projects/', railStop, railY = 0.03 }) {
  const alive = () => !ctl.disposed && !S.dead;
  const group = new THREE.Group();
  group.name = 'vitrina';
  const aniso = Math.min(16, renderer.getMaxAnisotropy ? renderer.getMaxAnisotropy() : 8);
  const REDL = vec3(0.807, 0.02, 0.023);         // #E8272A en lineal (el mismo RED de scene.js)

  /* ---------- imágenes: el home real de cada producto, remuestreado a su tamaño en la estadía ---------- */
  const loadImg = (f) => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = assetBase + f; });
  const imgs = await Promise.all(GAL_PROJECTS.map((p) => loadImg(p.screen)));
  if (!alive()) return null;
  // ancho de la pantalla en px del dispositivo en la estadía (cámara a ~8 m, fov del pasillo): la captura se remuestrea
  // a ese ancho una sola vez (calidad alta del canvas) y la GPU arma los mipmaps. En la estadía el muestreo cae en mip 0.
  const STAY_D = 8.0;
  const screenDevPx = () => {
    const fov = innerWidth / innerHeight > 1.9 ? 30 : 32;
    const visW = 2 * STAY_D * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * (innerWidth / innerHeight);
    return Math.round((SW / visW) * innerWidth * Math.min(devicePixelRatio || 1, 2));
  };
  const texs = [];
  const prep = (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
    texs.push(t); ctl.texs.push(t); return t;
  };
  const screenTex = (im, cropX) => {
    const W = im.naturalWidth, H = im.naturalHeight;
    let sx = 0, sy = 0, sw = W, sh = H;
    if (W / H > 2) { sw = H * 2; sx = cropX != null ? cropX : (W - sw) / 2; } else { sh = W / 2; }
    const tw = Math.min(Math.round(sw), Math.max(512, screenDevPx()));
    const c = document.createElement('canvas'); c.width = tw; c.height = Math.round(tw / 2);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return prep(new THREE.CanvasTexture(c));
  };
  const scrTex = [];
  for (let k = 0; k < N; k++) { scrTex.push(screenTex(imgs[k], GAL_PROJECTS[k].cropX)); await yieldToMain(); if (!alive()) return null; }

  // teclado: una textura para las cuatro laptops (teclas hundidas, trackpad)
  const deckTex = (() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * LD / LW);
    const g = c.getContext('2d');
    const sx = c.width / 2048, sy = c.height / 1386;
    g.fillStyle = '#26272b'; g.fillRect(0, 0, c.width, c.height);
    const kx0 = 190, kx1 = 1858, ky0 = 120, rows = 6, kh = 92, gap = 14;
    for (let r = 0; r < rows; r++) {
      const y = ky0 + r * (kh + gap), n = r === 0 ? 14 : 13, w = (kx1 - kx0 - gap * (n - 1)) / n;
      for (let i = 0; i < n; i++) {
        const x = kx0 + i * (w + gap); let ww = w;
        if (r === 5 && i === 5) ww = w * 3 + gap * 2;
        if (r === 5 && (i === 6 || i === 7)) continue;
        g.fillStyle = '#0c0c0d'; g.beginPath(); g.roundRect(x * sx, (r === 0 ? y + 30 : y) * sy, ww * sx, (r === 0 ? kh - 30 : kh) * sy, 6); g.fill();
      }
    }
    g.fillStyle = '#2b2c31'; g.beginPath(); g.roundRect(724 * sx, 790 * sy, 600 * sx, 470 * sy, 10); g.fill();
    g.strokeStyle = '#34353a'; g.lineWidth = 2; g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; texs.push(t); ctl.texs.push(t);
    return t;
  })();
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- luz: cenital fría sobre el teclado, llave suave de frente, el rojo de la recta desde abajo ---------- */
  const lights = new THREE.Group();
  const lt = (l, p, tg) => { l.position.copy(p); l.target.position.copy(tg); lights.add(l, l.target); return l; };
  lt(new THREE.DirectionalLight(0xe6ecff, 1.5), V(0.5, 10, -1.5), V(0, 0, -1));      // cenital fría
  lt(new THREE.DirectionalLight(0xf3efe9, 0.75), V(-4, 3.5, 8), V(0, 0.6, -1));       // llave de frente
  lt(new THREE.DirectionalLight(0xe8272a, 0.9), V(0, -1.2, 6), V(0, 0.5, -1));        // la recta, de abajo y adelante
  lt(new THREE.DirectionalLight(0xffe6dc, 0.55), V(3, 4, -9), V(0, 0.8, -1));         // contraluz cálido (canto)
  lights.add(new THREE.AmbientLight(0xffffff, 0.22));
  group.add(lights);

  /* ---------- la señal: cinta de luz que mira a cámara, con ventana [s0, s1] sobre su largo (fx.js de la maqueta) ---------- */
  const camL = uniform(new THREE.Vector3());     // cámara en coordenadas de la vitrina (las cintas viven ahí)
  function makeRibbon(points, { width = 0.06, core = 0.11, glow = 0.55, near = [0.4, 2.6], gain = 1 } = {}) {
    const segs = points.length - 1;
    const pos = new Float32Array(segs * 4 * 3), tan = new Float32Array(segs * 4 * 3), side = new Float32Array(segs * 4), sv = new Float32Array(segs * 4);
    const idx = [];
    let s = 0;
    const t = new THREE.Vector3();
    for (let i = 0; i < segs; i++) {
      const a = points[i], b = points[i + 1];
      t.subVectors(b, a); const len = t.length(); t.normalize();
      const base = i * 4;
      [[a, -1, s], [a, 1, s], [b, -1, s + len], [b, 1, s + len]].forEach(([p, sd, ss], k) => {
        pos.set([p.x, p.y, p.z], (base + k) * 3); tan.set([t.x, t.y, t.z], (base + k) * 3); side[base + k] = sd; sv[base + k] = ss;
      });
      idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      s += len;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aTan', new THREE.BufferAttribute(tan, 3));
    g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    g.setAttribute('aS', new THREE.BufferAttribute(sv, 1));
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    const u = { s0: uniform(0), s1: uniform(0), inten: uniform(0), keepA: uniform(-1), keepB: uniform(-1), settle: uniform(0), head: uniform(1) };
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const aTan = attribute('aTan', 'vec3'), aSide = attribute('aSide', 'float'), aS = attribute('aS', 'float');
    const toCam = normalize(camL.sub(positionLocal));
    const n = normalize(cross(aTan, toCam));
    m.positionNode = positionLocal.add(n.mul(aSide).mul(width));
    const x = abs(aSide);
    const coreP = exp(x.mul(x).div(core * core * 2).negate());
    const glowP = exp(x.mul(4.2).negate()).mul(glow).mul(float(1).sub(x));
    const win = smoothstep(u.s0, u.s0.add(0.25), aS).mul(float(1).sub(smoothstep(u.s1.sub(0.015), u.s1, aS)));
    const headF = exp(u.s1.sub(aS).max(0).mul(-2.2)).mul(u.head);
    const inKeep = smoothstep(u.keepA.sub(0.02), u.keepA, aS).mul(float(1).sub(smoothstep(u.keepB, u.keepB.add(0.02), aS)));
    const settleK = mix(float(1), inKeep.mul(0.9), u.settle);
    const nearF = smoothstep(near[0], near[1], distance(positionLocal, camL));
    const I = win.mul(settleK).mul(u.inten).mul(nearF).mul(appear).mul(gain);
    m.colorNode = REDL.mul(glowP.add(coreP.mul(1.6))).add(vec3(1, 0.86, 0.84).mul(coreP.mul(coreP).mul(float(0.55).add(headF.mul(1.4)))))
      .add(REDL.mul(headF.mul(glowP).mul(1.2))).mul(I);
    m.opacityNode = float(1);
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false; mesh.renderOrder = 20;
    group.add(mesh);
    return { mesh, u, length: s };
  }

  /* ---------- las cuatro laptops ---------- */
  const metalCol = new THREE.Color(0x3b3c41);
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d'); g.filter = 'blur(22px)'; g.fillStyle = '#000'; g.fillRect(52, 52, 152, 152);
    const t = new THREE.CanvasTexture(c); texs.push(t); ctl.texs.push(t); return t;
  })();
  const toWorldLocal = (lap, p) => p.clone().applyAxisAngle(V(0, 1, 0), lap.yaw).add(lap.home);

  const laps = GAL_PROJECTS.map((pr, k) => {
    const root = new THREE.Group();
    const home = V(...pr.pos);
    root.position.copy(home); root.rotation.y = pr.yaw;
    group.add(root);
    const u = { lit: uniform(0), pw: uniform(0), rim: uniform(0) };
    const metal = new THREE.MeshStandardNodeMaterial({ metalness: 0.42, roughness: 0.42 });
    metal.colorNode = vec3(metalCol.r, metalCol.g, metalCol.b).mul(u.lit);
    const base = new THREE.Mesh(new RoundedBoxGeometry(LW, BASE_H, LD, 3, 0.022), metal);
    base.position.set(0, BASE_H / 2, FRONT - LD / 2);
    root.add(base);
    const deckM = new THREE.MeshStandardNodeMaterial({ metalness: 0.3, roughness: 0.55 });
    {
      const tc = texture(deckTex, uv()).rgb;
      deckM.colorNode = tc.mul(u.lit);
      // luz de la pantalla sobre el teclado (cae desde la bisagra)
      deckM.emissiveNode = vec3(0.5, 0.56, 0.68).mul(exp(float(1).sub(uv().y).mul(-3.2))).mul(0.035).mul(u.pw).mul(u.lit);
    }
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(LW - 0.06, LD - 0.06), deckM);
    deck.rotation.x = -Math.PI / 2; deck.position.set(0, BASE_H + 0.0008, FRONT - LD / 2);
    root.add(deck);
    // sombra de contacto sobre el piso invisible
    const shM = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    shM.colorNode = vec3(0);
    shM.opacityNode = texture(shadowTex, uv()).a.mul(0.85).mul(u.lit).mul(appear);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(LW * 1.45, LD * 1.55), shM);
    sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.002, FRONT - LD / 2); sh.renderOrder = 1;
    root.add(sh);
    // tapa: gira sobre la bisagra (0 cerrada, 1 abierta)
    const hinge = new THREE.Group();
    hinge.position.set(0, HINGE_Y, HINGE_Z);
    root.add(hinge);
    const lid = new THREE.Mesh(new RoundedBoxGeometry(LW, LIDH, LID_T, 3, 0.012), metal);
    lid.position.set(0, LIDH / 2, -LID_T / 2);
    hinge.add(lid);
    const bezelM = new THREE.MeshBasicNodeMaterial();
    bezelM.colorNode = vec3(0.0032, 0.0032, 0.0036).mul(u.lit.mul(0.6).add(0.4)).mul(appear);
    const bezel = new THREE.Mesh(new THREE.PlaneGeometry(LW - 0.012, LIDH - 0.012), bezelM);
    bezel.position.set(0, LIDH / 2, 0.0008);
    hinge.add(bezel);
    // el canto de la tapa: la señal lo recorre (rojo)
    const rimM = new THREE.MeshBasicNodeMaterial();
    rimM.colorNode = REDL.mul(u.rim.mul(2.6)).mul(appear);
    const rimMesh = new THREE.Mesh(new THREE.BoxGeometry(LW - 0.05, 0.0045, LID_T * 0.7), rimM);
    rimMesh.position.set(0, LIDH + 0.0005, -LID_T / 2);
    hinge.add(rimMesh);
    // pantalla: la captura tal cual (sin tone mapping ni post). Enciende desde la línea roja de abajo hacia arriba.
    const scrM = new THREE.MeshBasicNodeMaterial();
    {
      const v = uv();
      const tc = texture(scrTex[k], v).rgb;
      const wipe = u.pw;
      const vis = float(1).sub(smoothstep(wipe.sub(0.008), wipe, v.y));
      const front = exp(abs(v.y.sub(wipe)).mul(-110)).mul(step(0.002, wipe)).mul(step(wipe, 0.998));
      const glass = vec3(0.0045, 0.0045, 0.005);
      scrM.colorNode = mix(glass, tc, vis).add(REDL.mul(front.mul(2.4))).mul(appear);
    }
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), scrM);
    screen.position.set(0, CHIN + SH / 2, 0.0016);
    screen.renderOrder = 2;
    hinge.add(screen);

    return { k, pr, root, home, yaw: pr.yaw, hinge, screen, u, lidA: 0, visible: true };
  });
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- el vidrio de la vitrina: un panel oscuro detrás de cada laptop, con cantos que toman la luz ---------- */
  laps.forEach((lap) => {
    const gm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const v = uv();
    const ex = min(v.x, float(1).sub(v.x));
    const cant = exp(ex.mul(-90)).mul(0.6).add(exp(float(1).sub(v.y).mul(-70)).mul(0.35));
    // reflejo: una banda diagonal suave que se corre con la cámara (en el vidrio, nunca sobre la pantalla)
    const d = v.x.add(v.y.mul(0.4)).sub(fract(camL.x.mul(0.035).add(camL.z.mul(0.02))).mul(1.6).sub(0.3));
    const sheen = exp(d.mul(d).mul(-26)).mul(0.5);
    const fall = smoothstep(0.0, 0.35, v.y);
    gm.colorNode = OFF.mul(cant.add(sheen).mul(fall).mul(0.012)).mul(lap.u.lit).mul(appear);
    gm.opacityNode = float(1);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(CW * 2, CH), gm);
    glass.position.set(0, CH / 2, FRONT - LD - 0.55);
    glass.renderOrder = 0;
    lap.root.add(glass);
  });

  /* ---------- nombres gigantes (un plano propio por proyecto, detrás) ---------- */
  const display = (() => { const el = document.querySelector('.font-display'); return el ? getComputedStyle(el).fontFamily : '"Bebas Neue", sans-serif'; })();
  try { await document.fonts.load(`400 300px ${display}`); } catch (e) { /* respaldo */ }
  const words = laps.map((lap) => {
    const px = 380;
    const c0 = document.createElement('canvas').getContext('2d');
    c0.font = `400 ${px}px ${display}`;
    const w = Math.ceil(c0.measureText(lap.pr.word).width + px * 0.12);
    const c = document.createElement('canvas'); c.width = Math.min(4096, w); c.height = Math.ceil(px * 0.95);
    const g = c.getContext('2d'); g.font = `400 ${px}px ${display}`; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    g.fillText(lap.pr.word, px * 0.06, px * 0.84);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; texs.push(t); ctl.texs.push(t);
    const op = uniform(0);
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const tx = texture(t, uv());
    m.colorNode = tx.rgb; m.opacityNode = tx.a.mul(op).mul(appear);
    const h = 3.3;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(h * c.width / c.height, h), m);
    const side = lap.pr.side;             // texto a ese lado: el nombre arranca detrás de la laptop y corre hacia afuera
    const wW = h * c.width / c.height;
    const base = V(-side * (wW / 2 - 1.2), 1.15, FRONT - LD - 4.2);
    mesh.position.copy(base); mesh.renderOrder = -1;
    lap.root.add(mesh);
    return { mesh, op, base, side };
  });
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- haz cenital: plano que mira a cámara, perfil gaussiano (volumen, no cono) ---------- */
  const beams = laps.map((lap) => {
    const g = new THREE.PlaneGeometry(8, 12); g.translate(0, -6, 0);
    const op = uniform(0);
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const x = uv().x.sub(0.5).mul(2), y = uv().y;
    const spread = mix(float(0.08), float(1), float(1).sub(y));
    const xs = x.div(spread);
    m.colorNode = vec3(1, 0.95, 0.9).mul(exp(xs.mul(xs).mul(-2.2)).mul(smoothstep(0.0, 0.6, y)).mul(smoothstep(1.0, 0.9, y))).mul(op).mul(appear);
    m.opacityNode = float(1);
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 5;
    mesh.position.copy(toWorldLocal(lap, V(0, 8.2, FRONT - LD * 0.7)));
    group.add(mesh);
    return { mesh, op };
  });

  /* ---------- polvo con bokeh falso (lo único desenfocado, con el fondo) ---------- */
  const dustFocus = uniform(8);
  {
    const n = 1500, rr = (() => { let s = 7 >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
    const p = new Float32Array(n * 3), sd = new Float32Array(n);
    for (let i = 0; i < n; i++) { p[i * 3] = -70 + rr() * 82; p[i * 3 + 1] = -3.5 + rr() * 9; p[i * 3 + 2] = -22 + rr() * 34; sd[i] = rr(); }
    const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const basePos = instancedBufferAttribute(new THREE.InstancedBufferAttribute(p, 3));
    const seedA = instancedBufferAttribute(new THREE.InstancedBufferAttribute(sd, 1));
    const tt = time.mul(0.12).add(seedA.mul(40));
    m.positionNode = basePos.add(vec3(sin(tt).mul(0.22), cos(tt.mul(0.7)).mul(0.16), sin(tt.mul(0.5)).mul(0.2)));
    const d = distance(positionWorld, cameraPosition);
    const coc = abs(d.sub(dustFocus)).div(d.max(0.5)).min(1.2);
    m.scaleNode = seedA.mul(0.009).add(0.005).add(coc.mul(0.022));
    const rad = length(uv().sub(0.5)).mul(2);
    const disk = float(1).sub(smoothstep(mix(float(0.15), float(0.82), coc.min(1)), float(1), rad));
    const fade = smoothstep(0.25, 1.4, d).mul(float(1).sub(smoothstep(26, 44, d)));
    m.colorNode = vec3(1, 0.9, 0.84).mul(0.55);
    m.opacityNode = disk.mul(seedA.mul(0.5).add(0.2)).mul(float(1).sub(coc.min(1).mul(0.8))).mul(fade).mul(appear);
    const s = new THREE.Sprite(m); s.count = n; s.frustumCulled = false; s.renderOrder = 30;
    group.add(s);
  }

  /* ---------- fondo: el vacío con un pozo de luz detrás del objeto (corridor.js lo mezcla con el del hero) ---------- */
  const poolX = uniform(0.68), voidW = uniform(0);
  const bgNode = (() => {
    const pp = screenUV.sub(vec2(poolX, -0.08));
    const pool = exp(length(pp.mul(vec2(1.0, 1.6))).mul(-2.6)).mul(0.0065);
    const nz = fract(sin(dot(screenUV.mul(vec2(1731.3, 977.1)).add(fract(time.mul(7.3)).mul(91.7)), vec2(12.9898, 78.233))).mul(43758.5453)).sub(0.5).mul(0.0016);
    const b = float(0.0015);
    return vec3(b.add(pool).add(nz), b.add(pool.mul(0.97)).add(nz), b.add(pool.mul(0.95)).add(nz));
  })();

  /* ---------- la señal: contorno de cada vitrina, relevos (cometas) y la salida ---------- */
  const contourLocal = (fromLeft) => (fromLeft
    ? [V(-CW, 0, 0), V(CW, 0, 0), V(CW, CH, 0), V(-CW, CH, 0), V(-CW, 0, 0)]
    : [V(CW, 0, 0), V(CW, CH, 0), V(-CW, CH, 0), V(-CW, 0, 0)]);
  // TraumaVision: la base es la recta del About (corridor.railBri la deja encendida); la cinta dibuja lados y techo
  const cTV = makeRibbon(contourLocal(false).map((p) => toWorldLocal(laps[0], p)), { width: 0.06 });
  const PER_TV = 2 * CH + 2 * CW;
  const lidTop = (lap, a) => {
    const ang = lerp(Math.PI / 2 - 0.004, OPEN, a);
    return toWorldLocal(lap, V(0, HINGE_Y + Math.cos(ang) * LIDH, HINGE_Z + Math.sin(ang) * LIDH));
  };
  const relays = [];
  for (let k = 0; k < N - 1; k++) {
    const a = laps[k], b = laps[k + 1];
    const start = lidTop(a, 0.45);
    const cont = contourLocal(true).map((p) => toWorldLocal(b, p));
    const dir = cont[0].clone().sub(start);
    const mid1 = start.clone().add(V(dir.x * 0.25, 0.9, 1.4));
    const mid2 = start.clone().add(V(dir.x * 0.6, -0.2, dir.z * 0.55 + 1.2));
    const pre = cont[0].clone().add(V(1.4, 0, 1.0).applyAxisAngle(V(0, 1, 0), b.yaw));
    const travel = new THREE.CatmullRomCurve3([start, mid1, mid2, pre, cont[0]], false, 'centripetal').getPoints(180);
    let tl = 0; for (let i = 1; i < travel.length; i++) tl += travel[i].distanceTo(travel[i - 1]);
    const r = makeRibbon([...travel, ...cont.slice(1)], { width: 0.06 });
    r.u.keepA.value = tl; r.u.keepB.value = tl + 2 * CW;
    relays.push({ r, travelLen: tl, per: 4 * CW + 2 * CH, mid: travel[Math.floor(travel.length * 0.5)].clone(), start });
  }
  // salida: la base de LEEX (ya encendida) sale como cometa hacia la recta y la recorre hasta el umbral
  const lx = laps[N - 1];
  const exitStart = toWorldLocal(lx, V(-CW, 0, 0));
  let exitJoinX = 0, exit = null;
  function buildExit(zStopX) {
    // la recta del pasillo, en coordenadas de la vitrina: y = 0, z = 0, x = z del pasillo − origen
    exitJoinX = exitStart.x - 7.5;
    const j = V(exitJoinX, 0, 0);
    const pts = new THREE.CatmullRomCurve3([exitStart, exitStart.clone().add(V(-1.6, 0.05, 1.2)), V(exitJoinX + 3.2, 0.02, 2.4), V(exitJoinX + 0.9, 0, 0.35), j], false, 'centripetal').getPoints(140);
    if (exit) { group.remove(exit.mesh); exit.mesh.geometry.dispose(); exit.mesh.material.dispose(); }
    exit = makeRibbon(pts, { width: 0.06 });
    let len = 0; for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1]);
    exit.len = len; exit.stopX = zStopX;
  }

  /* ---------- colocación: el origen de la vitrina sobre la recta, frente a la cámara del About ---------- */
  let O = V(0, railY, 10), aboutP = V(), aboutL = V();
  /** aP/aL: pose del About en coordenadas del pasillo. La laptop de TraumaVision cae a la derecha del cuadro. */
  function place(aP, aL) {
    O.set(0, railY - 0.0, aP.z + 1.15);
    group.position.copy(O);
    group.rotation.set(0, -Math.PI / 2, 0);
    group.updateMatrix();
    // pose del About en coordenadas de la vitrina
    const inv = group.matrix.clone().invert();
    aboutP.copy(aP).applyMatrix4(inv); aboutL.copy(aL).applyMatrix4(inv);
    buildExit(railStop - O.z);
    buildKeys();
  }
  /** z del pasillo de un x de la vitrina sobre la recta */
  const railZOf = (x) => x + O.z;

  /* ---------- cámara: estadías orbitando, relevos, entrada y salida (todo en coordenadas de la vitrina) ---------- */
  let endP = V(), endL = V();
  const centers = laps.map((lap) => toWorldLocal(lap, CENTER));
  const sgn = (k) => (k % 2 === 0 ? 1 : -1);
  const shiftOf = (k) => -laps[k].pr.side * 0.205;
  function orbit(k, th, ph, d, out) {
    const c = centers[k], a = laps[k].yaw + th;
    return out.set(c.x + Math.sin(a) * Math.cos(ph) * d, c.y + Math.sin(ph) * d, c.z + Math.cos(a) * Math.cos(ph) * d);
  }
  const STAY = { th: 0.21, d0: 8.35, d1: 7.75, ph0: 0.075, ph1: 0.04 };
  const stayPose = (k, s, out) => orbit(k, sgn(k) * lerp(-STAY.th, STAY.th, sineIO(s)), lerp(STAY.ph0, STAY.ph1, s), lerp(STAY.d0, STAY.d1, sineIO(s)), out);
  const relayCurves = [];
  function buildKeys() {
    relayCurves.length = 0;
    for (let k = 0; k < N - 1; k++) {
      const p0 = stayPose(k, 1, V()), p1 = stayPose(k + 1, 0, V());
      const m = relays[k].mid.clone(); m.y += 1.1; m.z += 5.2;
      const pm = p0.clone().lerp(p1, 0.5).lerp(m, 0.55);
      relayCurves.push({
        pos: new THREE.CatmullRomCurve3([p0.clone().add(p0.clone().sub(pm).multiplyScalar(0.3)), p0, pm, p1, p1.clone().add(p1.clone().sub(pm).multiplyScalar(0.3))], false, 'centripetal'),
        tgt: new THREE.CatmullRomCurve3([centers[k], relays[k].mid, centers[k + 1]], false, 'centripetal'),
      });
    }
  }
  /** la pose final del pasillo (la primera de Frame by Frame), en coordenadas del pasillo */
  function setEnd(P, L) { const inv = group.matrix.clone().invert(); endP.copy(P).applyMatrix4(inv); endL.copy(L).applyMatrix4(inv); }

  const st = { P: V(), T: V(), shift: 0, roll: 0, swayT: 0, swayP: 0, stayS: 0.5, focusK: 0, u: 0, mode: '' };
  const tA = V(), tB = V(), tC = V(), tD = V();
  /** pose de la vitrina para u (≤ GAL_END): escribe outP/outL en coordenadas del pasillo */
  function pose(u, t, outP, outL) {
    st.u = u;
    let P = tA, T = tB, shift = 0, roll = 0;
    const d0 = D[0][0];
    if (u < d0) {
      // entrada: de la pose del About a la estadía de TraumaVision (la laptop ya cae a la derecha del cuadro)
      const e = easeIO(range(u, GAL_ABOUT_OUT + 0.03, d0));
      stayPose(0, 0, tC);
      P.copy(aboutP).lerp(tC, e); P.y += Math.sin(Math.PI * e) * 0.25;
      T.copy(aboutL).lerp(centers[0], easeIO(range(u, GAL_ABOUT_OUT + 0.03, d0 - 0.15)));
      shift = shiftOf(0) * sm(range(u, GAL_ABOUT_OUT + 0.15, d0 - 0.1));
      st.stayS = 0; st.mode = 'enter';
    } else if (u > LAST_OUT) {
      // salida: la cámara sigue la línea roja desde LEEX hasta el umbral (la última pose = la primera de Frame by Frame)
      const x = range(u, LAST_OUT, GAL_END);
      const s = easeIO(x);
      stayPose(N - 1, 1, tC);
      const mid = tD.set(exitJoinX + 3.5, 1.3, 4.8);
      // dos tramos: hasta el medio (la línea llega a la recta) y del medio al umbral
      if (s < 0.5) P.copy(tC).lerp(mid, easeIO(s * 2)); else P.copy(mid).lerp(endP, easeIO(s * 2 - 1));
      const tj = V(exitJoinX, 0.3, 0);
      if (s < 0.5) T.copy(centers[N - 1]).lerp(tj, easeIO(s * 2)); else T.copy(tj).lerp(endL, easeIO(s * 2 - 1));
      shift = shiftOf(N - 1) * (1 - sm(range(x, 0.05, 0.55)));
      roll = Math.sin(Math.PI * s) * -0.05;
      st.stayS = 1; st.mode = 'exit';
    } else {
      let k = 0; while (k < N - 1 && u > D[k][1]) k++;
      if (u >= D[k][0]) {
        const s = range(u, D[k][0], D[k][1]);
        stayPose(k, s, P); T.copy(centers[k]); shift = shiftOf(k); st.stayS = s; st.mode = 'stay' + k;
      } else {
        // relevo k−1 → k
        const j = k - 1, x = range(u, D[j][1], D[k][0]), s = easeIO(x);
        relayCurves[j].pos.getPoint(s, P);
        relayCurves[j].tgt.getPoint(easeIO(range(x, 0.05, 0.92)), T);
        shift = lerp(shiftOf(j), shiftOf(k), sm(range(x, 0.3, 0.88)));
        roll = Math.sin(Math.PI * s) * 0.075 * sgn(j);
        st.stayS = x < 0.5 ? 1 : 0; st.mode = 'relay' + k;
      }
    }
    // respiración: la cámara nunca está quieta (rotación alrededor del objetivo); se calma en la salida
    const drift = 1 - sm(range(u, LAST_OUT + 0.2, GAL_END));
    const swayT = Math.sin(t * 0.23) * 0.03 * drift, swayP = Math.sin(t * 0.17 + 1.3) * 0.016 * drift, swayD = Math.sin(t * 0.13) * 0.14 * drift;
    st.swayT = swayT; st.swayP = swayP;
    const v = tC.copy(P).sub(T), len = v.length();
    if (len > 1e-4) {
      v.applyAxisAngle(V(0, 1, 0), swayT);
      const right = tD.set(0, 1, 0).cross(v).normalize();
      v.applyAxisAngle(right, -swayP);
      v.multiplyScalar((len + swayD * Math.min(1, len / 8)) / len);
      P = tA.copy(T).add(v);
    }
    st.P.copy(P); st.T.copy(T); st.shift = shift; st.roll = roll;
    outP.copy(P).applyMatrix4(group.matrix);
    outL.copy(T).applyMatrix4(group.matrix);
    dustFocus.value = len;
  }

  /* ---------- estado por frame ---------- */
  const corners = [V(), V(), V(), V()];
  // máscaras de pantalla (hasta dos: la que se va y la que llega), en screenUV (0,0 arriba a la izquierda)
  const MQ = [0, 1].map(() => ({ q: [0, 1, 2, 3].map(() => uniform(new THREE.Vector2(-2, -2))), on: uniform(0) }));
  const tmpW = V();
  function projectScreen(lap, slot) {
    const m = MQ[slot];
    lap.screen.updateWorldMatrix(true, false);
    const hw = SW / 2, hh = SH / 2;
    corners[0].set(-hw, hh, 0); corners[1].set(hw, hh, 0); corners[2].set(hw, -hh, 0); corners[3].set(-hw, -hh, 0);
    let ok = true;
    for (let i = 0; i < 4; i++) {
      tmpW.copy(corners[i]).applyMatrix4(lap.screen.matrixWorld).project(camera);
      if (tmpW.z > 1 || tmpW.z < -1) ok = false;
      m.q[i].value.set((tmpW.x + 1) / 2, (1 - tmpW.y) / 2);
    }
    m.on.value = ok ? 1 : 0;
  }

  function setLens(shift) {
    const w = innerWidth, h = innerHeight;
    if (Math.abs(shift) < 1e-4) {
      if (camera.view && camera.view.enabled) camera.clearViewOffset();
      if (Math.abs(camera.aspect - w / h) > 1e-6) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
      return;
    }
    const s = shift * w, F = w + 2 * Math.abs(s);
    camera.aspect = F / h;
    camera.setViewOffset(F, h, s > 0 ? 0 : 2 * Math.abs(s), 0, w, h);
    camera.updateProjectionMatrix();
  }

  /** Estado de la vitrina para u: laptops, señal, nombres, lente, máscaras. Corre después de fijar la cámara. */
  function update(u, t, dt, gw) {
    const on = u < GAL_END + 0.05;
    group.visible = on && gw > 0.0005;
    voidW.value = gw * (1 - sm(range(u, LAST_OUT + 0.2, GAL_END)));
    if (!group.visible) { MQ[0].on.value = 0; MQ[1].on.value = 0; setLens(0); return; }
    camL.value.copy(camera.position); group.worldToLocal(camL.value);

    // la recta dibuja la vitrina de TraumaVision (lados y techo; la base la deja encendida corridor.railBri)
    const q = easeIO(range(u, ...VIT_TRACE));
    cTV.u.s0.value = 0; cTV.u.s1.value = PER_TV * q;
    cTV.u.head.value = q > 0.001 && q < 0.999 ? 1 : 0;
    cTV.u.settle.value = sm(range(u, VIT_TRACE[1] - 0.05, VIT_TRACE[1] + 0.35));
    cTV.u.inten.value = q > 0 ? 1 : 0;

    laps.forEach((lap, k) => {
      let lit, lidA, pw, arrive = 1, rim;
      const T0 = k > 0 ? range(u, D[k - 1][1], D[k][0]) : 0;
      if (k === 0) {
        lit = sm(range(u, 0.72, 1.02));
        lidA = easeIO(range(u, ...VIT_OPEN));
        pw = easeIO(range(u, ...VIT_POWER));
      } else {
        arrive = quartOut(range(T0, 0.28, 0.86));
        lit = sm(range(T0, 0.28, 0.55));
        lidA = easeIO(range(T0, 0.56, 0.93));
        pw = easeIO(range(T0, 0.8, 1.0));
      }
      // se va: la tapa se entorna y la pantalla se apaga hacia la línea; la última se cierra del todo
      const T1 = k < N - 1 ? range(u, D[k][1], D[k + 1][0]) : range(u, D[k][1], GAL_END);
      if (k < N - 1) {
        lidA *= 1 - 0.55 * easeIO(range(T1, 0.0, 0.32));
        pw *= 1 - easeIO(range(T1, 0.0, 0.2));
        lit *= 1 - 0.75 * sm(range(T1, 0.3, 0.9));
      } else {
        lidA *= 1 - easeIO(range(T1, 0.0, 0.3));
        pw *= 1 - easeIO(range(T1, 0.0, 0.16));
        lit *= 1 - sm(range(T1, 0.3, 0.75));
      }
      // canto rojo: se enciende con la señal que abre la tapa, chispa al salir el cometa
      const open = k === 0 ? range(u, VIT_OPEN[0] - 0.12, VIT_OPEN[0] + 0.1) : range(T0, 0.48, 0.66);
      const spark = Math.exp(-Math.pow((T1 - 0.12) / 0.06, 2));
      rim = (0.22 * sm(open) + 0.9 * Math.exp(-Math.pow((open - 0.6) / 0.25, 2)) * (open > 0 && open < 1 ? 1 : 0)) * (1 - sm(range(T1, 0.3, 0.6))) + (T1 > 0 ? spark : 0);
      lap.u.lit.value = lit; lap.u.pw.value = pw; lap.u.rim.value = rim * lit + (T1 > 0 ? spark * 0.8 : 0);
      lap.lidA = lidA;
      lap.hinge.rotation.x = lerp(Math.PI / 2 - 0.004, OPEN, lidA);
      // llega girando desde la profundidad
      const away = 1 - arrive, spin = (k % 2 === 0 ? -1 : 1) * 1.15 * away;
      lap.root.position.copy(lap.home).add(tmpW.set(0, -0.4 * away, -7.5 * away).applyAxisAngle(V(0, 1, 0), lap.yaw));
      lap.root.rotation.y = lap.yaw + spin;
      const vis = (k === 0 ? u > 0.5 : T0 > 0.2) && lit > 0.002 && T1 < 1;
      lap.root.visible = vis;
      // nombre gigante: aparece con la laptop, se desliza al revés de la órbita
      const w = words[k];
      const stayS = range(u, D[k][0], D[k][1]);
      w.op.value = 0.0055 * sm(range(k === 0 ? u : T0, k === 0 ? 1.15 : 0.7, k === 0 ? 1.6 : 1.0)) * (1 - sm(range(T1, 0, 0.35)));
      w.mesh.position.set(w.base.x - sgn(k) * (sineIO(stayS) - 0.5) * 1.4, w.base.y, w.base.z);
      beams[k].op.value = 0.03 * sm(range(k === 0 ? u : T0, k === 0 ? 0.85 : 0.5, k === 0 ? 1.4 : 0.95)) * (1 - sm(range(T1, 0.1, 0.5)));
      beams[k].mesh.quaternion.copy(camera.quaternion);
    });

    // relevos: la señal sale del canto, cruza el vacío y dibuja el contorno de la siguiente
    relays.forEach((R, k) => {
      const T = range(u, D[k][1], D[k + 1][0]);
      const tr = range(T, 0.1, 0.72), tk = range(T, 0.68, 0.95);
      const head = R.travelLen * easeIO(tr) + R.per * easeIO(tk);
      R.r.u.s1.value = head;
      R.r.u.s0.value = tk > 0 ? lerp(Math.max(0, R.travelLen - 12), R.travelLen, easeIO(range(T, 0.7, 0.97))) : Math.max(0, head - 12);
      R.r.u.head.value = T < 0.96 ? 1 : 0.15;
      R.r.u.settle.value = sm(range(T, 0.9, 1));
      // la base de la vitrina queda encendida durante la estadía y se apaga cuando esa laptop se va
      const Tn = k + 1 < N - 1 ? range(u, D[k + 1][1], D[k + 2][0]) : range(u, LAST_OUT, GAL_END);
      R.r.u.inten.value = T > 0 ? 1 - sm(range(Tn, k + 1 < N - 1 ? 0.15 : 0.35, k + 1 < N - 1 ? 0.5 : 0.6)) : 0;
      R.r.mesh.visible = T > 0 && R.r.u.inten.value > 0.001;
    });
    // salida: la base de LEEX sale como cometa hacia la recta del pasillo
    if (exit) {
      const X = range(u, LAST_OUT, GAL_END);
      const hd = exit.len * easeIO(range(X, 0.22, 0.58));
      exit.u.s1.value = hd; exit.u.s0.value = Math.max(0, hd - 7);
      exit.u.head.value = X < 0.58 ? 1 : 0.2;
      exit.u.inten.value = X > 0.2 ? 1 - sm(range(X, 0.62, 0.8)) : 0;
      exit.mesh.visible = exit.u.inten.value > 0.001;
    }

    // lente: el objeto a un lado del cuadro sin verlo en oblicuo (corrimiento de la lente, no giro)
    setLens(st.shift);
    if (st.roll) { camera.rotateZ(st.roll); camera.updateMatrixWorld(); }
    poolX.value = 0.5 + st.shift * 0.88;

    // máscaras: las pantallas encendidas (o encendiéndose) quedan fuera del post
    camera.updateMatrixWorld();
    let slot = 0;
    for (const lap of laps) {
      if (slot > 1) break;
      if (!lap.root.visible || lap.u.pw.value <= 0.001 || lap.lidA < 0.5) continue;
      projectScreen(lap, slot++);
    }
    for (; slot < 2; slot++) MQ[slot].on.value = 0;
  }

  /** máscara (0..1) de las pantallas en el cuadro, para el post de corridor.js */
  const maskNode = (() => {
    const p = screenUV;
    const edge = (a, b) => b.x.sub(a.x).mul(p.y.sub(a.y)).sub(b.y.sub(a.y).mul(p.x.sub(a.x)));
    const inside = (m) => {
      const e0 = edge(m.q[0], m.q[1]), e1 = edge(m.q[1], m.q[2]), e2 = edge(m.q[2], m.q[3]), e3 = edge(m.q[3], m.q[0]);
      const lo = min(min(e0, e1), min(e2, e3)), hi = max(max(e0, e1), max(e2, e3));
      return max(step(0, lo), step(hi, 0)).mul(m.on);
    };
    return max(inside(MQ[0]), inside(MQ[1]));
  })();

  /** z del pasillo donde está el cabezal en la salida (null antes); la recta queda encendida de la unión al cabezal */
  function exitHead(u) {
    if (u <= LAST_OUT) return null;
    const X = range(u, LAST_OUT, GAL_END);
    const a = easeIO(range(X, 0.56, 0.97));
    return { z: lerp(railZOf(exitJoinX), railStop + 0.15, a), joinZ: railZOf(exitJoinX), k: sm(range(X, 0.5, 0.62)) };
  }
  /** la base de TraumaVision sobre la recta [z0, z1] del pasillo, y la ventana de la recta que se recoge */
  function railWindow(u) {
    const q = easeIO(range(u, ...VIT_TRACE));
    const b0 = railZOf(-CW), b1 = railZOf(CW);
    const T = range(u, D[0][1], D[1][0]);
    return { a: lerp(railStop - 2, b0, q), b: lerp(b1 + 40, b1, q), k: u < D[1][0] ? 1 - sm(range(T, 0.15, 0.5)) : 0 };
  }

  /* ---------- texto: el bloque como capa cercana (parallax opuesto a la órbita) ---------- */
  function placeTags(tags, mouse) {
    const u = st.u;
    for (let k = 0; k < tags.length && k < N; k++) {
      const el = tags[k];
      if (!el || el.dataset.on === undefined) continue;
      const side = GAL_PROJECTS[k].side;
      const s = range(u, D[k][0], D[k][1]);
      const pad = innerWidth * 0.055;
      const w = el.offsetWidth, h = el.offsetHeight;
      const px = -(mouse.x * 10) - sgn(k) * (sineIO(s) - 0.5) * 46 - st.swayT * 140;
      const py = -mouse.y * 6 + st.swayP * 120;
      const x = side < 0 ? pad : innerWidth - pad - w;
      const y = Math.max(96, (innerHeight - h) / 2 + 22);
      el.style.transform = `translate3d(${(x + px).toFixed(1)}px, ${(y + py).toFixed(1)}px, 0)`;
    }
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(mx, my, active) {
    if (active < 0 || S.neg.open >= 0) return -1;
    const lap = laps[active];
    if (!lap.root.visible || lap.u.pw.value < 0.9) return -1;
    ndc.set(mx, -my);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(lap.screen, false).length ? active : -1;
  }

  /** precalentado: todo visible para compileAsync (warm(true) guarda la visibilidad, warm(false) la devuelve) */
  let saved = null;
  function warm(v) {
    const objs = [group, ...laps.map((l) => l.root), ...relays.map((r) => r.r.mesh), ...(exit ? [exit.mesh] : [])];
    if (v) { saved = objs.map((o) => o.visible); objs.forEach((o) => { o.visible = true; }); }
    else if (saved) { objs.forEach((o, i) => { o.visible = saved[i]; }); saved = null; }
  }

  return {
    group, place, setEnd, pose, update, placeTags, pick, warm, maskNode, bgNode, voidW, exitHead, railWindow, texs,
    info: () => ({ vit: st.mode, shift: +st.shift.toFixed(3), lid: laps.map((l) => +l.lidA.toFixed(2)), pw: laps.map((l) => +l.u.pw.value.toFixed(2)), tex: scrTex.map((t) => t.image.width) }),
  };
}
