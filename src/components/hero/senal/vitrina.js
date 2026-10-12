/* Projects «Vitrina en el vacío» dentro de la escena persistente «Señal» (maqueta A, 2026-10-12) — pasada de
   realismo y cine del 2026-10-12. Juan: «Hacer que la notebook se vea mas realista y que se vea mas cinematografico
   todo» y «quiero que se vea mas cinematografico y dark».
   Cada proyecto es UNA notebook íntegra (notebook.js) con el home real del producto en la pantalla, nítido y casi de
   frente. La profundidad sale de las capas que rodean al objeto: el nombre gigante detrás (fuera de foco), el haz
   cenital con humo, el piso negro brillante, el polvo y el texto delante.

   Tratamiento de luz: «una sola luz en un estudio negro». La pantalla es la luz principal (derrama su color sobre
   teclado, deck y piso); un cenital duro y acotado dibuja los chaflanes y el cono en el humo; el estudio de softboxes
   sólo aparece en los reflejos del metal, bajo. El rojo es una línea fina en el canto y la bisagra, y la recta viajera.
   (Descartados: cenital de keynote como luz principal —la pantalla deja de mandar y el home pierde protagonismo— y
   contraluz con humo —silueta linda, pero el teclado y la marca del objeto quedan negros.)

   Luz real (`light` de cada notebook) en tiempo real, no con el scroll: se enciende de golpe (cenital con un parpadeo
   de lámpara) cuando la señal llega, y en el relevo se corta en ~0,4 s al cerrarse la tapa (corte de cine, no
   fundido). El pozo del fondo, el haz, los reflejos y el nombre caen con esa luz: el cuadro queda negro con la señal.

   Nitidez: la pantalla es un MeshBasic con la captura remuestreada UNA vez a su tamaño en la estadía (≈1:1 en px del
   dispositivo, DPR ≤ 2), sRGB, sin tone mapping, mipmaps + anisotropía 16, exposición 0,9 (el blanco de la UI no
   revienta), pintada en el pase MSAA. El post (bloom, gradación, viñeta, grano, aberración) no la toca: corridor.js la
   excluye con `maskNode`. En la estadía la cámara orbita ±9° alrededor del eje de la pantalla.

   Coordenadas: todo se arma en las de la vitrina (VF: x a la derecha del About, y arriba, −z hacia la profundidad;
   TraumaVision en el origen, con su frente sobre la recta del About). `group` es hijo del grupo del pasillo con giro
   −90° en y: la recta del About es el eje x de la vitrina. */
import * as THREE from 'three/webgpu';
import {
  uniform, texture, uv, vec2, vec3, float, smoothstep, exp, abs, mix, length, sin, cos, fract, dot, min, max, step,
  positionLocal, positionWorld, cameraPosition, distance, normalize, cross, attribute, instancedBufferAttribute, screenUV, time,
  mx_noise_float
} from 'three/tsl';
import { GAL_PROJECTS, GAL_DWELLS, GAL_END, GAL_ABOUT_OUT, VIT_TRACE, VIT_OPEN, VIT_POWER } from './gallery';
import { buildNotebook, studioEnv, averageColor, SW, SH, LW, LD, FRONT, HINGE_Y, HINGE_Z, OPEN, CLOSED, CENTER, SCREEN_Y } from './notebook';
import { playSound, loopSound } from '../../../lib/sound';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const range = (x, a, b) => clamp01((x - a) / (b - a));
const sm = (x) => x * x * (3 - 2 * x);
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const sineIO = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
const quartOut = (x) => 1 - Math.pow(1 - x, 4);

const N = GAL_PROJECTS.length;
const D = GAL_DWELLS;
const LAST_OUT = D[N - 1][1];
/** óptica de la vitrina (vertical): más larga que la del resto del sitio (32°); las distancias se escalan igual */
export const VIT_FOV = 30;
/** medio ancho del pie de la notebook sobre la recta (la recta del About se recoge hasta ahí) */
const CW = LW / 2 + 0.05;
// arranque de lámpara del cenital: golpe, caída, vuelve y queda
const flicker = (t) => (t < 0 ? 0 : t < 0.05 ? 1 : t < 0.11 ? 0.25 : t < 0.16 ? 0.95 : t < 0.22 ? 0.55 : 1);

/** Arma la vitrina. Devuelve el controlador o null si se desmontó a mitad. */
export async function buildVitrina({ renderer, camera, S, ctl, RED, OFF, appear, yieldToMain, assetBase = '/projects/', railStop, railY = 0.03 }) {
  const alive = () => !ctl.disposed && !S.dead;
  const group = new THREE.Group();
  group.name = 'vitrina';
  const aniso = Math.min(16, renderer.getMaxAnisotropy ? renderer.getMaxAnisotropy() : 8);
  const REDL = vec3(0.807, 0.02, 0.023);         // #E8272A en lineal (el mismo RED de scene.js)
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- imágenes: el home real de cada producto, remuestreado a su tamaño en la estadía ---------- */
  const loadImg = (f) => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = assetBase + f; });
  const imgs = await Promise.all(GAL_PROJECTS.map((p) => loadImg(p.screen)));
  if (!alive()) return null;
  const STAY_D = 9.2;                            // distancia cámara → pantalla a mitad de la estadía
  const screenDevPx = () => {
    const visW = 2 * STAY_D * Math.tan(THREE.MathUtils.degToRad(VIT_FOV / 2)) * (innerWidth / innerHeight);
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
  const scrCols = imgs.map(averageColor);

  // reflejos: estudio de softboxes filtrado con PMREM (0 KB: se arma acá, no se baja un HDRI)
  const env = await studioEnv(renderer);
  if (!alive()) return null;

  /* ---------- la luz: un cenital duro que sigue a la notebook encendida ---------- */
  const spot = new THREE.SpotLight(0xfff4ea, 0, 0, 0.3, 0.55, 2);
  group.add(spot, spot.target);

  /* ---------- la señal: cinta de luz que mira a cámara, con ventana [s0, s1] sobre su largo ---------- */
  const camL = uniform(new THREE.Vector3());     // cámara en coordenadas de la vitrina (las cintas viven ahí)
  function makeRibbon(points, { width = 0.04, core = 0.11, glow = 0.4, near = [0.4, 2.6], gain = 1 } = {}) {
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
    const u = { s0: uniform(0), s1: uniform(0), inten: uniform(0), head: uniform(1) };
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
    const nearF = smoothstep(near[0], near[1], distance(positionLocal, camL));
    const I = win.mul(u.inten).mul(nearF).mul(appear).mul(gain);
    m.colorNode = REDL.mul(glowP.add(coreP.mul(1.5))).add(vec3(1, 0.86, 0.84).mul(coreP.mul(coreP).mul(float(0.45).add(headF.mul(1.4)))))
      .add(REDL.mul(headF.mul(glowP).mul(1.2))).mul(I);
    m.opacityNode = float(1);
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false; mesh.renderOrder = 20;
    group.add(mesh);
    return { mesh, u, length: s };
  }

  /* ---------- las cuatro notebooks, con su piso y su sombra ---------- */
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d'); g.filter = 'blur(18px)'; g.fillStyle = '#000'; g.fillRect(44, 44, 168, 168);
    const t = new THREE.CanvasTexture(c); texs.push(t); ctl.texs.push(t); return t;
  })();
  const toWorldLocal = (lap, p) => p.clone().applyAxisAngle(V(0, 1, 0), lap.yaw).add(lap.home);

  const laps = GAL_PROJECTS.map((pr, k) => {
    const outer = new THREE.Group();
    const home = V(...pr.pos);
    outer.position.copy(home); outer.rotation.y = pr.yaw;
    group.add(outer);
    const nb = buildNotebook({ screenTex: scrTex[k], scrColor: scrCols[k], env, appear, RED: REDL });
    outer.add(nb.root);
    const lu = nb.u;
    // piso negro brillante: sólo existe donde llega la luz (el pozo del cenital y la luz de la pantalla adelante);
    // un brillo corto pegado al canto delantero es el reflejo del chaflán. Se pierde en el negro a los pocos cm.
    const flM = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    {
      const v = uv();
      const p = v.sub(0.5).mul(vec2(9, 7));                       // m desde el centro del piso (x, −z)
      const pz = p.y.negate().add(FRONT - LD / 2 + 0.2);          // z local (el piso se gira: v.y crece hacia −z)
      const pool = exp(length(vec2(p.x.mul(0.62), p.y.sub(0.2).mul(0.8))).mul(-1.6));   // bajo el centro de la notebook
      const spillF = exp(abs(p.x).mul(-1.1)).mul(exp(pz.sub(FRONT).max(0).mul(-1.5))).mul(smoothstep(FRONT - 0.2, FRONT + 0.15, pz));
      const streak = exp(abs(pz.sub(FRONT + 0.05)).mul(-28)).mul(smoothstep(LW / 2 + 0.1, LW / 2 - 0.4, abs(p.x)));
      const col = vec3(1, 0.97, 0.94).mul(pool.mul(0.0045)).add(vec3(lu.scrCol).mul(spillF.mul(0.006).mul(lu.pw))).add(vec3(0.9, 0.92, 1).mul(streak.mul(0.004)));
      flM.colorNode = col.mul(lu.light).mul(appear);
      const r = length(p.mul(vec2(0.42, 0.55)));
      flM.opacityNode = float(0.92).mul(smoothstep(1.6, 0.5, r)).mul(lu.light.mul(0.6).add(0.4)).mul(appear);
    }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), flM);
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.0006, FRONT - LD / 2 + 0.2); floor.renderOrder = -1;
    outer.add(floor);
    const shM = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    shM.colorNode = vec3(0);
    shM.opacityNode = texture(shadowTex, uv()).a.mul(0.9).mul(appear);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(LW * 1.22, LD * 1.25), shM);
    sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.0012, FRONT - LD / 2); sh.renderOrder = 0;
    outer.add(sh);
    return { k, pr, outer, root: nb.root, nb, home, yaw: pr.yaw, hinge: nb.hinge, screen: nb.screen, u: lu, lidA: 0, light: 0, on: false, onT0: -1, lastLid: 0 };
  });
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- nombres gigantes (detrás, fuera de foco: el desenfoque es del plano, no de la pantalla) ---------- */
  const display = (() => { const el = document.querySelector('.font-display'); return el ? getComputedStyle(el).fontFamily : '"Bebas Neue", sans-serif'; })();
  try { await document.fonts.load(`400 300px ${display}`); } catch (e) { /* respaldo */ }
  const words = laps.map((lap) => {
    const px = 380;
    const c0 = document.createElement('canvas').getContext('2d');
    c0.font = `400 ${px}px ${display}`;
    const w = Math.ceil(c0.measureText(lap.pr.word).width + px * 0.2);
    const c = document.createElement('canvas'); c.width = Math.min(4096, w); c.height = Math.ceil(px * 1.05);
    const g = c.getContext('2d'); g.font = `400 ${px}px ${display}`; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    g.filter = 'blur(7px)';
    g.fillText(lap.pr.word, px * 0.1, px * 0.9);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; texs.push(t); ctl.texs.push(t);
    const op = uniform(0);
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    const tx = texture(t, uv());
    m.colorNode = tx.rgb; m.opacityNode = tx.a.mul(op).mul(appear);
    const h = 3.4;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(h * c.width / c.height, h), m);
    const side = lap.pr.side;
    const wW = h * c.width / c.height;
    const base = V(-side * (wW / 2 - 1.2), 1.2, FRONT - LD - 4.6);
    mesh.position.copy(base); mesh.renderOrder = -2;
    lap.outer.add(mesh);
    return { mesh, op, base, side };
  });
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- el cono cenital en el humo: plano que mira a cámara, perfil gaussiano y humo que corre ---------- */
  const beams = laps.map((lap) => {
    const g = new THREE.PlaneGeometry(6, 9.5); g.translate(0, -4.75, 0);
    const op = uniform(0);
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const x = uv().x.sub(0.5).mul(2), y = uv().y;
    const spread = mix(float(0.05), float(0.62), float(1).sub(y));
    const xs = x.div(spread);
    const prof = exp(xs.mul(xs).mul(-2.6)).mul(smoothstep(0.0, 0.5, y)).mul(smoothstep(1.0, 0.93, y));
    const smoke = mx_noise_float(vec3(uv().mul(vec2(3.0, 5.0)), time.mul(0.06))).mul(0.5).add(0.5)
      .mul(mx_noise_float(vec3(uv().mul(vec2(7.0, 11.0)).add(9.1), time.mul(0.11))).mul(0.35).add(0.65));
    m.colorNode = vec3(1, 0.96, 0.92).mul(prof.mul(smoke.mul(1.25))).mul(op).mul(appear);
    m.opacityNode = float(1);
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 5;
    mesh.position.copy(toWorldLocal(lap, V(0, 9.4, FRONT - LD * 0.55)));
    group.add(mesh);
    return { mesh, op };
  });

  /* ---------- polvo con bokeh falso (con el fondo y el nombre, lo único desenfocado) ---------- */
  const dustFocus = uniform(9), dustI = uniform(0);
  {
    const n = 1500, rr = (() => { let s = 7 >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
    const p = new Float32Array(n * 3), sd = new Float32Array(n);
    for (let i = 0; i < n; i++) { p[i * 3] = -70 + rr() * 82; p[i * 3 + 1] = -0.5 + rr() * 7; p[i * 3 + 2] = -22 + rr() * 34; sd[i] = rr(); }
    const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const basePos = instancedBufferAttribute(new THREE.InstancedBufferAttribute(p, 3));
    const seedA = instancedBufferAttribute(new THREE.InstancedBufferAttribute(sd, 1));
    const tt = time.mul(0.1).add(seedA.mul(40));
    m.positionNode = basePos.add(vec3(sin(tt).mul(0.22), cos(tt.mul(0.7)).mul(0.16), sin(tt.mul(0.5)).mul(0.2)));
    const d = distance(positionWorld, cameraPosition);
    const coc = abs(d.sub(dustFocus)).div(d.max(0.5)).min(1.2);
    m.scaleNode = seedA.mul(0.008).add(0.004).add(coc.mul(0.02));
    const rad = length(uv().sub(0.5)).mul(2);
    const disk = float(1).sub(smoothstep(mix(float(0.15), float(0.82), coc.min(1)), float(1), rad));
    const fade = smoothstep(0.25, 1.4, d).mul(float(1).sub(smoothstep(24, 40, d)));
    m.colorNode = vec3(1, 0.93, 0.88).mul(0.5);
    // el polvo se ve donde hay luz: casi nada en el negro, más dentro del haz (dustI = la luz del cuadro)
    m.opacityNode = disk.mul(seedA.mul(0.5).add(0.2)).mul(float(1).sub(coc.min(1).mul(0.8))).mul(fade).mul(dustI.mul(0.8).add(0.12)).mul(appear);
    const s = new THREE.Sprite(m); s.count = n; s.frustumCulled = false; s.renderOrder = 30;
    group.add(s);
  }

  /* ---------- fondo: negro casi absoluto con un pozo de luz chico detrás del objeto (cae con el apagón) ---------- */
  const poolX = uniform(0.68), voidW = uniform(0), stageU = uniform(0);
  const bgNode = (() => {
    const pp = screenUV.sub(vec2(poolX, -0.04));
    const pool = exp(length(pp.mul(vec2(1.15, 1.7))).mul(-3.8)).mul(0.0042).mul(stageU);
    const nz = fract(sin(dot(screenUV.mul(vec2(1731.3, 977.1)).add(fract(time.mul(7.3)).mul(91.7)), vec2(12.9898, 78.233))).mul(43758.5453)).sub(0.5).mul(0.0006);
    const b = float(0.0007);
    // sombras frías: el negro tira apenas a azul (sin levantarlo)
    return vec3(b.add(pool).add(nz).mul(0.93), b.add(pool.mul(0.97)).add(nz).mul(0.98), b.add(pool.mul(0.95)).add(nz).mul(1.08));
  })();

  /* ---------- la señal: la recta viajera (relevos) y la salida ---------- */
  const lidTop = (lap, a) => {
    const ang = lerp(CLOSED, OPEN, a);
    return toWorldLocal(lap, V(0, HINGE_Y + Math.cos(ang) * 1.775, HINGE_Z + Math.sin(ang) * 1.775));
  };
  const hingeEnd = (lap, sx) => toWorldLocal(lap, V(sx * LW * 0.36, HINGE_Y + 0.02, HINGE_Z + 0.02));
  const relays = [];
  for (let k = 0; k < N - 1; k++) {
    const a = laps[k], b = laps[k + 1];
    const start = lidTop(a, 0.25);
    const end = hingeEnd(b, b.pr.side);                         // entra por la bisagra, del lado del texto
    const dir = end.clone().sub(start);
    const mid1 = start.clone().add(V(dir.x * 0.2, 0.7, 1.2));
    const mid2 = start.clone().add(V(dir.x * 0.62, -0.5, dir.z * 0.5 + 1.6));
    const pre = end.clone().add(V(1.6, 0.05, 1.4).applyAxisAngle(V(0, 1, 0), b.yaw));
    const pts = new THREE.CatmullRomCurve3([start, mid1, mid2, pre, end], false, 'centripetal').getPoints(200);
    let tl = 0; for (let i = 1; i < pts.length; i++) tl += pts[i].distanceTo(pts[i - 1]);
    const r = makeRibbon(pts, { width: 0.04 });
    relays.push({ r, len: tl, mid: pts[Math.floor(pts.length * 0.5)].clone(), start });
  }
  // salida: la última pantalla se apaga en la línea; sale de la bisagra de LEEX hacia la recta del pasillo
  const lx = laps[N - 1];
  const exitStart = hingeEnd(lx, -1);
  let exitJoinX = 0, exit = null;
  function buildExit() {
    exitJoinX = exitStart.x - 7.5;
    const j = V(exitJoinX, 0, 0);
    const pts = new THREE.CatmullRomCurve3([exitStart, exitStart.clone().add(V(-1.6, -0.05, 1.2)), V(exitJoinX + 3.2, 0.02, 2.4), V(exitJoinX + 0.9, 0, 0.35), j], false, 'centripetal').getPoints(140);
    if (exit) { group.remove(exit.mesh); exit.mesh.geometry.dispose(); exit.mesh.material.dispose(); }
    exit = makeRibbon(pts, { width: 0.04 });
    let len = 0; for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1]);
    exit.len = len;
  }

  /* ---------- colocación: el origen de la vitrina sobre la recta, frente a la cámara del About ---------- */
  let O = V(0, railY, 10), aboutP = V(), aboutL = V();
  function place(aP, aL) {
    O.set(0, railY, aP.z + 1.15);
    group.position.copy(O);
    group.rotation.set(0, -Math.PI / 2, 0);
    group.updateMatrix();
    const inv = group.matrix.clone().invert();
    aboutP.copy(aP).applyMatrix4(inv); aboutL.copy(aL).applyMatrix4(inv);
    buildExit();
    buildKeys();
  }
  const railZOf = (x) => x + O.z;

  /* ---------- cámara: estadías (dolly-in lento + órbita corta), relevos, entrada y salida ---------- */
  let endP = V(), endL = V();
  const centers = laps.map((lap) => toWorldLocal(lap, CENTER));
  const sgn = (k) => (k % 2 === 0 ? 1 : -1);
  const shiftOf = (k) => -laps[k].pr.side * 0.205;
  function orbit(k, th, ph, d, out) {
    const c = centers[k], a = laps[k].yaw + th;
    return out.set(c.x + Math.sin(a) * Math.cos(ph) * d, c.y + Math.sin(ph) * d, c.z + Math.cos(a) * Math.cos(ph) * d);
  }
  // distancias para una óptica de 30° (antes 32°): la pantalla queda del mismo tamaño en el cuadro
  const STAY = { th: 0.16, d0: 9.45, d1: 8.6, ph0: 0.07, ph1: 0.045 };
  const stayPose = (k, s, out) => orbit(k, sgn(k) * lerp(-STAY.th, STAY.th, sineIO(s)), lerp(STAY.ph0, STAY.ph1, s), lerp(STAY.d0, STAY.d1, sineIO(s)), out);
  const relayCurves = [];
  function buildKeys() {
    relayCurves.length = 0;
    for (let k = 0; k < N - 1; k++) {
      const p0 = stayPose(k, 1, V()), p1 = stayPose(k + 1, 0, V());
      const m = relays[k].mid.clone(); m.y += 1.1; m.z += 5.6;
      const pm = p0.clone().lerp(p1, 0.5).lerp(m, 0.55);
      relayCurves.push({
        pos: new THREE.CatmullRomCurve3([p0.clone().add(p0.clone().sub(pm).multiplyScalar(0.3)), p0, pm, p1, p1.clone().add(p1.clone().sub(pm).multiplyScalar(0.3))], false, 'centripetal'),
        tgt: new THREE.CatmullRomCurve3([centers[k], relays[k].mid, centers[k + 1]], false, 'centripetal'),
      });
    }
  }
  function setEnd(P, L) { const inv = group.matrix.clone().invert(); endP.copy(P).applyMatrix4(inv); endL.copy(L).applyMatrix4(inv); }

  const st = { P: V(), T: V(), shift: 0, roll: 0, swayT: 0, swayP: 0, u: 0, mode: '' };
  const tA = V(), tB = V(), tC = V(), tD = V(), tJ = V();
  /** pose de la vitrina para u (≤ GAL_END): escribe outP/outL en coordenadas del pasillo */
  function pose(u, t, outP, outL) {
    st.u = u;
    let P = tA, T = tB, shift = 0, roll = 0;
    const d0 = D[0][0];
    if (u < d0) {
      const e = easeIO(range(u, GAL_ABOUT_OUT + 0.03, d0));
      stayPose(0, 0, tC);
      P.copy(aboutP).lerp(tC, e); P.y += Math.sin(Math.PI * e) * 0.22;
      T.copy(aboutL).lerp(centers[0], easeIO(range(u, GAL_ABOUT_OUT + 0.03, d0 - 0.15)));
      shift = shiftOf(0) * sm(range(u, GAL_ABOUT_OUT + 0.15, d0 - 0.1));
      st.mode = 'enter';
    } else if (u > LAST_OUT) {
      const x = range(u, LAST_OUT, GAL_END);
      const s = easeIO(x);
      stayPose(N - 1, 1, tC);
      const mid = tD.set(exitJoinX + 3.5, 1.3, 4.8);
      if (s < 0.5) P.copy(tC).lerp(mid, easeIO(s * 2)); else P.copy(mid).lerp(endP, easeIO(s * 2 - 1));
      tJ.set(exitJoinX, 0.3, 0);
      if (s < 0.5) T.copy(centers[N - 1]).lerp(tJ, easeIO(s * 2)); else T.copy(tJ).lerp(endL, easeIO(s * 2 - 1));
      shift = shiftOf(N - 1) * (1 - sm(range(x, 0.05, 0.55)));
      roll = Math.sin(Math.PI * s) * -0.04;
      st.mode = 'exit';
    } else {
      let k = 0; while (k < N - 1 && u > D[k][1]) k++;
      if (u >= D[k][0]) {
        const s = range(u, D[k][0], D[k][1]);
        stayPose(k, s, P); T.copy(centers[k]); shift = shiftOf(k); st.mode = 'stay' + k;
      } else {
        const j = k - 1, x = range(u, D[j][1], D[k][0]), s = easeIO(x);
        relayCurves[j].pos.getPoint(s, P);
        relayCurves[j].tgt.getPoint(easeIO(range(x, 0.05, 0.92)), T);
        shift = lerp(shiftOf(j), shiftOf(k), sm(range(x, 0.3, 0.88)));
        roll = Math.sin(Math.PI * s) * 0.06 * sgn(j);
        st.mode = 'relay' + k;
      }
    }
    // respiración lenta (la de la maqueta, un poco más calma) + steadicam: un temblor casi imperceptible
    // (con prefers-reduced-motion, nada: la cámara queda en su pose)
    const drift = RM ? 0 : 1 - sm(range(u, LAST_OUT + 0.2, GAL_END));
    const swayT = Math.sin(t * 0.19) * 0.026 * drift, swayP = Math.sin(t * 0.14 + 1.3) * 0.013 * drift, swayD = Math.sin(t * 0.11) * 0.12 * drift;
    st.swayT = swayT; st.swayP = swayP;
    const v = tC.copy(P).sub(T), len = v.length();
    if (len > 1e-4) {
      v.applyAxisAngle(V(0, 1, 0), swayT);
      const right = tD.set(0, 1, 0).cross(v).normalize();
      v.applyAxisAngle(right, -swayP);
      v.multiplyScalar((len + swayD * Math.min(1, len / 8)) / len);
      P = tA.copy(T).add(v);
    }
    if (drift > 0) {
      const sh = 0.0032 * drift;
      P.x += (Math.sin(t * 1.73) + Math.sin(t * 2.91 + 1.2) * 0.5) * sh;
      P.y += (Math.sin(t * 2.17 + 0.4) + Math.sin(t * 3.37 + 2.1) * 0.5) * sh * 0.8;
      T.x += Math.sin(t * 1.31 + 2.0) * sh * 0.6; T.y += Math.sin(t * 1.59 + 0.7) * sh * 0.5;
    }
    st.P.copy(P); st.T.copy(T); st.shift = shift; st.roll = roll;
    outP.copy(P).applyMatrix4(group.matrix);
    outL.copy(T).applyMatrix4(group.matrix);
    dustFocus.value = len;
  }

  /* ---------- máscaras de pantalla (hasta dos), en screenUV (0,0 arriba a la izquierda) ---------- */
  const corners = [V(), V(), V(), V()];
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

  /* ---------- sonido (sólo con el interruptor): golpe del cenital, clic de bisagra; zumbido en la estadía ---------- */
  const sound = { hum: false };

  /** Estado de la vitrina para u: notebooks, luz, señal, nombres, lente, máscaras. Corre después de fijar la cámara. */
  const tmpT = V();
  function update(u, t, dt, gw) {
    const on = u < GAL_END + 0.05;
    group.visible = on && gw > 0.0005;
    voidW.value = gw * (1 - sm(range(u, LAST_OUT + 0.2, GAL_END)));
    if (!group.visible) {
      MQ[0].on.value = 0; MQ[1].on.value = 0; setLens(0); spot.intensity = 0;
      if (sound.hum) { sound.hum = false; loopSound('hum', false); }
      return;
    }
    camL.value.copy(camera.position); group.worldToLocal(camL.value);
    const rdt = Math.min(dt, 1 / 20);

    let stage = 0, active = -1;
    laps.forEach((lap, k) => {
      // horario (scroll): llega, la luz se enciende, abre la tapa, enciende la pantalla (antes de que llegue el texto)
      let lidA, pw, arrive = 1, want;
      const T0 = k > 0 ? range(u, D[k - 1][1], D[k][0]) : 0;
      if (k === 0) {
        want = u >= VIT_OPEN[0] - 0.02;
        lidA = easeIO(range(u, ...VIT_OPEN));
        pw = easeIO(range(u, ...VIT_POWER));
      } else {
        arrive = quartOut(range(T0, 0.18, 0.56));
        want = T0 >= 0.5;
        lidA = easeIO(range(T0, 0.5, 0.72));
        pw = easeIO(range(T0, 0.66, 0.8));
      }
      const T1 = k < N - 1 ? range(u, D[k][1], D[k + 1][0]) : range(u, D[k][1], GAL_END);
      // se va: la tapa se cierra y la luz se corta (la pantalla era la luz)
      if (T1 > 0.02) want = false;
      lidA *= 1 - easeIO(range(T1, 0.0, k < N - 1 ? 0.24 : 0.3));
      // luz real, en tiempo real: golpe de lámpara al encender; al apagar cae en ~0,4 s (corte, no fundido)
      if (want && !lap.on) { lap.on = true; lap.onT0 = t; if (gw > 0.5) playSound('spot', { minGap: 400 }); }
      if (!want && lap.on) { lap.on = false; }
      if (lap.on) lap.light = RM ? 1 : Math.min(flicker(t - lap.onT0), 1);
      else lap.light = lap.light < 0.004 ? 0 : lap.light * Math.exp(-rdt / 0.085);
      lap.nb.setLight(lap.light);
      lap.u.pw.value = pw;
      // la línea roja del canto y la bisagra: se enciende con la señal que llega; queda tenue en la estadía
      const arriveSig = k === 0 ? range(u, VIT_TRACE[1] - 0.12, VIT_OPEN[0]) : range(T0, 0.4, 0.52);
      const spark = T1 > 0 ? Math.exp(-Math.pow((T1 - 0.06) / 0.05, 2)) : 0;
      lap.u.rim.value = (sm(arriveSig) * (0.35 + 0.65 * Math.exp(-Math.pow((arriveSig - 0.9) / 0.2, 2))) * (1 - sm(range(T1, 0.04, 0.2)))) + spark;
      // clic de bisagra al cerrarse
      if (lap.lastLid > 0.06 && lidA <= 0.06 && T1 > 0 && gw > 0.5) playSound('hinge', { minGap: 300 });
      lap.lastLid = lidA;
      lap.lidA = lidA;
      lap.hinge.rotation.x = lerp(CLOSED, OPEN, lidA);
      // llega girando desde la profundidad (en la oscuridad: se ve cuando la luz lo encuentra)
      const away = 1 - arrive, spin = (k % 2 === 0 ? -1 : 1) * 1.0 * away;
      lap.outer.position.copy(lap.home).add(tmpW.set(0, -0.3 * away, -6.5 * away).applyAxisAngle(V(0, 1, 0), lap.yaw));
      lap.outer.rotation.y = lap.yaw + spin;
      const vis = (k === 0 ? u > 0.5 : T0 > 0.12) && (T1 < 1 || lap.light > 0.004);
      lap.outer.visible = vis;
      if (vis) lap.nb.syncScreen();
      // nombre gigante: a contraluz, se desliza al revés de la órbita; cae con la luz
      const w = words[k];
      const stayS = range(u, D[k][0], D[k][1]);
      w.op.value = 0.009 * lap.light * sm(range(k === 0 ? u : T0, k === 0 ? 1.0 : 0.6, k === 0 ? 1.45 : 0.95));
      w.mesh.position.set(w.base.x - sgn(k) * (sineIO(stayS) - 0.5) * 1.2, w.base.y, w.base.z);
      beams[k].op.value = 0.034 * lap.light;
      beams[k].mesh.visible = vis && lap.light > 0.004;
      beams[k].mesh.quaternion.copy(camera.quaternion);
      if (lap.light > stage) { stage = lap.light; active = k; }
    });
    stageU.value = stage;
    // el cenital sigue a la notebook encendida
    if (active >= 0) {
      const c = centers[active];
      spot.position.set(c.x + 0.4, c.y + 6.4, c.z + 1.1);
      spot.target.position.copy(c);
      spot.intensity = 62 * stage;
    } else spot.intensity = 0;
    // el cenital queda siempre en la escena (intensidad 0 = apagado): sacarlo cambiaría la cuenta de luces y obligaría
    // a recompilar los materiales en pleno scroll
    dustI.value = stage;

    // la recta viajera: sale del canto, cruza el vacío a oscuras y entra por la bisagra de la siguiente
    relays.forEach((R, k) => {
      const T = range(u, D[k][1], D[k + 1][0]);
      const hd = R.len * easeIO(range(T, 0.06, 0.5));
      R.r.u.s1.value = hd; R.r.u.s0.value = Math.max(0, hd - 6.5);
      R.r.u.head.value = T < 0.5 ? 1 : 0.2;
      R.r.u.inten.value = T > 0.04 ? 1 - sm(range(T, 0.5, 0.62)) : 0;
      R.r.mesh.visible = R.r.u.inten.value > 0.001;
    });
    // salida: la última pantalla se apaga en la línea, que corre hacia la recta del pasillo
    if (exit) {
      const X = range(u, LAST_OUT, GAL_END);
      const hd = exit.len * easeIO(range(X, 0.12, 0.56));
      exit.u.s1.value = hd; exit.u.s0.value = Math.max(0, hd - 7);
      exit.u.head.value = X < 0.56 ? 1 : 0.2;
      exit.u.inten.value = X > 0.1 ? 1 - sm(range(X, 0.62, 0.8)) : 0;
      exit.mesh.visible = exit.u.inten.value > 0.001;
    }

    // zumbido grave en la estadía (sólo con el interruptor; sound.ts lo ignora apagado)
    const humWant = gw > 0.5 && /^stay/.test(st.mode) && stage > 0.9 && S.inView && !document.hidden;
    if (humWant !== sound.hum || humWant) { sound.hum = humWant; loopSound('hum', humWant); }

    setLens(st.shift);
    if (st.roll) { camera.rotateZ(st.roll); camera.updateMatrixWorld(); }
    poolX.value = 0.5 + st.shift * 0.88;

    camera.updateMatrixWorld();
    let slot = 0;
    for (const lap of laps) {
      if (slot > 1) break;
      if (!lap.outer.visible || lap.u.pw.value * lap.light <= 0.001 || lap.lidA < 0.5) continue;
      projectScreen(lap, slot++);
    }
    for (; slot < 2; slot++) MQ[slot].on.value = 0;
    void tmpT;
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

  function exitHead(u) {
    if (u <= LAST_OUT) return null;
    const X = range(u, LAST_OUT, GAL_END);
    const a = easeIO(range(X, 0.54, 0.97));
    return { z: lerp(railZOf(exitJoinX), railStop + 0.15, a), joinZ: railZOf(exitJoinX), k: sm(range(X, 0.5, 0.6)) };
  }
  /** la recta del About se recoge hasta el pie de TraumaVision y se apaga cuando el cenital la encuentra */
  function railWindow(u) {
    const q = easeIO(range(u, ...VIT_TRACE));
    const b0 = railZOf(-CW), b1 = railZOf(CW);
    return { a: lerp(railStop - 2, b0, q), b: lerp(b1 + 40, b1, q), k: 1 - sm(range(u, VIT_OPEN[0] - 0.06, VIT_OPEN[0] + 0.12)) };
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
      const px = RM ? 0 : -(mouse.x * 10) - sgn(k) * (sineIO(s) - 0.5) * 40 - st.swayT * 140;
      const py = RM ? 0 : -mouse.y * 6 + st.swayP * 120;
      const x = side < 0 ? pad : innerWidth - pad - w;
      const y = Math.max(96, (innerHeight - h) / 2 + 22);
      el.style.transform = `translate3d(${(x + px).toFixed(1)}px, ${(y + py).toFixed(1)}px, 0)`;
    }
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(mx, my, active) {
    if (active < 0 || S.neg.open >= 0) return -1;
    const lap = laps[active];
    if (!lap.outer.visible || lap.u.pw.value * lap.light < 0.9) return -1;
    ndc.set(mx, -my);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(lap.screen, false).length ? active : -1;
  }

  /** fuera de Projects (la galería cerrada no llama a update): apaga el zumbido */
  function idle() { if (sound.hum) { sound.hum = false; loopSound('hum', false); } }

  let saved = null;
  function warm(v) {
    const objs = [group, spot, ...laps.map((l) => l.outer), ...beams.map((b) => b.mesh), ...relays.map((r) => r.r.mesh), ...(exit ? [exit.mesh] : [])];
    if (v) { saved = objs.map((o) => o.visible); objs.forEach((o) => { o.visible = true; }); spot.intensity = 1; }
    else if (saved) { objs.forEach((o, i) => { o.visible = saved[i]; }); saved = null; spot.intensity = 0; }
  }

  return {
    group, place, setEnd, pose, update, placeTags, pick, warm, idle, maskNode, bgNode, voidW, stageU, exitHead, railWindow, texs,
    info: () => ({ vit: st.mode, shift: +st.shift.toFixed(3), lid: laps.map((l) => +l.lidA.toFixed(2)), light: laps.map((l) => +l.light.toFixed(2)), pw: laps.map((l) => +l.u.pw.value.toFixed(2)), tex: scrTex.map((t) => t.image.width), env: !!env }),
  };
}
