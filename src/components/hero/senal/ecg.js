/* Experience «el electrocardiograma vertical» dentro de la escena persistente «Señal» (U6, 2026-10-11).
   Stack entrega una sola rama enderezada en una línea vertical. Acá esa línea vuelve a ser electrocardiograma y se lee
   de arriba abajo: cada rol es un latido (P-QRS-T) con un tick rojo; la fecha y la ficha son HTML anclado al tick
   (ExperienceStage.tsx). El cabezal baja por la traza con la cámara: lo que ya pasó queda escrito en rojo (fósforo),
   lo que falta es un hilo gris apenas visible. Al pasar por un latido lo dispara; el latido en estadía late con el
   reloj del sitio (2,4 s, el mismo del pasillo).

   Capas, de adelante hacia atrás:
   1. polvo fuera de foco (bokeh propio, se apaga pegado a la lente);
   2. la traza principal (derivación II) con sus ticks, el cabezal y el punto final;
   3. dos derivaciones fantasma, más finas y tenues, 2,8 m y 5,6 m más atrás, con su propia morfología;
   4. el papel milimetrado del monitor (cuadrícula de 0,25 / 1,25 m), 8,5 m detrás, que sólo se enciende cerca del
      cabezal y se pierde en la oscuridad.
   La cámara nunca encara de frente: rodea la traza de un lado al otro entre latidos (orbit corto + crane hacia abajo)
   y deja el latido del lado contrario a la ficha. Al final los latidos se aceleran y las tres derivaciones
   convergen en un solo punto rojo que late: Contact lo recibe.

   Foco: como en Stack, todo vive en el vacío y el DOF del post leería el plano lejano. El rango del post se abre
   (rT grande) y el desenfoque lo hace cada línea, punto y celda en su shader (círculo de confusión |d − foco| / d).

   Todo vive en un grupo hijo del pasillo (coordenadas del pasillo + ancla). Se engancha a corridor.js con setExt():
   la toma anterior (la red de Stack; sin ella, la sala de Frame by Frame) entrega su pose y esta sigue desde ahí. */
import * as THREE from 'three/webgpu';
import {
  uniform, uv, vec2, vec3, float, smoothstep, exp, abs, mix, max, length, time, sin, cos, attribute,
  instancedBufferAttribute, distance, normalize, cross, fract, fwidth, positionGeometry
} from 'three/tsl';
import { expPlan, expRoleSide, EXP_EDU_SIDE, EXP_REC_SIDE } from './experience';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const easeIO = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
const D2R = Math.PI / 180;
const gs = (s, m, w) => Math.exp(-((s - m) ** 2) / (2 * w * w));
/** latido del sitio (el del cabezal del pasillo): dos golpes cada 2,4 s */
const heartbeat = (t) => { const ph = t % 2.4; return Math.exp(-((ph - 0.05) ** 2) / 0.0016) + 0.6 * Math.exp(-((ph - 0.27) ** 2) / 0.0022); };

/* morfología de cada derivación, s ∈ [0, 1] a lo largo del complejo (de arriba abajo: P, QRS, T) */
const MORPH = [
  (s) => 0.11 * gs(s, 0.13, 0.045) - 0.09 * gs(s, 0.355, 0.014) + gs(s, 0.4, 0.016) - 0.28 * gs(s, 0.445, 0.016) + 0.24 * gs(s, 0.72, 0.065),
  (s) => 0.08 * gs(s, 0.13, 0.045) + 0.22 * gs(s, 0.385, 0.013) - 0.8 * gs(s, 0.43, 0.018) + 0.16 * gs(s, 0.72, 0.07),
  (s) => 0.1 * gs(s, 0.14, 0.05) + 0.62 * gs(s, 0.41, 0.017) - 0.12 * gs(s, 0.455, 0.015) + 0.3 * gs(s, 0.74, 0.07),
];
/** derivaciones fantasma: desplazamiento (m), retardo en y (m), amplitud relativa */
const LEADS = [
  { off: V(0, 0, 0), lag: 0, amp: 1 },
  { off: V(-1.8, 0, -2.8), lag: 0.1, amp: 0.55 },
  { off: V(2.4, 0, -5.6), lag: 0.2, amp: 0.5 },
];
const TICK = 0.42;                 // largo del tick hacia la ficha (m)
const GRID_Z = -8.5;               // papel milimetrado, detrás de la traza
const Y_TOP = 3.0;                 // la traza empieza arriba del ancla y se funde (empalma con la recta de Stack)
const JOIN = 1.6;                  // metros en que la traza se superpone con el final de la recta de Stack

/** Latidos: y del pico R (local, negativo hacia abajo), amplitud, largo del complejo, lado de la ficha. */
function layoutBeats([nR, nE, nC]) {
  const beats = [];
  let y = -3.8;
  for (let k = 0; k < nR; k++) { beats.push({ y, amp: 0.82, len: 0.95, side: expRoleSide(k), kind: 'role', i: k }); if (k < nR - 1) y -= 3.2; }
  y -= 3.0;
  for (let k = 0; k < nE; k++) { beats.push({ y, amp: 0.5, len: 0.72, side: EXP_EDU_SIDE, kind: 'edu', i: k }); if (k < nE - 1) y -= 1.35; }
  y -= 2.7;
  for (let k = 0; k < nC; k++) { beats.push({ y, amp: 0.62, len: 0.78, side: EXP_REC_SIDE, kind: 'rec', i: k }); if (k < nC - 1) y -= 1.15; }
  const recLast = y;
  // cola: los latidos se aceleran (cada intervalo, 0,74 del anterior) y se achican hasta el punto
  let sp = 0.95, a = 0.4;
  y -= 1.45;
  for (let i = 0; i < 12; i++) {
    beats.push({ y, amp: a, len: Math.min(0.62, sp * 0.78), side: 1, kind: 'tail', i });
    sp *= 0.74; a *= 0.8; y -= sp;
  }
  const yEnd = y - 0.12;
  return { beats, yEnd, recLast, yConv: recLast - 0.6 };
}

/** Arma la traza (async, con pausas al hilo principal). Devuelve el controlador o null si se desmontó a mitad. */
export async function buildEcg({ corr, camera, S, ctl, RED, OFF, galW, yieldToMain, line }) {
  const alive = () => !ctl.disposed && !S.dead;
  const counts = S.exp.counts.map((n, k) => n || [6, 3, 2][k]);
  const plan = expPlan(counts[0]);
  const { beats, yEnd, yConv } = layoutBeats(counts);
  const roleB = beats.filter((b) => b.kind === 'role');
  const eduB = beats.filter((b) => b.kind === 'edu');
  const recB = beats.filter((b) => b.kind === 'rec');
  const tagB = [...roleB, ...eduB, ...recB];        // mismo orden que S.exp.tags

  const ecg = new THREE.Group();
  ecg.name = 'exp-ecg';
  /* ancla: la traza sigue la recta en que termina la red de Stack (misma x/z; su arranque se funde con el final de
     la recta). La recta cambia con el aspecto de la ventana: el ancla se relee en cada frame. Sin red, un punto fijo
     debajo de la última capa. */
  const anchorAt = (out) => {
    const l = line && line();
    if (!l || !Number.isFinite(l.yBot)) return out.set(0.8, -9.5, -158);
    return out.set(l.x, l.yBot - Y_TOP + JOIN, l.z);
  };
  anchorAt(ecg.position);
  ecg.visible = false;
  corr.group.add(ecg);

  /* ---------- uniforms ---------- */
  const camL = uniform(V());                       // cámara en coordenadas de la traza
  const pxW = uniform(0.001);                      // m por px a 1 m de distancia
  const focusU = uniform(6), rangeU = uniform(1.4), apertU = uniform(2.0);
  const headY = uniform(Y_TOP), headP = uniform(V(0, Y_TOP, 0));
  const actA = uniform(1e4), actB = uniform(1e4), beatU = uniform(0);
  const onU = uniform(0);                          // la traza existe (entra con la sección)
  const endU = uniform(0);                         // el punto final (sale hacia Contact)
  const appear = galW.mul(onU);

  const fogOf = (d) => exp(d.mul(-0.045));
  const cocOf = (d) => max(abs(d.sub(focusU)).sub(rangeU), 0).div(d).mul(apertU).min(1.6);

  /* ---------- la traza: x, z de cada derivación en función de y ---------- */
  const conv = (y) => (y > yConv ? 1 : 1 - easeIO((yConv - y) / (yConv - yEnd)));
  function traceAt(y, lead, out) {
    const L = LEADS[lead], yy = y + L.lag;
    let dx = 0, spk = 0;
    for (let i = 0; i < beats.length; i++) {
      const b = beats[i];
      const s = (b.y + 0.4 * b.len - yy) / b.len;
      if (s < -0.05 || s > 1.05) continue;
      const f = MORPH[lead](s) * b.amp * L.amp;
      dx += -b.side * f;
      spk = Math.max(spk, Math.abs(f) / (b.amp * L.amp + 1e-6));
    }
    const c = conv(y);
    const wander = 0.035 * Math.sin(y * 0.83 + lead * 1.7);
    out.set(L.off.x * c + dx + wander, y, L.off.z * c + 0.06 * Math.sin(y * 0.57 + 1 + lead) + 0.28 * Math.abs(dx) * c);
    return spk;
  }
  // muestreo fino en los complejos (las derivaciones fantasma van con retardo: el margen de abajo es mayor)
  const nearBeat = (y) => beats.some((b) => y < b.y + 0.5 * b.len + 0.08 && y > b.y - 0.65 * b.len - 0.3);

  /* ---------- líneas: quads que miran a la cámara (como la red de Stack), en coordenadas de la traza ---------- */
  const segs = [];       // [a, b, sy, lead, spk, wpx]
  const pa = V(), pb = V();
  for (let lead = 0; lead < 3; lead++) {
    let y = Y_TOP;
    let s0 = traceAt(y, lead, pa);
    while (y > yEnd) {
      const step = nearBeat(y) ? 0.011 : 0.07;
      const y1 = Math.max(yEnd, y - step);
      const s1 = traceAt(y1, lead, pb);
      segs.push([pa.clone(), pb.clone(), (y + y1) / 2, lead, Math.max(s0, s1), lead ? 1.6 : 2.4]);
      pa.copy(pb); s0 = s1; y = y1;
    }
    await yieldToMain();
    if (!alive()) { corr.group.remove(ecg); return null; }
  }
  // ticks: del pico R hacia la ficha, más un filete corto perpendicular en la punta
  tagB.forEach((b) => {
    // el tick arranca separado de la traza: se lee como marca de tiempo, no como parte del complejo
    const a = V(b.side * 0.13, b.y, 0), e = V(b.side * TICK, b.y, 0);
    segs.push([a, e, b.y, 3, 0, 2.0]);
    segs.push([V(e.x, b.y + 0.05, 0), V(e.x, b.y - 0.05, 0), b.y, 3, 0, 2.0]);
  });
  const NSEG = segs.length;
  const lPos = new Float32Array(NSEG * 12), lDir = new Float32Array(NSEG * 12), lSide = new Float32Array(NSEG * 4);
  const lSy = new Float32Array(NSEG * 4), lLead = new Float32Array(NSEG * 4), lSpk = new Float32Array(NSEG * 4), lW = new Float32Array(NSEG * 4);
  const lIdx = new Uint32Array(NSEG * 6);
  segs.forEach(([a, b, sy, lead, spk, w], i) => {
    const v = i * 12, dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    for (let c = 0; c < 4; c++) {
      const p = c < 2 ? a : b;
      lPos[v + c * 3] = p.x; lPos[v + c * 3 + 1] = p.y; lPos[v + c * 3 + 2] = p.z;
      lDir[v + c * 3] = dx; lDir[v + c * 3 + 1] = dy; lDir[v + c * 3 + 2] = dz;
      lSide[i * 4 + c] = c % 2 ? 1 : -1;
      lSy[i * 4 + c] = c < 2 ? a.y : b.y; lLead[i * 4 + c] = lead; lSpk[i * 4 + c] = spk; lW[i * 4 + c] = w;
    }
    const q = i * 4, j = i * 6;
    lIdx[j] = q; lIdx[j + 1] = q + 1; lIdx[j + 2] = q + 2; lIdx[j + 3] = q + 1; lIdx[j + 4] = q + 3; lIdx[j + 5] = q + 2;
  });
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
  lGeo.setAttribute('dir', new THREE.BufferAttribute(lDir, 3));
  lGeo.setAttribute('side', new THREE.BufferAttribute(lSide, 1));
  lGeo.setAttribute('sy', new THREE.BufferAttribute(lSy, 1));
  lGeo.setAttribute('lead', new THREE.BufferAttribute(lLead, 1));
  lGeo.setAttribute('spk', new THREE.BufferAttribute(lSpk, 1));
  lGeo.setAttribute('wpx', new THREE.BufferAttribute(lW, 1));
  lGeo.setIndex(new THREE.BufferAttribute(lIdx, 1));
  {
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const sideA = attribute('side', 'float'), sy = attribute('sy', 'float'), lead = attribute('lead', 'float');
    const spk = attribute('spk', 'float'), wpx = attribute('wpx', 'float');
    const pos = positionGeometry, dir = attribute('dir', 'vec3');
    const toCam = camL.sub(pos);
    const d = length(toCam);
    const coc = cocOf(d);
    const half = d.mul(pxW).mul(wpx.mul(0.5)).mul(coc.mul(1.2).add(1));
    m.positionNode = pos.add(normalize(cross(dir, toCam)).mul(half).mul(sideA));
    const aa = float(1).sub(smoothstep(0.35, 1.0, abs(sideA)));
    const near = smoothstep(0.45, 1.5, d);
    // escrito (arriba del cabezal) vs. por escribir; la estela fresca brilla y decae hasta el fósforo
    const ahead = sy.sub(headY);
    const written = smoothstep(-0.02, 0.02, ahead);
    const trail = exp(ahead.max(0).mul(-0.32));
    const isMain = float(1).sub(smoothstep(0.5, 1.0, lead)), isTick = smoothstep(2.5, 3.0, lead);
    const isGhost = float(1).sub(isMain).sub(isTick).max(0);
    // el latido en estadía late con el reloj del sitio
    const act = smoothstep(actB.sub(0.75), actB.sub(0.3), sy).mul(float(1).sub(smoothstep(actA.add(0.3), actA.add(0.75), sy)));
    const beat = act.mul(beatU).mul(spk.mul(1.6).add(0.35));
    const bri = written.mul(trail.mul(1.15).add(0.3)).mul(spk.mul(1.5).add(1)).add(beat.mul(written));
    // por escribir: un hilo neutro apenas visible (se lee el camino, no la señal)
    const guide = float(1).sub(written).mul(0.13).mul(exp(ahead.negate().max(0).mul(-0.03))).mul(spk.mul(1.2).add(1));
    const tail = smoothstep(Y_TOP, Y_TOP - 2.2, sy);                 // arriba del ancla se funde (empalma con Stack)
    const mainC = RED.mul(bri.mul(3.6)).add(OFF.mul(guide));
    const ghostC = mix(OFF.mul(0.5), RED.mul(1.1), written.mul(0.55)).mul(bri.mul(0.7).add(guide.mul(1.4)));
    const tickC = RED.mul(written.mul(2.6).add(0.12));
    const col = mainC.mul(isMain).add(ghostC.mul(isGhost)).add(tickC.mul(isTick));
    const k = aa.mul(near).mul(fogOf(d)).mul(tail).div(coc.mul(3.0).add(1)).mul(appear);
    m.colorNode = col.mul(k);
    m.opacityNode = k;
    const mesh = new THREE.Mesh(lGeo, m);
    mesh.frustumCulled = false; mesh.renderOrder = 4;
    ecg.add(mesh);
  }
  await yieldToMain();
  if (!alive()) { corr.group.remove(ecg); return null; }

  /* ---------- papel milimetrado: plano oblicuo detrás, encendido sólo cerca del cabezal ---------- */
  const gH = Y_TOP + 6 - (yEnd - 6), gMid = (Y_TOP + 6 + yEnd - 6) / 2, gW = 30;
  {
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const gp = positionGeometry.xy.add(vec2(0, gMid));
    const p3 = vec3(gp.x, gp.y, GRID_Z);
    const d = distance(p3, camL);
    // el papel desenfoca menos que la traza (apertura propia): de fondo se lee como textura, no como niebla
    const coc = cocOf(d).mul(0.45);
    const blurM = coc.mul(d).mul(pxW).mul(6.0);
    const axis = (c, cell) => {
      const fw = fwidth(c);
      const dist = abs(fract(c.div(cell).add(0.5)).sub(0.5)).mul(cell);
      const w = fw.mul(0.7).add(blurM);
      const line = float(1).sub(smoothstep(w.mul(0.5), w.mul(1.5), dist)).mul(fw.mul(0.7).div(w));
      return line.mul(float(1).sub(smoothstep(cell * 0.1, cell * 0.3, fw)));
    };
    const minor = max(axis(gp.x, 0.25), axis(gp.y, 0.25));
    const major = max(axis(gp.x, 1.25), axis(gp.y, 1.25));
    // sólo lo enciende el cabezal: lejos de él el papel se pierde en la oscuridad (luz escasa)
    const lit = exp(distance(p3, headP).mul(-0.24)).mul(2.6).add(0.05);
    const edge = smoothstep(gW / 2, gW / 2 - 4, abs(gp.x)).mul(smoothstep(Y_TOP + 6, Y_TOP + 1, gp.y)).mul(smoothstep(yEnd - 6, yEnd - 1, gp.y));
    const k = lit.mul(edge).mul(fogOf(d)).mul(smoothstep(1.0, 3.0, d)).mul(appear);
    m.colorNode = OFF.mul(minor.mul(0.03).add(major.mul(0.085))).mul(k).add(RED.mul(major.mul(0.09).mul(exp(distance(p3, headP).mul(-0.3)))).mul(appear));
    m.opacityNode = float(1);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(gW, gH), m);
    mesh.position.set(0, gMid, GRID_Z);
    mesh.frustumCulled = false; mesh.renderOrder = 1;
    ecg.add(mesh);
  }

  /* ---------- polvo: una columna alrededor de la traza (primer plano fuera de foco) ---------- */
  const ND = 720;
  {
    const pos = new Float32Array(ND * 3), seedA = new Float32Array(ND);
    let s = 20261011 >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < ND; i++) {
      const r = 0.5 + 6.5 * Math.sqrt(rnd()), a = rnd() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Y_TOP + 2 - rnd() * (Y_TOP + 4 - yEnd); pos[i * 3 + 2] = Math.sin(a) * r - 1.2;
      seedA[i] = rnd();
    }
    const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const base = instancedBufferAttribute(new THREE.InstancedBufferAttribute(pos, 3));
    const seed = instancedBufferAttribute(new THREE.InstancedBufferAttribute(seedA, 1));
    const t = time.mul(0.12).add(seed.mul(40));
    const p = base.add(vec3(sin(t).mul(0.08), cos(t.mul(0.7)).mul(0.12), sin(t.mul(0.5)).mul(0.08)));
    m.positionNode = p;
    const d = distance(p, camL);
    const coc = cocOf(d);
    m.scaleNode = d.mul(pxW).mul(seed.mul(2.4).add(2.0)).mul(coc.mul(5).add(1));
    const r = length(uv().sub(0.5));
    const shape = mix(float(1).sub(smoothstep(0.05, 0.5, r)), float(1).sub(smoothstep(0.38, 0.5, r)).mul(0.5), smoothstep(0.1, 0.6, coc));
    const energy = float(1).div(coc.mul(5).add(1).pow(1.25));
    const hl = exp(distance(p, headP).mul(-0.55));
    const k = shape.mul(energy).mul(fogOf(d)).mul(smoothstep(0.6, 1.6, d)).mul(seed.mul(0.6).add(0.4)).mul(appear);
    m.colorNode = mix(OFF.mul(0.4), RED.mul(1.6), hl.mul(0.8)).mul(hl.mul(2.0).add(0.6)).mul(k);
    m.opacityNode = k;
    const dust = new THREE.Sprite(m);
    dust.count = ND; dust.frustumCulled = false; dust.renderOrder = 2;
    ecg.add(dust);
  }

  /* ---------- cabezal y punto final ---------- */
  const glow = (i, scale) => {
    const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const r = length(uv().sub(0.5));
    const core = float(1).sub(smoothstep(0.0, 0.5, r)).pow(3);
    m.colorNode = RED.mul(i).mul(core).mul(appear);
    m.opacityNode = core.mul(appear);
    const sp = new THREE.Sprite(m);
    sp.scale.setScalar(scale); sp.renderOrder = 5; sp.frustumCulled = false;
    ecg.add(sp);
    return sp;
  };
  const headI = uniform(6), dotI = uniform(0);
  const head = glow(headI, 0.15);
  const dot = glow(dotI, 0.2);
  dot.position.set(0, yEnd, 0);
  await yieldToMain();
  if (!alive()) { corr.group.remove(ecg); return null; }

  /* ---------- cámara: llaves en e = u − v0 (coordenadas de la traza; el ancla se suma al final) ---------- */
  const fovOf = (a) => (a > 1.9 ? 30 : 32);
  const up = V(0, 1, 0);
  /** plano: cámara a distancia D del punto B, girada az alrededor de la traza y h más arriba; B cae en (nx, ny) NDC */
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
  const midY = (bs) => bs.reduce((a, b) => a + b.y, 0) / bs.length;
  function buildKeys(P0, L0, tanV, aspect) {
    const K = [];
    const A = ecg.position;
    const toLoc = (v) => v.clone().sub(A);
    // plano de situación: casi cenital, la traza cae hacia el fondo (los latidos de abajo se achican en perspectiva)
    // plano de situación: abierto y en picado suave (3/4), la traza baja hacia la oscuridad con los dos primeros
    // latidos en perspectiva, las derivaciones fantasma y el papel detrás. B: la cámara se acerca y baja (crane).
    const iA = shot(V(0, -5.6, 0), 34, 4.6, 11.0, 0.28, 0.02, tanV, aspect);
    const iB = shot(V(0, -5.0, 0), 27, 3.2, 8.4, 0.3, 0.04, tanV, aspect);
    // entrada: con la recta de Stack en cuadro (ancla cerca), la cámara sigue desde la pose anterior (un crane);
    // sin ella (todavía tapa una sección opaca), arranca de un plano arriba de la traza que nadie ve
    const p0 = toLoc(P0), l0 = toLoc(L0);
    const follow = !!line || p0.distanceTo(iA.p) < 25;
    K.push([plan.enter[0], follow ? p0 : iA.p.clone().add(V(0, 4.5, 2.5)), follow ? l0 : iA.l.clone().add(V(0, 3.5, 0))]);
    K.push([plan.intro[0] + 0.35, iA.p, iA.l, true]);
    K.push([plan.intro[1], iB.p, iB.l]);
    roleB.forEach((b, k) => {
      const s = b.side, d = plan.roles[k];
      const B = V(0, b.y, 0);
      const a = shot(B, s * 30, 1.45, 5.7, -s * 0.34, 0.3, tanV, aspect);
      const z = shot(B, s * 21, 1.05, 5.1, -s * 0.33, 0.29, tanV, aspect);
      K.push([d[0], a.p, a.l, true]);
      K.push([d[1], z.p, z.l]);
      const nx = roleB[k + 1];
      if (nx) {
        // cruce: la cámara baja y pasa al otro lado de la traza, más cerca (la traza barre el cuadro)
        const m = shot(V(0, (b.y + nx.y) / 2 - 0.3, 0), s * 5, 2.2, 4.3, 0, 0.15, tanV, aspect);
        K.push([(d[1] + plan.roles[k + 1][0]) / 2, m.p, m.l]);
      }
    });
    const lastR = roleB[roleB.length - 1];
    {
      const yc = midY(eduB);
      const m = shot(V(0, (lastR.y + eduB[0].y) / 2, 0), -6, 2.6, 5.6, 0.1, 0.12, tanV, aspect);
      K.push([(plan.roles[plan.roles.length - 1][1] + plan.edu[0]) / 2, m.p, m.l]);
      const a = shot(V(0, yc + 0.25, 0), -24, 1.2, 7.4, 0.24, 0.06, tanV, aspect);
      const z = shot(V(0, yc, 0), -16, 0.8, 6.8, 0.24, 0.04, tanV, aspect);
      K.push([plan.edu[0], a.p, a.l, true]);
      K.push([plan.edu[1], z.p, z.l]);
    }
    {
      const yc = midY(recB);
      const m = shot(V(0, (eduB[eduB.length - 1].y + recB[0].y) / 2, 0), 4, 2.4, 5.4, 0, 0.12, tanV, aspect);
      K.push([(plan.edu[1] + plan.rec[0]) / 2, m.p, m.l]);
      const a = shot(V(0, yc + 0.2, 0), 22, 1.0, 6.4, -0.22, 0.08, tanV, aspect);
      const z = shot(V(0, yc, 0), 15, 0.7, 5.9, -0.22, 0.06, tanV, aspect);
      K.push([plan.rec[0], a.p, a.l, true]);
      K.push([plan.rec[1], z.p, z.l]);
    }
    {
      // salida: retrocede y se eleva; las tres derivaciones caen en embudo hacia el punto
      const m = shot(V(0, (recB[recB.length - 1].y + yEnd) / 2, 0), 12, 2.4, 6.6, -0.04, 0.1, tanV, aspect);
      const f = shot(V(0, yEnd, 0), 6, 4.6, 3.4, 0, 0.3, tanV, aspect);
      K.push([(plan.out[0] + plan.out[1]) / 2, m.p, m.l]);
      K.push([plan.out[1], f.p, f.l]);
    }
    KEYS = K;
    posCurve = new THREE.CatmullRomCurve3(K.map((x) => x[1]), false, 'centripetal');
    lookCurve = new THREE.CatmullRomCurve3(K.map((x) => x[2]), false, 'centripetal');
  }
  function keyParam(e) {
    e = Math.min(KEYS[KEYS.length - 1][0], Math.max(KEYS[0][0], e));
    let i = 0;
    while (i < KEYS.length - 2 && e >= KEYS[i + 1][0]) i++;
    const a = KEYS[i][0], b = KEYS[i + 1][0];
    const l = Math.min(1, Math.max(0, (e - a) / (b - a)));
    return (i + (KEYS[i][3] ? l : easeIO(l))) / (KEYS.length - 1);
  }
  const v0 = () => (S.exp && Number.isFinite(S.exp.v0) ? S.exp.v0 : Infinity);
  /** Pose para u > U0. P/L llegan con la pose de la toma anterior (coordenadas del pasillo): es la primera llave. */
  const aT = V();
  const syncAnchor = () => {
    anchorAt(aT);
    if (aT.distanceToSquared(ecg.position) > 1e-8) { ecg.position.copy(aT); keyAspect = 0; }
  };
  function pose(u, cam, P, L) {
    const tanV = Math.tan((fovOf(cam.aspect) / 2) * D2R);
    syncAnchor();
    if (cam.aspect !== keyAspect || P.distanceToSquared(k0P) > 1e-6 || L.distanceToSquared(k0L) > 1e-6) {
      keyAspect = cam.aspect; k0P.copy(P); k0L.copy(L);
      buildKeys(P, L, tanV, cam.aspect);
    }
    const k01 = keyParam(u - v0());
    posCurve.getPoint(k01, P).add(ecg.position); lookCurve.getPoint(k01, L).add(ecg.position);
  }
  /** deriva de la cámara viva (la escala corridor.js): viva en las estadías, más calma al llegar al punto */
  const calm = (u) => { const e = u - v0(); return 0.55 - 0.25 * smooth(plan.out[0], plan.out[1], e); };

  /* ---------- cabezal: y en función de e (dispara cada latido al empezar su estadía) ---------- */
  const HK = [];
  {
    HK.push([plan.enter[0], Y_TOP - 1.0]);
    HK.push([plan.intro[1], roleB[0].y + 1.3]);
    roleB.forEach((b, k) => {
      const d = plan.roles[k];
      HK.push([d[0] - 0.12, b.y + 0.55]); HK.push([d[0] + 0.14, b.y - 0.7]); HK.push([d[1], b.y - 1.05]);
    });
    const e0 = eduB[0], e2 = eduB[eduB.length - 1];
    HK.push([plan.edu[0] - 0.2, e0.y + 0.5]); HK.push([plan.edu[0] + 0.4, e2.y - 0.6]); HK.push([plan.edu[1], e2.y - 0.9]);
    const r0 = recB[0], r1 = recB[recB.length - 1];
    HK.push([plan.rec[0] - 0.2, r0.y + 0.5]); HK.push([plan.rec[0] + 0.3, r1.y - 0.55]); HK.push([plan.rec[1], r1.y - 0.8]);
    HK.push([plan.out[1] - 0.1, yEnd]);
  }
  function headAt(e) {
    if (e <= HK[0][0]) return HK[0][1];
    for (let i = 0; i < HK.length - 1; i++) {
      const [a, ya] = HK[i], [b, yb] = HK[i + 1];
      if (e <= b) return ya + (yb - ya) * easeIO((e - a) / (b - a));
    }
    return HK[HK.length - 1][1];
  }

  /* ---------- estado por frame ---------- */
  const st = { focus: 6, range: 1.4, mode: '', live: false };
  const fwd = V(), q = V(), camW = V(), wv = V();
  const tagOn = tagB.map(() => false);
  const placeTags = () => {
    const tags = S.exp.tags;
    if (!tags || !tags.length) return;
    const W = innerWidth, H = innerHeight, padX = W * 0.055;
    const sndTop = H - Math.max(H * 0.07, 96);
    for (let i = 0; i < tags.length && i < tagB.length; i++) {
      const el = tags[i], b = tagB[i];
      wv.set(b.side * TICK, b.y, 0);
      ecg.localToWorld(wv).project(camera);
      const vis = wv.z < 1 && wv.z > -1;
      if (vis !== tagOn[i]) { tagOn[i] = vis; el.toggleAttribute('data-vis', vis); }
      if (!vis) continue;
      const box = S.exp.box[i] || { w: 0, h: 0 };
      let x = (wv.x * 0.5 + 0.5) * W, y = (-wv.y * 0.5 + 0.5) * H;
      // la ficha no sale del cuadro: ni por los lados, ni por abajo (interruptor de sonido), ni sobre el rótulo de arriba
      if (b.side > 0) x = Math.min(x, W - padX - 16 - box.w); else x = Math.max(x, padX + 16 + box.w);
      y = Math.max(132, Math.min(y, sndTop - box.h + 10));
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  };
  const hideTags = () => {
    (S.exp.tags || []).forEach((el, i) => { if (tagOn[i]) { tagOn[i] = false; el.removeAttribute('data-vis'); } });
  };

  /** Estado de la traza para u. Escribe uniforms y rótulos; devuelve el foco, o null fuera de su tramo. */
  function update(u, t, dt, gw, P, L) {
    const e = u - v0();
    const on = Number.isFinite(e) && e > plan.enter[0] - 0.4;
    ecg.visible = on;
    if (!on) { hideTags(); return null; }
    syncAnchor();
    ecg.updateMatrixWorld();
    camW.copy(camera.position);
    camL.value.copy(ecg.worldToLocal(camW));
    pxW.value = 2 * Math.tan((camera.fov / 2) * D2R) / innerHeight;
    onU.value = smooth(plan.enter[0] - 0.4, plan.enter[0] + 0.1, e);

    // cabezal
    const hy = headAt(e);
    headY.value = hy;
    traceAt(hy, 0, head.position);
    headP.value.copy(head.position);
    const hb = heartbeat(t);
    beatU.value = hb;
    const outK = smooth(plan.out[0], plan.out[1], e);
    headI.value = (5.5 + hb * 3.5) * (1 - smooth(plan.out[1] - 0.25, plan.out[1], e));
    head.scale.setScalar(0.13 + 0.05 * hb);
    // el punto: aparece al final y late (el CTA de Contact lo recibe)
    endU.value = smooth(plan.out[0] + 0.3, plan.out[1], e);
    dotI.value = endU.value * (6 + hb * 7);
    dot.scale.setScalar(0.1 + endU.value * (0.22 + 0.12 * hb));

    // latido en estadía (rango de y que late) y foco
    fwd.copy(L).sub(P).normalize();
    const rIdx = plan.roles.findIndex((d) => e >= d[0] - 0.1 && e <= d[1] + 0.1);
    const toF = (y, x = 0) => q.set(x, y, 0).add(ecg.position).sub(P).dot(fwd);
    let mode, fT, rT;
    if (e < plan.intro[1]) {
      mode = 'exp-intro'; fT = toF(roleB[0].y); rT = 4.5;
      actA.value = 1e4; actB.value = 1e4;
    } else if (rIdx >= 0) {
      const b = roleB[rIdx];
      mode = 'exp-r' + rIdx; fT = toF(b.y, b.side * TICK * 0.5); rT = 1.25;
      actA.value = b.y; actB.value = b.y;
    } else if (e >= plan.edu[0] - 0.15 && e <= plan.edu[1] + 0.1) {
      mode = 'exp-edu'; fT = toF(midY(eduB)); rT = 1.9;
      actA.value = eduB[0].y; actB.value = eduB[eduB.length - 1].y;
    } else if (e >= plan.rec[0] - 0.15 && e <= plan.rec[1] + 0.12) {
      mode = 'exp-rec'; fT = toF(midY(recB)); rT = 1.7;
      actA.value = recB[0].y; actB.value = recB[recB.length - 1].y;
    } else if (e > plan.rec[1]) {
      mode = 'exp-out'; fT = toF(yEnd); rT = 2.2 + 1.5 * (1 - outK);
      actA.value = 1e4; actB.value = 1e4;
    } else {
      // cruce: el foco ya busca el próximo latido (rack focus)
      const nx = roleB.findIndex((b, k) => e < plan.roles[k][0]);
      const target = nx >= 0 ? roleB[nx].y : e < plan.edu[0] ? midY(eduB) : midY(recB);
      mode = 'exp-t' + nx; fT = toF(target); rT = 2.4;
      actA.value = 1e4; actB.value = 1e4;
    }
    st.mode = mode;
    st.focus = damp(st.focus, Math.max(0.8, fT), 2.4, dt);
    st.range = damp(st.range, rT, 2.4, dt);
    focusU.value = st.focus; rangeU.value = st.range;
    st.live = !!(S.exp && S.exp.live);
    if (st.live) placeTags(); else hideTags();
    void gw;
    // hasta que la cámara deja la recta de Stack, el foco es de la red; desde ahí, de la traza
    if (e < plan.enter[0]) return null;
    // el post abre el rango del DOF: el desenfoque de la traza lo hace cada línea, punto y celda (ver arriba)
    return { mode, fT, rT: 400 };
  }

  /** precalentado: la traza visible para que compileAsync la incluya */
  const warm = (v) => { ecg.visible = v; onU.value = v ? 1 : 0; };

  return {
    group: ecg, pose, calm, update, warm,
    U0: () => v0() + plan.enter[0],
    info: () => ({ exp: st.mode, focus: +st.focus.toFixed(2), head: +headY.value.toFixed(2), yEnd: +yEnd.toFixed(2), segs: NSEG, v0: +v0().toFixed(3) }),
    // dispose total: la traza sale del pasillo antes del recorrido de scene.js, así que libera lo suyo acá
    dispose: () => {
      hideTags();
      ecg.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      corr.group.remove(ecg);
    },
  };
}
