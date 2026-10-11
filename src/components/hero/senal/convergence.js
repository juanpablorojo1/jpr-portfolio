/* Contact «la convergencia» dentro de la escena persistente «Señal» (U7, 2026-10-11).
   Experience termina en un punto rojo que late debajo de las tres derivaciones del electrocardiograma. Acá ese punto
   es el destino de todo el recorrido: las líneas de cada sección llegan de la oscuridad y convergen en él.
   - la traza del hero (con sus complejos, que se calman al acercarse), el riel del About, el riel del pasillo de
     Projects (desde el fondo), el haz del proyector de Frame by Frame (recto, desde arriba), la rama de la red de
     Stack (con sus ramitas), el polvo del haz (punteado), y hilos sin nombre que dan volumen;
   - las tres derivaciones de Experience ya bajan al punto desde arriba (ecg.js, que sigue visible).
   Cada línea lleva un pulso que viaja hacia el punto y llega en el pico R del reloj del hero (S.T_R0 + k·S.PERIOD):
   el punto late con S.pulse cuando llegan todos. Luz escasa: las líneas son tenues, el rojo se junta en el punto.

   El punto es el CTA de Contact: el HTML (ContactStage.tsx) pone el enlace encima. Esta escena escribe su proyección
   en el mismo frame del render (S.ctc.dot) y lee el hover / press del enlace (S.ctc.hover / S.ctc.press).

   Cámara: sigue desde la última pose de Experience (picado sobre el punto), baja y rodea hasta un 3/4 casi a nivel
   (crane + orbit corto) y sigue acercándose despacio hasta el final de la página. Nunca frontal. Deriva y mouse ~2°:
   los pone corridor.js / scene.js como en el resto del pasillo.

   Foco: como en Stack y Experience, todo vive en el vacío; el post abre el rango del DOF y cada línea, punto y mota
   hace su propio círculo de confusión (|d − foco| / d). Se engancha a corridor.js con setExt(), después de ecg.js. */
import * as THREE from 'three/webgpu';
import {
  uniform, uv, vec3, float, smoothstep, exp, abs, max, length, time, sin, cos, attribute, mix, screenUV,
  instancedBufferAttribute, distance, normalize, cross, fract, positionGeometry
} from 'three/tsl';
import { CTC, CTC_VH, CTC_DOT_NDC } from './contact';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const easeIO = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
const D2R = Math.PI / 180;
const gs = (s, m, w) => Math.exp(-((s - m) ** 2) / (2 * w * w));
/** complejo P-QRS-T, s ∈ [0, 1] a lo largo del complejo (la traza del hero) */
const complex = (s) => 0.1 * gs(s, 0.15, 0.05) - 0.12 * gs(s, 0.38, 0.014) + gs(s, 0.42, 0.016) - 0.3 * gs(s, 0.46, 0.016) + 0.25 * gs(s, 0.72, 0.07);

const P_SPEED = 8.5;               // m/s: velocidad de los pulsos hacia el punto
const P_W = 0.3;                   // m: medio ancho del pulso

/* Líneas con nombre (coordenadas locales: el punto en el origen; la cámara de la llegada queda hacia −x, +z).
   from: de dónde viene; bend: desvío del punto de control (la curva llega al punto tangente a from − bend);
   kind 0 línea, 1 punteada; morph: complejos de la traza; twigs: ramitas (la red). */
/* Todas llegan desde el lado derecho del cuadro, desde arriba, desde abajo o desde el fondo: la columna de texto
   (izquierda) queda en la oscuridad. Encuadre calculado en node a 1024/1200/1440/1920 (la cámara de la llegada mira
   hacia +x −z; su derecha es +x +z). */
const NAMED = [
  { id: 'hero', from: V(40, 1.8, -30), bend: V(6, 0.6, -2.5), w: 2.0, morph: { amp: 0.42, every: 2.3, len: 0.9 } },
  { id: 'about', from: V(30, -2.6, 8), bend: V(7, -1.2, 1.8), w: 1.7 },
  { id: 'projects', from: V(45, -1.0, -60), bend: V(4, -0.6, -11), w: 1.9 },
  { id: 'fbf', from: V(19, 15, -23), bend: V(5.5, 4.6, -6.8), w: 1.4 },
  { id: 'stack', from: V(31, 3.2, -15), bend: V(9, 2.8, -1.5), w: 1.7, twigs: 6 },
  { id: 'dust', from: V(27, -13, 0), bend: V(6, -3.2, 0), w: 1.6, kind: 1 },
  { id: 'right', from: V(25, -7.5, 6.5), bend: V(6.5, -0.4, 2.4), w: 1.5 },
];
const CAM_DIR = V(-0.53, 0.14, 0.84).normalize();   // hacia dónde queda la cámara de la llegada (los hilos no vienen de ahí)
const CAM_RIGHT = V(0.85, 0, 0.53).normalize();     // su derecha: los hilos llegan de este lado (el texto vive del otro)

/** Arma la convergencia (async, con pausas). ecg: el controlador de ecg.js (end(): el punto; handoff(k)). */
export async function buildConvergence({ corr, camera, S, ctl, RED, OFF, galW, yieldToMain, ecg }) {
  const alive = () => !ctl.disposed && !S.dead;
  const g = new THREE.Group();
  g.name = 'ctc-convergence';
  g.visible = false;
  ecg.end(g.position);
  corr.group.add(g);

  /* ---------- uniforms ---------- */
  const camL = uniform(V());                       // cámara en coordenadas del punto
  const pxW = uniform(0.001);                      // m por px a 1 m
  const focusU = uniform(6), rangeU = uniform(1.0), apertU = uniform(2.0);
  const toNextU = uniform(1);                      // s hasta el próximo pico R del reloj del hero
  const appearU = uniform(0), hoverU = uniform(0);
  const textMaskOff = uniform(1);                  // 0 con el texto de Contact en cuadro (la máscara de la izquierda actúa)
  const appear = galW.mul(appearU);
  const PERIOD = S.PERIOD;
  const fogOf = (d) => exp(d.mul(-0.03));
  const cocOf = (d) => max(abs(d.sub(focusU)).sub(rangeU), 0).div(d).mul(apertU).min(1.6);

  /* ---------- geometría de las líneas: polilíneas con largo de arco desde el punto ---------- */
  let s = 20261012 >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const segs = [];       // [a, b, arcA, arcB, kind, wpx, fadeA, fadeB]
  /** curva cuadrática from → punto, muestreada cada `step` m; morph: complejos perpendiculares que se calman cerca */
  function addPath(from, ctrl, kind, w, step, morph) {
    const n = Math.max(8, Math.ceil(from.length() * 1.15 / step));
    const pts = [];
    const p = V(), tg = V(), nrm = V(), up = V(0, 1, 0);
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
      p.set(0, 0, 0).addScaledVector(from, a).addScaledVector(ctrl, b);
      void c;
      pts.push(p.clone());
    }
    // largo de arco desde el punto (el último punto es el origen)
    const arc = new Float32Array(pts.length);
    for (let i = pts.length - 2; i >= 0; i--) arc[i] = arc[i + 1] + pts[i].distanceTo(pts[i + 1]);
    const L = arc[0];
    if (morph) {
      for (let i = 1; i < pts.length - 1; i++) {
        tg.copy(pts[i - 1]).sub(pts[i + 1]).normalize();
        nrm.copy(up).addScaledVector(tg, -up.dot(tg)).normalize();     // «arriba», perpendicular a la línea
        const fromFar = L - arc[i];
        const k = (fromFar % morph.every) - (morph.every - morph.len);
        if (k < 0) continue;
        const calm = smooth(0.9, 3.2, arc[i]);                           // pegada al punto, la traza se aquieta
        pts[i].addScaledVector(nrm, complex(k / morph.len) * morph.amp * calm);
      }
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const fa = 1 - smooth(L - 9, L, arc[i]), fb = 1 - smooth(L - 9, L, arc[i + 1]);   // el extremo lejano se pierde
      segs.push([pts[i], pts[i + 1], arc[i], arc[i + 1], kind, w, fa, fb]);
    }
    return { pts, arc, L };
  }
  const ctrlOf = (from, bend) => from.clone().multiplyScalar(0.35).add(bend);
  for (const f of NAMED) {
    const morph = f.morph || null;
    const path = addPath(f.from, ctrlOf(f.from, f.bend), f.kind || 0, f.w, morph ? 0.05 : 0.3, morph);
    // la red: ramitas cortas que salen de la rama (sin pulso propio)
    for (let k = 0; k < (f.twigs || 0); k++) {
      const i = Math.floor(path.pts.length * (0.18 + 0.55 * rnd()));
      const base = path.pts[i];
      const dir = V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      const tip = base.clone().addScaledVector(dir, 1.1 + 1.6 * rnd());
      const mid = base.clone().lerp(tip, 0.5).add(V((rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.4));
      const a0 = path.arc[i];
      segs.push([base.clone(), mid, a0, a0 + 0.8, 2, 1.2, 1, 1]);
      segs.push([mid, tip, a0 + 0.8, a0 + 1.6, 2, 1.1, 1, 0.4]);
    }
    await yieldToMain();
    if (!alive()) { corr.group.remove(g); return null; }
  }
  // hilos sin nombre: volumen alrededor; nunca desde detrás de la cámara (cruzarían la lente)
  for (let k = 0; k < 22; k++) {
    let dir;
    for (let tries = 0; tries < 20; tries++) {
      dir = V(rnd() * 2 - 1, (rnd() * 2 - 1) * 0.7, rnd() * 2 - 1).normalize();
      if (dir.dot(CAM_DIR) < 0.25 && dir.dot(CAM_RIGHT) > -0.05) break;
    }
    const from = dir.multiplyScalar(24 + 26 * rnd());
    const bend = V((rnd() - 0.5) * 8, (rnd() - 0.5) * 5, (rnd() - 0.5) * 8);
    addPath(from, ctrlOf(from, bend), 3, 1.0 + 0.4 * rnd(), 0.4, null);
  }
  await yieldToMain();
  if (!alive()) { corr.group.remove(g); return null; }

  const NSEG = segs.length;
  const lPos = new Float32Array(NSEG * 12), lDir = new Float32Array(NSEG * 12), lSide = new Float32Array(NSEG * 4);
  const lArc = new Float32Array(NSEG * 4), lKind = new Float32Array(NSEG * 4), lW = new Float32Array(NSEG * 4), lFade = new Float32Array(NSEG * 4);
  const lIdx = new Uint32Array(NSEG * 6);
  segs.forEach(([a, b, arcA, arcB, kind, w, fa, fb], i) => {
    const v = i * 12, dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    for (let c = 0; c < 4; c++) {
      const p = c < 2 ? a : b;
      lPos[v + c * 3] = p.x; lPos[v + c * 3 + 1] = p.y; lPos[v + c * 3 + 2] = p.z;
      lDir[v + c * 3] = dx; lDir[v + c * 3 + 1] = dy; lDir[v + c * 3 + 2] = dz;
      lSide[i * 4 + c] = c % 2 ? 1 : -1;
      lArc[i * 4 + c] = c < 2 ? arcA : arcB; lKind[i * 4 + c] = kind; lW[i * 4 + c] = w; lFade[i * 4 + c] = c < 2 ? fa : fb;
    }
    const q = i * 4, j = i * 6;
    lIdx[j] = q; lIdx[j + 1] = q + 1; lIdx[j + 2] = q + 2; lIdx[j + 3] = q + 1; lIdx[j + 4] = q + 3; lIdx[j + 5] = q + 2;
  });
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
  lGeo.setAttribute('dir', new THREE.BufferAttribute(lDir, 3));
  lGeo.setAttribute('side', new THREE.BufferAttribute(lSide, 1));
  lGeo.setAttribute('arc', new THREE.BufferAttribute(lArc, 1));
  lGeo.setAttribute('kind', new THREE.BufferAttribute(lKind, 1));
  lGeo.setAttribute('wpx', new THREE.BufferAttribute(lW, 1));
  lGeo.setAttribute('fade', new THREE.BufferAttribute(lFade, 1));
  lGeo.setIndex(new THREE.BufferAttribute(lIdx, 1));
  {
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const sideA = attribute('side', 'float'), arc = attribute('arc', 'float'), kind = attribute('kind', 'float');
    const wpx = attribute('wpx', 'float'), fade = attribute('fade', 'float');
    const pos = positionGeometry, dir = attribute('dir', 'vec3');
    const toCam = camL.sub(pos);
    const d = length(toCam);
    const coc = cocOf(d);
    const half = d.mul(pxW).mul(wpx.mul(0.5)).mul(coc.mul(1.2).add(1));
    m.positionNode = pos.add(normalize(cross(dir, toCam)).mul(half).mul(sideA));
    const aa = float(1).sub(smoothstep(0.35, 1.0, abs(sideA)));
    const near = smoothstep(0.8, 2.4, d);
    // pulsos: llegan al punto (arc 0) en cada pico R del hero. f = metros hasta el frente más cercano (+ detrás)
    const f = fract(arc.div(P_SPEED).sub(toNextU).div(PERIOD).add(0.5)).sub(0.5).mul(PERIOD * P_SPEED);
    const front = exp(f.mul(f).div(-2 * P_W * P_W));
    const trail = smoothstep(-0.05, 0.05, f).mul(exp(f.max(0).mul(-0.85))).mul(0.32);
    const pulse = front.add(trail);
    const conv = exp(arc.mul(-0.2));                                   // cerca del punto, más luz
    const isLine = float(1).sub(smoothstep(0.5, 1.0, kind));
    const isDots = smoothstep(0.5, 1.0, kind).mul(float(1).sub(smoothstep(1.5, 2.0, kind)));
    const isTwig = smoothstep(1.5, 2.0, kind).mul(float(1).sub(smoothstep(2.5, 3.0, kind)));
    const isThread = smoothstep(2.5, 3.0, kind);
    const dash = float(1).sub(smoothstep(0.07, 0.15, abs(fract(arc.mul(1.4)).sub(0.5))));
    const hov = hoverU.mul(0.6).add(1);
    const lineC = RED.mul(float(0.16).add(conv.mul(1.1)).mul(hov).add(pulse.mul(3.2)));
    const dotsC = lineC.mul(dash.mul(1.6));
    const twigC = RED.mul(float(0.09).add(conv.mul(0.4))).add(OFF.mul(0.025));
    const threadC = OFF.mul(float(0.045).add(conv.mul(0.22)).mul(hov)).add(RED.mul(pulse.mul(0.9)));
    const col = lineC.mul(isLine).add(dotsC.mul(isDots)).add(twigC.mul(isTwig)).add(threadC.mul(isThread));
    // la columna de texto (izquierda del cuadro) queda en la oscuridad: lo que cruce por ahí se apaga al 25 %
    const textSide = mix(float(0.25), float(1), smoothstep(0.4, 0.52, screenUV.x).max(textMaskOff));
    const k = aa.mul(near).mul(fogOf(d)).mul(fade).div(coc.mul(3.0).add(1)).mul(appear).mul(textSide);
    m.colorNode = col.mul(k);
    m.opacityNode = k;
    const mesh = new THREE.Mesh(lGeo, m);
    mesh.frustumCulled = false; mesh.renderOrder = 4;
    g.add(mesh);
  }
  await yieldToMain();
  if (!alive()) { corr.group.remove(g); return null; }

  /* ---------- polvo alrededor del punto (primer plano fuera de foco; el punto lo tiñe de cerca) ---------- */
  const ND = 280;
  {
    const pos = new Float32Array(ND * 3), seedA = new Float32Array(ND);
    for (let i = 0; i < ND; i++) {
      const r = 0.7 + 7.5 * Math.pow(rnd(), 0.8), a = rnd() * Math.PI * 2, y = (rnd() - 0.5) * 6;
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(a) * r;
      seedA[i] = rnd();
    }
    const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const base = instancedBufferAttribute(new THREE.InstancedBufferAttribute(pos, 3));
    const seed = instancedBufferAttribute(new THREE.InstancedBufferAttribute(seedA, 1));
    const t = time.mul(0.1).add(seed.mul(40));
    const p = base.add(vec3(sin(t).mul(0.1), cos(t.mul(0.7)).mul(0.14), sin(t.mul(0.5)).mul(0.1)));
    m.positionNode = p;
    const d = distance(p, camL);
    const coc = cocOf(d);
    m.scaleNode = d.mul(pxW).mul(seed.mul(2.2).add(2.0)).mul(coc.mul(5).add(1));
    const r = length(uv().sub(0.5));
    const shape = mix(float(1).sub(smoothstep(0.05, 0.5, r)), float(1).sub(smoothstep(0.38, 0.5, r)).mul(0.5), smoothstep(0.1, 0.6, coc));
    const energy = float(1).div(coc.mul(5).add(1).pow(1.25));
    const hl = exp(length(p).mul(-0.5));
    const k = shape.mul(energy).mul(fogOf(d)).mul(smoothstep(0.7, 1.8, d)).mul(seed.mul(0.6).add(0.4)).mul(appear);
    m.colorNode = mix(OFF.mul(0.32), RED.mul(1.5), hl.mul(0.85)).mul(hl.mul(1.8).add(0.45)).mul(k);
    m.opacityNode = k;
    const dust = new THREE.Sprite(m);
    dust.count = ND; dust.frustumCulled = false; dust.renderOrder = 2;
    g.add(dust);
  }

  /* ---------- el punto: núcleo + halo (el bloom del post hace el resto) ---------- */
  const glow = (iU, pow, order) => {
    const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const r = length(uv().sub(0.5));
    const core = float(1).sub(smoothstep(0.0, 0.5, r)).pow(pow);
    m.colorNode = RED.mul(iU).mul(core).mul(galW);
    m.opacityNode = core.mul(galW);
    const sp = new THREE.Sprite(m);
    sp.renderOrder = order; sp.frustumCulled = false;
    g.add(sp);
    return sp;
  };
  const coreI = uniform(0), haloI = uniform(0);
  const halo = glow(haloI, 2.2, 5);
  const core = glow(coreI, 3, 6);
  await yieldToMain();
  if (!alive()) { corr.group.remove(g); return null; }

  /* ---------- cámara: llaves en c (coordenadas del punto; su posición se suma al final) ---------- */
  const fovOf = (a) => (a > 1.9 ? 30 : 32);
  const up = V(0, 1, 0);
  /** plano: cámara a distancia D del punto B, girada az alrededor del eje vertical y h más arriba; B cae en (nx, ny) NDC */
  function shot(B, az, h, D, nx, ny, tanV, aspect) {
    const p = V(B.x + D * Math.sin(az * D2R), B.y + h, B.z + D * Math.cos(az * D2R));
    const f = B.clone().sub(p); const dist = f.length(); f.divideScalar(dist);
    const r = V().crossVectors(f, up).normalize();
    const u2 = V().crossVectors(r, f);
    const l = B.clone().addScaledVector(r, -nx * tanV * aspect * dist).addScaledVector(u2, -ny * tanV * dist);
    return { p, l };
  }
  let KEYS = [], posCurve = null, lookCurve = null, keyAspect = 0;
  const k0P = V(1e9), k0L = V(1e9);
  function buildKeys(P0, L0, tanV, aspect) {
    const O = V();
    const p0 = P0.clone().sub(g.position), l0 = L0.clone().sub(g.position);
    // crane: del picado de Experience a un 3/4 casi a nivel, con el punto a la derecha (el texto vive a la izquierda)
    const m = shot(O, -12, 2.5, 5.8, 0.16, 0.18, tanV, aspect);
    const a = shot(O, -32, 0.9, 6.4, CTC_DOT_NDC.x, CTC_DOT_NDC.y, tanV, aspect);
    const z = shot(O, -23, 0.6, 5.6, CTC_DOT_NDC.x, CTC_DOT_NDC.y, tanV, aspect);
    KEYS = [[CTC.take, p0, l0], [CTC.mid, m.p, m.l], [CTC.arrive, a.p, a.l, true], [CTC_VH, z.p, z.l]];
    posCurve = new THREE.CatmullRomCurve3(KEYS.map((x) => x[1]), false, 'centripetal');
    lookCurve = new THREE.CatmullRomCurve3(KEYS.map((x) => x[2]), false, 'centripetal');
  }
  function keyParam(c) {
    c = Math.min(KEYS[KEYS.length - 1][0], Math.max(KEYS[0][0], c));
    let i = 0;
    while (i < KEYS.length - 2 && c >= KEYS[i + 1][0]) i++;
    const a = KEYS[i][0], b = KEYS[i + 1][0];
    const l = Math.min(1, Math.max(0, (c - a) / (b - a)));
    return (i + (KEYS[i][3] ? l : easeIO(l))) / (KEYS.length - 1);
  }
  const v0 = () => (S.ctc && Number.isFinite(S.ctc.v0) ? S.ctc.v0 : Infinity);
  const aT = V();
  const syncAnchor = () => {
    ecg.end(aT);
    if (aT.distanceToSquared(g.position) > 1e-8) { g.position.copy(aT); keyAspect = 0; }
  };
  function pose(u, cam, P, L) {
    const tanV = Math.tan((fovOf(cam.aspect) / 2) * D2R);
    syncAnchor();
    if (cam.aspect !== keyAspect || P.distanceToSquared(k0P) > 1e-6 || L.distanceToSquared(k0L) > 1e-6) {
      keyAspect = cam.aspect; k0P.copy(P); k0L.copy(L);
      buildKeys(P, L, tanV, cam.aspect);
    }
    const k01 = keyParam(u - v0());
    posCurve.getPoint(k01, P).add(g.position); lookCurve.getPoint(k01, L).add(g.position);
  }
  /** deriva de la cámara viva: viva en el crane, más calma frente al punto (el punto manda) */
  const calm = (u) => 0.5 - 0.15 * smooth(CTC.mid, CTC.arrive, u - v0());

  /* ---------- estado por frame ---------- */
  const st = { focus: 6, hover: 0, press: 0, vis: false };
  const fwd = V(), q = V(), camW = V(), wv = V();
  const hideDot = () => {
    const el = S.ctc && S.ctc.dot;
    if (st.vis && el) el.removeAttribute('data-vis');
    st.vis = false;
  };
  /** el enlace del HTML encima de la proyección del punto (mismo frame que el render); no sale del cuadro */
  const placeDot = () => {
    const el = S.ctc.dot;
    if (!el) return;
    wv.set(0, 0, 0);
    g.localToWorld(wv).project(camera);
    const vis = wv.z < 1 && wv.z > -1;
    if (vis !== st.vis) { st.vis = vis; el.toggleAttribute('data-vis', vis); }
    if (!vis) return;
    const W = innerWidth, H = innerHeight;
    const x = Math.min(W - W * 0.055 - 150, Math.max(W * 0.5, (wv.x * 0.5 + 0.5) * W));
    const y = Math.min(H - 300, Math.max(140, (-wv.y * 0.5 + 0.5) * H));
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  };

  /** Estado para u. Escribe uniforms y el ancla del CTA; devuelve el foco, o null antes de tomar la cámara. */
  function update(u, t, dt, gw, P, L) {
    const c = u - v0();
    const on = Number.isFinite(c) && c > CTC.appear[0] - 0.1;
    g.visible = on;
    if (!on) { hideDot(); ecg.handoff(0); return null; }
    syncAnchor();
    g.updateMatrixWorld();
    camW.copy(camera.position);
    camL.value.copy(g.worldToLocal(camW));
    pxW.value = 2 * Math.tan((camera.fov / 2) * D2R) / innerHeight;
    appearU.value = smooth(CTC.appear[0], CTC.appear[1], c);
    textMaskOff.value = 1 - smooth(CTC.head[0] - 0.1, CTC.head[1], c);

    // el reloj del hero: los pulsos llegan en cada pico R y el punto late con S.pulse
    let ph = (t - S.T_R0) % PERIOD; if (ph < 0) ph += PERIOD;
    toNextU.value = PERIOD - ph;
    const pl = t >= S.T_R0 ? S.pulse(t) : 0;
    const hk = smooth(CTC.handoff[0], CTC.handoff[1], c);
    ecg.handoff(hk);
    st.hover = damp(st.hover, S.ctc.hover ? 1 : 0, 10, dt);
    st.press = damp(st.press, S.ctc.press ? 1 : 0, 18, dt);
    hoverU.value = st.hover;
    coreI.value = hk * (5 + pl * 10 + st.hover * 3);
    core.scale.setScalar((0.15 + pl * 0.09 + st.hover * 0.07) * (1 - 0.14 * st.press));
    haloI.value = hk * (0.32 + pl * 0.85 + st.hover * 0.35);
    halo.scale.setScalar(1.25 + pl * 0.45 + st.hover * 0.3);

    // foco: el punto, nítido
    fwd.copy(L).sub(P).normalize();
    const fT = q.copy(g.position).sub(P).dot(fwd);
    st.focus = damp(st.focus, Math.max(0.8, fT), 2.4, dt);
    focusU.value = st.focus; rangeU.value = 1.0;
    if (S.ctc.live) placeDot(); else hideDot();
    void gw;
    if (c < CTC.take) return null;
    return { mode: 'ctc', fT, rT: 400 };
  }

  /** precalentado: visible para que compileAsync lo incluya */
  const warm = (v) => { g.visible = v; appearU.value = v ? 1 : 0; };

  return {
    group: g, pose, calm, update, warm,
    U0: () => v0() + CTC.take,
    info: () => ({ ctc: +(S.state.gal - v0()).toFixed(3), focus: +st.focus.toFixed(2), segs: NSEG, v0: +v0().toFixed(3), dot: st.vis }),
    dispose: () => {
      hideDot();
      ecg.handoff(0);
      g.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      corr.group.remove(g);
    },
  };
}
