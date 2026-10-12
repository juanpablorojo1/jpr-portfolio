/* Frame by Frame «Tambor 360» dentro de la escena persistente «Señal» (U3, 2026-10-12). Port de la maqueta A de la
   sección de videos (clients/jpr-portfolio/maquetas/2026-10-12-videos/a/), elegida por Juan («A»). Reemplaza a la sala
   de proyección (U4); la galería 360 de u2-galeria360 no se usa (Juan: «No me gusta»).

   Un tambor de cinco pantallas LED (una por video, 9:16, en el orden fijo de Juan) sobre un zócalo de aluminio grafito,
   en el vacío. La línea roja con la que se cierra la última laptop de Projects corre por el piso desde el umbral, sube
   por el zócalo y se abre en el anillo rojo de la base; las caras se encienden desde el anillo hacia arriba. El tambor
   gira SÓLO si el usuario lo pide (S.fbf.rot lo escribe VideosStage.tsx: flechas, ← →, arrastre) y da la vuelta
   completa. La cara de frente queda casi de frente (órbita ±4°) y grande; las vecinas se ven de canto, así que a mitad
   de un giro hay dos caras a ±36° y nunca un hueco en el centro. Al girar, la cámara se aleja y sube un poco y vuelve.
   El video horizontal (comparación de modelos) sale de su cara y se abre a 16:9 delante del tambor.
   Haz rojo tenue (Juan: «(a) Tenue») desde arriba y adelante: al salir se descompone en los puntos de Stack.

   Nitidez (el «se ve borroso» de Juan): cada cara es un MeshBasic con el video como textura común (no VideoTexture) con
   mipmaps + anisotropía 16, sRGB, sin niebla ni tone mapping; corridor.js la saca del post (DOF, bloom, viñeta, grano)
   con `maskNode` (los cuadros de las caras visibles, proyectados en cada frame). Lo blando vive en el reflejo, el halo
   y el polvo. Videos: <video> fuera del DOM, mudos (sonido sólo con el toggle), src recién cuando su cara puede
   llegar al frente (el navegador los trae por rangos: nunca los cinco enteros); corre sólo el de frente (y el que
   llega, en un giro), con la escena a la vista, la pestaña visible y sin pausa del usuario.

   Todo en coordenadas del pasillo (hijo de `group`, como antes la sala). Interfaz igual a la de la sala para que
   corridor.js y scene.js no cambien: pose, calm, update, placeTags, pick, pauseAll, warm, lampK, info; + maskNode. */
import * as THREE from 'three/webgpu';
import {
  uniform, texture, uv, vec2, vec3, float, smoothstep, exp, abs, mix, length, max, min, step, screenUV,
  positionLocal, positionWorld, cameraPosition, distance, normalize, cross, attribute, instancedBufferAttribute, time, sin, cos, dot, clamp
} from 'three/tsl';
import { GAL_END, GAL_DWELLS } from './gallery';
import { FBF_RUN, FBF_BEAM, FBF_STAY, FBF_OFF, FBF_END, FBF_DRUM } from './frames';
import { VIDEOS } from '../../../lib/content';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const range = (x, a, b) => clamp01((x - a) / (b - a));
const sm = (x) => x * x * (3 - 2 * x);
const smooth = (a, b, x) => sm(range(x, a, b));
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const easeIO = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
const mod = (a, n) => ((a % n) + n) % n;
const N = VIDEOS.length;
const LAST_OUT = GAL_DWELLS[GAL_DWELLS.length - 1][1];

/* ---------- el tambor (metros del pasillo) ---------- */
const H = FBF_DRUM.h, W = FBF_DRUM.w, Y0 = FBF_DRUM.base;
const STEP = (Math.PI * 2) / N;
const AP = W / (2 * Math.tan(Math.PI / N));        // apotema
const R = W / (2 * Math.sin(Math.PI / N));          // radio a las aristas
const FZ = FBF_DRUM.frontZ, ZC = FZ - AP;            // cara de frente / eje del tambor
const LAMP = V(0, 3.6, FZ + 5.1);                    // de dónde baja el haz (network.js arma la nube entre esto y la cara)
const FILL = 0.7;                                    // la cara de frente: ~70 % del alto del cuadro (≈ 630 px a 1440×900)

/** Arma el tambor. Devuelve el controlador o null si se desmontó a mitad. */
export async function buildProjector({
  group, toL, RED, OFF, appear, S, ctl, prep, yieldToMain, withFog, lightAt, metalMat, housingMat,
  headPos, headI, scrPos, scrI, endP, endL, railHeadZ, focusU, rangeU,
}) {
  const alive = () => !ctl.disposed && !S.dead;
  const RM = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hall = new THREE.Group();
  hall.name = 'fbf-hall';                            // network.js oculta sus grupos hijos cuando arranca Stack
  hall.visible = false;
  group.add(hall);
  const camL = uniform(new THREE.Vector3());         // cámara en coordenadas del pasillo (cintas y haz miran a cámara)
  const texs = [];
  const sharp = (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 16;
    t.needsUpdate = true; texs.push(t); ctl.texs.push(t); return t;
  };

  /* ---------- pósters (las texturas hasta que el video tiene su primer cuadro) ---------- */
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const posters = await Promise.all(VIDEOS.map((v) => loadImg(v.poster)));
  if (!alive()) return null;
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- materiales del objeto: grafito que toma la luz del pasillo (la señal roja, el video encendido) ---------- */
  const graphite = new THREE.MeshBasicNodeMaterial();
  graphite.colorNode = withFog(lightAt(toL(positionWorld)).mul(0.24).add(float(0.0042)), 0.4).mul(appear);
  const bezelM = new THREE.MeshBasicNodeMaterial();
  bezelM.colorNode = withFog(lightAt(toL(positionWorld)).mul(0.08).add(float(0.0016)), 0.4).mul(appear);

  const root = new THREE.Group();
  root.position.set(0, 0, ZC);
  hall.add(root);
  const drum = new THREE.Group();                    // gira con S.fbf.rot
  root.add(drum);
  // zócalo y tapa (prisma de 5 lados alineado con las caras)
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.06, Y0, N, 1, false, Math.PI / N), graphite);
  plinth.position.y = Y0 / 2; drum.add(plinth);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.06, N, 1, false, Math.PI / N), graphite);
  cap.position.y = Y0 + H + 0.03; drum.add(cap);
  for (let k = 0; k < N; k++) {
    const a = k * STEP + STEP / 2;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.045, H + 0.02, 0.045), graphite);
    p.position.set(Math.sin(a) * (R + 0.004), Y0 + H / 2, Math.cos(a) * (R + 0.004)); p.rotation.y = a;
    drum.add(p);
  }

  /* ---------- una cara: pantalla, bisel, anillo, reflejo y halo ---------- */
  function screenMat(tex, cropW, u) {
    const st = uv().sub(0.5).mul(vec2(u.cropW, u.cropH)).add(vec2(0.5, u.offY.add(0.5)));
    const tn = texture(tex, st);
    const m = new THREE.MeshBasicNodeMaterial();
    m.colorNode = tn.rgb.mul(u.dim).add(vec3(u.lift)).mul(appear);
    u.cropW.value = cropW;
    return { m, tn };
  }
  function reflMat(tex, u) {
    const st = vec2(uv().x, float(1).sub(uv().y)).sub(0.5).mul(vec2(u.cropW, u.cropH)).add(vec2(0.5, u.offY.add(0.5)));
    const tn = texture(tex, st).level(3.6);
    // aditivo y sin prueba de profundidad: se dibuja sobre el piso de puntos (el piso es opaco y lo taparía)
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const fade = smoothstep(0.5, 1.0, uv().y);
    m.colorNode = tn.rgb.mul(fade).mul(u.refl).mul(appear);
    m.opacityNode = float(1);
    return { m, tn };
  }
  function haloMat(tex, u, spread) {
    const tn = texture(tex, vec2(0.5, 0.5)).level(11);
    const avg = tn.rgb;
    const p = uv().sub(0.5).mul(2);
    const d = length(max(abs(p).sub(vec2(1 / spread, 1 / spread)), 0).mul(spread));
    // caída gaussiana y ventana que llega a cero en el borde del plano: sin rectángulo visible (la costura de la maqueta)
    const edge = float(1).sub(smoothstep(0.55, 1.0, abs(p.x))).mul(float(1).sub(smoothstep(0.55, 1.0, abs(p.y))));
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    m.colorNode = avg.mul(exp(d.mul(d).mul(-3.2)).mul(edge)).mul(u.halo).mul(appear);
    m.opacityNode = float(1);
    return { m, tn };
  }
  const mkU = () => ({ dim: uniform(1), cropW: uniform(1), cropH: uniform(1), offY: uniform(0), lift: uniform(0), refl: uniform(0), halo: uniform(0) });

  const faces = VIDEOS.map((vd, k) => {
    const th = k * STEP;
    const g = new THREE.Group();
    g.position.set(Math.sin(th) * AP, Y0 + H / 2, Math.cos(th) * AP); g.rotation.y = th;
    drum.add(g);
    const land = vd.width > vd.height;
    const cropW = land ? (W / H) / (vd.width / vd.height) : 1;    // la cara muestra el centro del 16:9
    const poster = sharp(new THREE.Texture(posters[k]));
    const u = mkU();
    const sc = screenMat(poster, cropW, u);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(W, H), sc.m);
    scr.position.z = 0.012; g.add(scr);
    const bz = new THREE.Mesh(new THREE.BoxGeometry(W + 0.03, H + 0.03, 0.03), bezelM);
    bz.position.z = -0.006; g.add(bz);
    // anillo: el tramo de la base de esta cara (se enciende desde la arista más cercana al frente)
    const ring = { a: uniform(0.5), b: uniform(0.5), inten: uniform(0) };
    const rm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    {
      const x = uv().x, y = abs(uv().y.sub(0.5)).mul(2);
      const win = smoothstep(ring.a.sub(0.012), ring.a, x).mul(float(1).sub(smoothstep(ring.b, ring.b.add(0.012), x)));
      const core = exp(y.mul(y).mul(-9));
      rm.colorNode = RED.mul(core.mul(2.4)).add(vec3(1, 0.86, 0.84).mul(core.mul(core).mul(0.25))).mul(win).mul(ring.inten).mul(appear);
      rm.opacityNode = float(1);
    }
    const ringM = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.05, 0.02), rm);
    ringM.position.set(0, -H / 2 - 0.012, 0.03); ringM.renderOrder = 6; g.add(ringM);
    const rf = reflMat(poster, u);
    const refl = new THREE.Mesh(new THREE.PlaneGeometry(W, H), rf.m);
    refl.position.set(0, -2 * (Y0 + H / 2), 0.012); refl.renderOrder = -1; g.add(refl);
    const hl = haloMat(poster, u, 2.3);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.3, H * 2.3), hl.m);
    halo.position.z = -0.45; halo.renderOrder = 1; g.add(halo);
    return { k, vd, land, g, scr, u, nodes: [sc.tn, rf.tn, hl.tn].filter(Boolean), halo, ring, front: 0, facing: 0, pw: 0, cropW };
  });

  /* ---------- la cara horizontal: sale del tambor y se abre a 16:9 delante ---------- */
  const WIDE = faces.find((f) => f.land) || null;
  let wide = null;
  if (WIDE) {
    const asp = WIDE.vd.width / WIDE.vd.height;
    const H2 = H * 0.86, W2 = H2 * asp;
    const u = mkU();
    const sc = screenMat(WIDE.nodes[0].value, 1, u);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sc.m);
    scr.renderOrder = 3; WIDE.g.add(scr);
    const bz = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bezelM);
    WIDE.g.add(bz);
    const rf = reflMat(WIDE.nodes[0].value, u);
    const refl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), rf.m);
    refl.renderOrder = -1; WIDE.g.add(refl);
    WIDE.nodes.push(sc.tn, rf.tn);
    wide = { u, scr, bz, refl, H2, W2, asp, e: 0 };
  }
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- la señal: del final del riel, por el piso, sube por el zócalo hasta el anillo ---------- */
  function makeRibbon(points, { width = 0.05, core = 0.11, glow = 0.55, near = [0.5, 2.6] } = {}) {
    const segs = points.length - 1;
    const pos = new Float32Array(segs * 4 * 3), tan = new Float32Array(segs * 4 * 3), side = new Float32Array(segs * 4), sv = new Float32Array(segs * 4);
    const idx = [];
    let s = 0;
    const t = new THREE.Vector3();
    for (let i = 0; i < segs; i++) {
      const a = points[i], b = points[i + 1];
      t.subVectors(b, a); const len = t.length(); t.normalize();
      const base = i * 4;
      [[a, -1, s], [a, 1, s], [b, -1, s + len], [b, 1, s + len]].forEach(([p, sd, ss], j) => {
        pos.set([p.x, p.y, p.z], (base + j) * 3); tan.set([t.x, t.y, t.z], (base + j) * 3); side[base + j] = sd; sv[base + j] = ss;
      });
      idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      s += len;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aTan', new THREE.BufferAttribute(tan, 3));
    geo.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    geo.setAttribute('aS', new THREE.BufferAttribute(sv, 1));
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    const u = { s0: uniform(0), s1: uniform(0), inten: uniform(0), head: uniform(1) };
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const aTan = attribute('aTan', 'vec3'), aSide = attribute('aSide', 'float'), aS = attribute('aS', 'float');
    const n = normalize(cross(aTan, normalize(camL.sub(positionLocal))));
    m.positionNode = positionLocal.add(n.mul(aSide).mul(width));
    const x = abs(aSide);
    const coreP = exp(x.mul(x).div(core * core * 2).negate());
    const glowP = exp(x.mul(4.2).negate()).mul(glow).mul(float(1).sub(x));
    const win = smoothstep(u.s0, u.s0.add(0.25), aS).mul(float(1).sub(smoothstep(u.s1.sub(0.015), u.s1, aS)));
    const headF = exp(u.s1.sub(aS).max(0).mul(-2.2)).mul(u.head);
    const nearF = smoothstep(near[0], near[1], distance(positionLocal, camL));
    const I = win.mul(u.inten).mul(nearF).mul(appear);
    m.colorNode = RED.mul(glowP.add(coreP.mul(1.6))).add(vec3(1, 0.86, 0.84).mul(coreP.mul(coreP).mul(float(0.55).add(headF.mul(1.4)))))
      .add(RED.mul(headF.mul(glowP).mul(1.2))).mul(I);
    m.opacityNode = float(1);
    const mesh = new THREE.Mesh(geo, m);
    mesh.frustumCulled = false; mesh.renderOrder = 20;
    hall.add(mesh);
    return { mesh, u, length: s };
  }
  const LZ0 = railHeadZ, LZ1 = FZ + 0.07;
  const linePts = [];
  for (let z = LZ0; z > LZ1; z -= 0.5) linePts.push(V(0, 0.03, z));
  linePts.push(V(0, 0.03, LZ1), V(0, Y0 - 0.012, LZ1 - 0.02));
  const line = makeRibbon(linePts, { width: 0.05 });
  const RUN_LEN = line.length;
  const pathAt = (s, out) => {
    const flat = LZ0 - LZ1;
    if (s <= flat) return out.set(0, 0.03, LZ0 - s);
    return out.set(0, 0.03 + Math.min(1, (s - flat) / (RUN_LEN - flat)) * (Y0 - 0.04), LZ1);
  };

  /* ---------- haz rojo tenue: de arriba y adelante hacia la cara de frente (cinta ancha que mira a cámara) ---------- */
  const beamI = uniform(0);
  const bA = uniform(LAMP.clone()), bB = uniform(V(0, Y0 + H * 0.78, FZ + 0.2));
  {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    geo.setAttribute('aEnd', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 1]), 1));
    geo.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array([-1, 1, -1, 1]), 1));
    geo.setIndex([0, 2, 1, 1, 2, 3]);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const e = attribute('aEnd', 'float'), sd = attribute('aSide', 'float');
    const P = mix(bA, bB, e);
    const dir = normalize(bB.sub(bA));
    const n = normalize(cross(dir, normalize(camL.sub(P))));
    m.positionNode = P.add(n.mul(sd).mul(mix(float(0.06), float(1.15), e)));
    const x = abs(sd);
    const prof = exp(x.mul(x).mul(-2.6));
    // nace en la lámpara, se abre, y casi no llega a la imagen (el video no se tiñe de rojo)
    const along = smoothstep(0.0, 0.12, e).mul(float(1).sub(smoothstep(0.55, 0.95, e)));
    const motes = sin(e.mul(23.0).sub(time.mul(0.6)).add(sd.mul(5.0))).mul(0.5).add(0.5).mul(0.5).add(0.5);
    const near = smoothstep(0.8, 2.6, distance(P, camL));
    m.colorNode = RED.mul(prof.mul(along).mul(motes).mul(near).mul(beamI).mul(0.07)).mul(appear);
    m.opacityNode = float(1);
    const beam = new THREE.Mesh(geo, m);
    beam.frustumCulled = false; beam.renderOrder = 4;
    hall.add(beam);
  }

  /* ---------- polvo alrededor del tambor (lo único con bokeh): toma la luz del video y, en el haz, el rojo ---------- */
  {
    const DUST = 900;
    const dPos = new Float32Array(DUST * 3), dSeed = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      dPos[i * 3] = (Math.random() - 0.5) * 12; dPos[i * 3 + 1] = 0.1 + Math.random() * 4.6; dPos[i * 3 + 2] = FZ + 13 - Math.random() * 22;
      dSeed[i] = Math.random();
    }
    const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const base = instancedBufferAttribute(new THREE.InstancedBufferAttribute(dPos, 3));
    const seed = instancedBufferAttribute(new THREE.InstancedBufferAttribute(dSeed, 1));
    const t = time.mul(0.12).add(seed.mul(40));
    m.positionNode = base.add(vec3(sin(t).mul(0.16), cos(t.mul(0.7)).mul(0.1), sin(t.mul(0.5)).mul(0.14)));
    const ax = bB.sub(bA), len = length(ax), dir = ax.div(len);
    const sp = clamp(dot(base.sub(bA), dir).div(len), 0, 1);
    const radial = length(base.sub(bA.add(dir.mul(sp.mul(len)))));
    const inB = smoothstep(sp.mul(1.1).add(0.08), sp.mul(0.3), radial).mul(smoothstep(0.05, 0.2, sp)).mul(float(1).sub(smoothstep(0.6, 0.95, sp)));
    const near = distance(positionWorld, cameraPosition);
    m.scaleNode = seed.mul(0.013).add(0.006).mul(smoothstep(0.2, 2.2, near).mul(-0.6).add(1.6));
    const soft = float(1).sub(smoothstep(0.0, 0.5, length(uv().sub(0.5))));
    m.colorNode = lightAt(toL(positionWorld)).mul(2.0).add(RED.mul(inB.mul(beamI).mul(1.6))).add(OFF.mul(0.005));
    m.opacityNode = soft.mul(seed.mul(0.6).add(0.4)).mul(smoothstep(0.3, 0.9, near)).mul(appear);
    const dust = new THREE.Sprite(m); dust.count = DUST; dust.frustumCulled = false; dust.renderOrder = 30;
    hall.add(dust);
  }
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- videos: fuera del DOM, mudos, en loop; src recién cuando su cara puede llegar al frente ---------- */
  const vids = faces.map(() => null);
  function ensureVideo(k) {
    if (vids[k]) return vids[k];
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.preload = 'auto';
    const rec = { v, tex: null, last: -1 };
    v.addEventListener('loadeddata', () => {
      if (!alive() || rec.tex) return;
      v.width = v.videoWidth; v.height = v.videoHeight;      // la textura común toma el tamaño de estos atributos
      rec.tex = sharp(new THREE.Texture(v));
      faces[k].nodes.forEach((n) => { n.value = rec.tex; });
    });
    v.src = VIDEOS[k].src;
    v.load();                                                // explícito: fuera del DOM Chrome puede no empezar a cargar solo
    vids[k] = rec;
    return rec;
  }
  function pauseAll() { vids.forEach((r) => { if (r && !r.v.paused) r.v.pause(); }); }
  ctl.offs.push(() => {
    vids.forEach((r) => { if (!r) return; try { r.v.pause(); r.v.removeAttribute('src'); r.v.load(); } catch (e) { /* noop */ } });
    S.fbf.live = false; S.fbf.active = -1; S.fbf.hover = -1;
  });

  /* ---------- máscara: las caras visibles (y el 16:9 afuera) quedan fuera del post de corridor.js ---------- */
  const MQ = [0, 1, 2, 3].map(() => ({ q: [0, 1, 2, 3].map(() => uniform(new THREE.Vector2(-2, -2))), on: uniform(0) }));
  const cq = [V(0, 0, 0), V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)], tmpW = V(0, 0, 0);
  function projectQuad(mesh, hw, hh, slot, camera) {
    const m = MQ[slot];
    mesh.updateWorldMatrix(true, false);
    cq[0].set(-hw, hh, 0); cq[1].set(hw, hh, 0); cq[2].set(hw, -hh, 0); cq[3].set(-hw, -hh, 0);
    let ok = true;
    for (let i = 0; i < 4; i++) {
      tmpW.copy(cq[i]).applyMatrix4(mesh.matrixWorld).project(camera);
      if (tmpW.z > 1 || tmpW.z < -1) ok = false;
      m.q[i].value.set((tmpW.x + 1) / 2, (1 - tmpW.y) / 2);
    }
    m.on.value = ok ? 1 : 0;
  }
  const maskNode = (() => {
    const p = screenUV;
    const edge = (a, b) => b.x.sub(a.x).mul(p.y.sub(a.y)).sub(b.y.sub(a.y).mul(p.x.sub(a.x)));
    const inside = (m) => {
      const e0 = edge(m.q[0], m.q[1]), e1 = edge(m.q[1], m.q[2]), e2 = edge(m.q[2], m.q[3]), e3 = edge(m.q[3], m.q[0]);
      const lo = min(min(e0, e1), min(e2, e3)), hi = max(max(e0, e1), max(e2, e3));
      return max(step(0, lo), step(hi, 0)).mul(m.on);
    };
    return max(max(inside(MQ[0]), inside(MQ[1])), max(inside(MQ[2]), inside(MQ[3])));
  })();

  /* ---------- cámara: llaves en u (coordenadas del pasillo) ---------- */
  const st = { mode: '', t: 0, rot: 0, shown: 0, vel: 0, spin: 0, lampK: 1, active: -1, fadeT: -9, lastIdx: 0, head: V(0, 0.03, LZ0) };
  let KEYS = [], posCurve = null, lookCurve = null, keyFov = 0;
  const frontDist = (fov) => H / (FILL * 2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
  const FY = Y0 + H / 2;
  function buildKeys(fov) {
    const d = frontDist(fov) + AP * 0.02;
    const K = [];
    K.push([GAL_END, endP.clone(), endL.clone()]);
    // la cámara sigue a la señal, baja, por encima del riel; el tambor crece adelante
    K.push([10.5, V(0.55, 0.78, -66.5), V(0.05, 0.3, -82)]);
    K.push([10.98, V(0.35, 1.05, FZ + 17), V(0, 1.05, FZ - 0.5)]);
    // frente al tambor: la cara de frente centrada, casi de frente
    K.push([FBF_STAY[0], V(0, FY - 0.1, FZ + d), V(0, FY - 0.15, FZ), true]);
    K.push([FBF_STAY[1], V(0, FY - 0.08, FZ + d - 0.25), V(0, FY - 0.15, FZ)]);
    // salida: sube y se aleja; la mirada va a donde el haz se descompone en puntos
    K.push([FBF_OFF + 0.35, V(0.55, FY + 0.55, FZ + d + 1.1), V(0, FY + 0.6, FZ - 0.4)]);
    K.push([FBF_END, V(0.9, FY + 0.95, FZ + d + 2.0), LAMP.clone().lerp(V(0, FY, FZ), 0.55)]);
    KEYS = K;
    posCurve = new THREE.CatmullRomCurve3(K.map((x) => x[1]), false, 'centripetal');
    lookCurve = new THREE.CatmullRomCurve3(K.map((x) => x[2]), false, 'centripetal');
  }
  function keyParam(u) {
    u = Math.min(FBF_END, Math.max(GAL_END, u));
    let i = 0;
    while (i < KEYS.length - 2 && u >= KEYS[i + 1][0]) i++;
    const a = KEYS[i][0], b = KEYS[i + 1][0];
    const l = clamp01((u - a) / (b - a));
    return (i + (KEYS[i][3] ? l : easeIO(l))) / (KEYS.length - 1);
  }
  const axis = V(0, 0, 0);
  let cam = null;
  /** Pose para u > GAL_END. La primera llave es la última del pasillo. En la estadía: órbita lenta (±4°) alrededor
      del eje del tambor y, al girar, un paso atrás y arriba (se ve el objeto entero) que vuelve con damp. */
  function pose(u, camera, outP, outL) {
    cam = camera;
    if (camera.fov !== keyFov) { keyFov = camera.fov; buildKeys(camera.fov); }
    const k01 = keyParam(u);
    posCurve.getPoint(k01, outP); lookCurve.getPoint(k01, outL);
    if (RM()) return;
    const stay = smooth(FBF_STAY[0] - 0.2, FBF_STAY[0] + 0.1, u) * (1 - smooth(FBF_STAY[1], FBF_OFF + 0.2, u));
    if (stay <= 0) return;
    const yaw = (0.07 * Math.sin(st.t * 0.17) + st.vel * 0.02) * stay;
    axis.set(0, outP.y, ZC);
    outP.sub(axis).applyAxisAngle(V(0, 1, 0), yaw).add(axis);
    const back = st.spin * stay;
    outP.z += back * 1.5; outP.y += back * 0.4; outL.y -= back * 0.12;
  }
  /** deriva de la cámara viva: sale de la calma del final del pasillo (0,45); frente al tambor casi quieta (la órbita
      es la propia, alrededor del eje) y vuelve a 0,6 para Stack */
  const calm = (u) => 0.45 - 0.33 * smooth(FBF_STAY[0] - 0.4, FBF_STAY[0], u) + 0.48 * smooth(FBF_OFF, FBF_END, u);

  /* ---------- estado por frame ---------- */
  const q = V(0, 0, 0), fwd = V(0, 0, 0), wp = V(0, 0, 0), nrm = V(0, 0, 0), cd = V(0, 0, 0);
  /** Estado para u. Escribe uniforms (señal, anillo, caras, haz) y devuelve el foco, o null antes de la sección. */
  function update(u, t, dt, gw, P, L, inView) {
    st.t = t;
    const on = u > LAST_OUT + 0.1;
    hall.visible = on;
    const ready = on && gw > 0.5;
    if (!on) { st.active = -1; S.fbf.active = -1; scrI.value = 0; pauseAll(); return null; }
    camL.value.copy(P);                               // P ya está en coordenadas del pasillo (camPose)

    // giro: S.fbf.rot (continuo) lo escribe el HTML con su tween. Reduced motion: corte con fundido.
    const rm = RM();
    const want = S.fbf.rot || 0;
    if (rm) {
      const idx = Math.round(want);
      if (idx !== st.lastIdx) { st.lastIdx = idx; st.fadeT = t; }
      st.shown = idx;
    } else st.shown = want;
    const v = (st.shown - st.rot) / Math.max(dt, 1e-3);
    st.rot = st.shown;
    st.vel = damp(st.vel, Math.max(-4, Math.min(4, v)), 5, dt);
    st.spin = damp(st.spin, clamp01(Math.abs(v) / 1.6), 3.2, dt);
    drum.rotation.y = -st.rot * STEP;
    drum.rotation.z = rm ? 0 : -st.vel * 0.004;
    const fadeK = rm ? smooth(0, 0.35, t - st.fadeT) : 1;

    // la señal: corre por el piso desde el umbral y sube por el zócalo; queda una cola encendida que alimenta el anillo
    const run = easeIO(range(u, FBF_RUN[0], FBF_RUN[1]));
    const off = smooth(FBF_OFF - 0.05, FBF_OFF + 0.45, u);
    const s1 = run * RUN_LEN;
    line.u.s1.value = s1; line.u.s0.value = Math.max(0, s1 - (run < 1 ? 9 : 3.2));
    line.u.head.value = run < 1 ? 1 : 0.25;
    line.u.inten.value = (u > FBF_RUN[0] - 0.02 ? 1 : 0) * (1 - 0.35 * smooth(FBF_STAY[0], FBF_STAY[0] + 0.3, u)) * (1 - off);
    line.mesh.visible = line.u.inten.value > 0.001;
    pathAt(s1, st.head);
    st.lampK = (u < FBF_RUN[0] ? 1 : 1 - smooth(FBF_RUN[1] - 0.05, FBF_RUN[1] + 0.15, u));
    if (u > FBF_RUN[0]) {
      headPos.value.copy(st.head);
      headI.value = lerp(headI.value, 1.6 * st.lampK + 0.2, smooth(FBF_RUN[0], FBF_RUN[0] + 0.1, u));
    }

    // anillo: se abre desde el frente hacia atrás por los dos lados; las caras se encienden desde él
    const g = range(u, FBF_RUN[1] - 0.03, FBF_BEAM[0] + 0.35);
    const ringI = (1 - 0.6 * off) * (u > FBF_RUN[1] - 0.05 ? 1 : 0);
    let best = -1, bestF = -1;
    faces.forEach((f) => {
      // en el anillo, la cara k está a k pasos del frente (por el lado más corto)
      const steps = Math.min(f.k, N - f.k);
      const right = f.k > 0 && f.k <= N / 2;
      const p0 = steps === 0 ? 0 : 0.2 + (steps - 1) * 0.4, p1 = steps === 0 ? 0.2 : p0 + 0.4;
      const fill = clamp01((g - p0) / (p1 - p0));
      if (steps === 0) { f.ring.a.value = 0.5 - fill * 0.52; f.ring.b.value = 0.5 + fill * 0.52; }
      else if (right) { f.ring.a.value = -0.02; f.ring.b.value = fill * 1.04 - 0.02; }
      else { f.ring.a.value = 1.02 - fill * 1.04; f.ring.b.value = 1.02; }
      // encendido: desde el anillo hacia arriba, el frente primero; al salir se apagan hacia el anillo
      const delay = steps * 0.12;
      const pwIn = easeIO(range(u, FBF_BEAM[0] + 0.05 + delay, FBF_BEAM[1] + delay));
      const pwOut = 1 - easeIO(range(u, FBF_OFF - 0.02 + (2 - steps) * 0.06, FBF_OFF + 0.4 + (2 - steps) * 0.06));
      f.pw = Math.min(pwIn, pwOut);
      const pw = f.pw, h = Math.max(1e-4, H * pw);
      f.scr.scale.y = h / H; f.scr.position.y = -H / 2 + h / 2;
      const ch = lerp(pw, 1, 0.1); f.u.cropH.value = ch; f.u.offY.value = ch / 2 - 0.5;
      // cuánto mira a cámara (normal de la cara en el pasillo vs. dirección a la cámara)
      const a = (f.k - st.rot) * STEP;
      nrm.set(Math.sin(a), 0, Math.cos(a));
      wp.set(nrm.x * AP, FY, ZC + nrm.z * AP);
      cd.copy(P).sub(wp).normalize();
      f.facing = nrm.dot(cd);
      f.front = Math.pow(clamp01(f.facing), 3);
      f.u.dim.value = lerp(0.16, 1, sm(f.front)) * lerp(0.6, 1, pw) * fadeK;
      f.u.lift.value = (1 - pw) * 0.03 * (pw > 0.001 ? 1 : 0);
      f.u.refl.value = 0.075 * f.front * pw * fadeK;
      f.u.halo.value = 0.022 * f.front * pw;
      f.ring.inten.value = ringI * lerp(0.4, 1.1, f.front);
      f.scr.visible = pw > 0.0005;
      if (f.front > bestF) { bestF = f.front; best = f.k; }
    });

    // la cara horizontal sale cuando el usuario se queda en ella (estadía, sin arrastrar, tambor quieto)
    if (wide) {
      const near = Math.abs(st.rot - Math.round(st.rot)) < 0.03;
      const settled = mod(Math.round(st.rot), N) === WIDE.k && near && !S.fbf.drag && WIDE.pw > 0.99 && u > FBF_STAY[0] && u < FBF_STAY[1] + 0.05;
      wide.e = rm ? (settled ? 1 : 0) : damp(wide.e, settled ? 1 : 0, settled ? 2.6 : 8, dt);
      const e = sm(clamp01(wide.e));
      const sw = lerp(W, wide.W2, e), sh = lerp(H, wide.H2, e);
      const vis = wide.e > 0.002;
      wide.scr.visible = vis; wide.bz.visible = vis; wide.refl.visible = vis;
      const y = lerp(0, (wide.H2 - H) / 2 + 0.1, e), z = 0.03 + e * 0.95;
      wide.scr.scale.set(sw, sh, 1); wide.scr.position.set(0, y, z);
      wide.bz.scale.set(sw + 0.04, sh + 0.04, 0.03); wide.bz.position.set(0, y, z - 0.02);
      wide.u.cropW.value = Math.min(1, (sw / sh) / wide.asp);
      wide.u.dim.value = fadeK;
      wide.refl.scale.set(sw, sh, 1); wide.refl.position.set(0, -2 * (Y0 + H / 2) - y, z);
      wide.u.refl.value = 0.075 * e;
      WIDE.u.dim.value *= lerp(1, 0.06, e); WIDE.u.refl.value *= 1 - e; WIDE.u.halo.value *= 1 - e;
    }

    // haz tenue desde arriba (Juan: «(a) Tenue»)
    beamI.value = smooth(FBF_BEAM[0], FBF_BEAM[1] + 0.2, u) * (1 - off);

    const stayOn = u > FBF_STAY[0] - 0.12 && u < FBF_OFF;
    const active = stayOn ? mod(Math.round(st.rot), N) : -1;
    st.active = active;
    S.fbf.active = active;

    // luz del video sobre el piso, el zócalo y el polvo cercano
    const fa = faces[best >= 0 ? best : 0];
    nrm.set(Math.sin((fa.k - st.rot) * STEP), 0, Math.cos((fa.k - st.rot) * STEP));
    wp.set(nrm.x * AP, FY, ZC + nrm.z * AP);
    scrPos.value.copy(wp).addScaledVector(nrm, 0.7);
    scrI.value = fa.pw * 0.5 * fadeK;

    // videos: src cuando su cara puede llegar al frente; corre el de frente (y el que llega, en un giro)
    faces.forEach((f) => {
      const rel = Math.abs(((f.k - st.rot) % N + N + N / 2) % N - N / 2);
      if (ready && u > GAL_END - 0.4 && u < FBF_END + 0.3 && (rel < 1.5 || (u > FBF_STAY[0] - 0.3 && rel < 2.6))) ensureVideo(f.k);
      const r = vids[f.k];
      if (!r) return;
      const play = ready && inView && !document.hidden && !S.fbf.paused && f.pw > 0.3 && f.front > 0.45 && u < FBF_OFF + 0.2;
      if (play && r.v.paused) r.v.play().catch(() => {});
      else if (!play && !r.v.paused) r.v.pause();
      r.v.muted = !(S.fbf.sound && f.k === active);
      // sube un cuadro nuevo sólo cuando cambia (sin depender de requestVideoFrameCallback fuera del DOM)
      if (r.tex && r.v.readyState >= 2 && r.v.currentTime !== r.last) { r.last = r.v.currentTime; r.tex.needsUpdate = true; }
    });

    // foco: viajando, la señal; frente al tambor, el post sin DOF (rango enorme); al final, los puntos
    fwd.copy(L).sub(P).normalize();
    let mode, fT, rT;
    if (u < FBF_RUN[1]) { mode = 'fbf-run'; fT = q.copy(st.head).sub(P).dot(fwd); rT = 9; }
    else if (u > FBF_OFF + 0.1) { mode = 'fbf-end'; fT = q.copy(LAMP).lerp(V(0, FY, FZ), 0.6).sub(P).dot(fwd); rT = 7; }
    else { mode = 'fbf-drum'; fT = q.set(0, FY, FZ).sub(P).dot(fwd); rT = 400; }
    st.mode = mode;
    projectMask();
    return { mode, fT, rT };
  }

  /** máscara: las caras que miran a cámara (hasta 3) y el 16:9 afuera. En update, con la cámara ya puesta (scene.js
      llama a corridor.update después de ubicarla): la máscara es la del mismo frame que se dibuja. */
  function projectMask() {
    let slot = 0;
    if (cam && hall.visible) {
      drum.updateWorldMatrix(true, true);
      const vis = faces.filter((f) => f.scr.visible && f.facing > 0.02 && f.pw > 0.001).sort((a, b) => b.facing - a.facing);
      for (const f of vis) { if (slot > 2) break; projectQuad(f.scr, W / 2, H / 2, slot++, cam); }
      if (wide && wide.scr.visible) projectQuad(wide.scr, 0.5, 0.5, 3, cam); else MQ[3].on.value = 0;
    } else MQ[3].on.value = 0;
    for (; slot < 3; slot++) MQ[slot].on.value = 0;
  }
  /** Sin rótulos sobre las pantallas (Juan: «sin explicarlos»). */
  function placeTags() {}

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  /** cara de frente bajo el puntero (-1 si no): el clic pausa o reanuda (VideosStage.tsx) */
  function pick(mx, my, camera) {
    if (st.active < 0) return -1;
    ndc.set(mx, -my);
    ray.setFromCamera(ndc, camera);
    const targets = [faces[st.active].scr];
    if (wide && wide.scr.visible && st.active === (WIDE && WIDE.k)) targets.push(wide.scr);
    return ray.intersectObjects(targets, false).length ? st.active : -1;
  }

  /** precalentado (corridor.warm): todo visible para que compileAsync lo incluya */
  let saved = null;
  function warm(v) {
    const objs = [hall, line.mesh, ...faces.map((f) => f.scr), ...(wide ? [wide.scr, wide.bz, wide.refl] : [])];
    if (v) { saved = objs.map((o) => o.visible); objs.forEach((o) => { o.visible = true; }); }
    else if (saved) { objs.forEach((o, i) => { o.visible = saved[i]; }); saved = null; }
  }
  void housingMat; void metalMat; void prep; void focusU; void rangeU; void cameraPosition;

  return {
    pose, calm, update, placeTags, pick, pauseAll, warm, maskNode,
    lampK: () => st.lampK,
    info: () => ({
      fbf: st.mode, rot: +st.rot.toFixed(2), active: st.active, spin: +st.spin.toFixed(2),
      pw: faces.map((f) => +f.pw.toFixed(2)), wide: wide ? +wide.e.toFixed(2) : 0,
      vids: vids.map((r) => (r ? (r.tex ? (r.v.paused ? 'paused' : 'playing') : 'loading') : '-')),
    }),
  };
}
