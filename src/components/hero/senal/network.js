/* Stack «la red por capas» dentro de la escena persistente «Señal» (U5, 2026-10-11).
   Frame by Frame termina con el polvo del haz encendido como puntos frente a la última pantalla. Acá esos puntos se
   conectan, una línea roja los enhebra, sale de la nube por encima de la pantalla y baja hacia la red: cuatro
   arborizaciones colgadas en la oscuridad, cada una 14,5 m más adelante y 4,3 m más abajo que la anterior (una pila).
   Cada capa es un árbol: la señal entra por la raíz (arriba), baja por el tronco y la onda se abre por las ramas hasta
   cada nodo con nombre (una tecnología de messages skills.<capa>.items): el nodo destella en rojo y su rótulo HTML
   aparece. Ramitas sin nombre y polvo sináptico (unos 4 000 puntos en total) dan el volumen. La cámara recorre la
   pila en oblicuo: crane hacia abajo + dolly entre capas, rack focus de una a otra. Al final la red se apaga y el
   camino de la señal por la última capa se endereza en una sola línea vertical que sigue hacia abajo: Experience.

   Diseño desde la cámara: cada capa se arma en el espacio de su cámara de estadía (x a la derecha, y arriba, −z al
   frente). Los nodos con nombre se ubican en una grilla escalonada de NDC del lado contrario a la cabecera HTML, a una
   profundidad que crece al alejarse del tronco (la hoja queda oblicua: nunca un plano frontal). Así los rótulos caen
   donde se diseñaron en la pose central de la estadía y se separan por profundidad cuando la cámara se mueve. Con
   otro aspecto de ventana, place() reescala x/y en el espacio de la cámara (mismo NDC, misma profundidad).

   Sin compute: el estado de cada nodo (encendido, destello, pulso, foco) es función pura de (u, t, semilla,
   distancia por el árbol) y lo evalúa el shader de vértices/fragmentos con un puñado de uniforms. Corre igual en
   WebGPU y en el respaldo WebGL 2, sin storage buffers.

   Foco: la red vive en el vacío. El DOF del post lee la profundidad de lo que hay detrás de lo transparente (acá, el
   plano lejano) y la volvería toda bokeh; durante Stack el rango del DOF se abre (rT grande) y el desenfoque lo hace
   cada punto y cada línea en su shader (círculo de confusión |d − foco| / d: el sprite crece y su energía se reparte).

   Todo vive en un grupo hijo del pasillo (coordenadas del pasillo, como la sala de projector.js). Se engancha a
   corridor.js con setExt(): la cámara de la sala entrega su última pose y esta toma sigue desde ahí. */
import * as THREE from 'three/webgpu';
import {
  uniform, uv, vec3, float, smoothstep, exp, abs, mix, max, length, time, sin, cos, attribute,
  instancedBufferAttribute, distance, normalize, cross, step, fract, positionGeometry
} from 'three/tsl';
import { FBF_END, FBF_SCREENS } from './frames';
import { STK_CONNECT, STK_INTRO, STK_DWELLS, STK_OUT, STK_END, STK_LAYERS, stkItemsWindow, stkWave } from './stack';
import { VIDEOS } from '../../../lib/content';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const easeIO = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
const D2R = Math.PI / 180;
const NL = STK_LAYERS.length;
const CLOUD = NL;                                 // índice de «capa» de la nube de puntos de Frame by Frame
const DEFAULT_COUNTS = [14, 14, 15, 10];
const WAVE_K = 1.12;                              // la onda pasa un poco más allá del último nodo con nombre

/* azar con semilla: la red (y por lo tanto cada rótulo) es la misma en cada carga */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => { let a = 0; for (let i = 0; i < 4; i++) a += r(); return (a - 2) * 0.866; };

/* ---------- cámaras de estadía (pose central de cada capa, coordenadas del pasillo) ---------- */
const DWELL = STK_LAYERS.map((L, k) => {
  const s = L.side;
  const p = V(k % 2 ? 0.8 : -0.6, 4.0 - 4.3 * k, -112 - 14.5 * k);
  const yaw = -s * 7 * D2R, pitch = -9 * D2R;
  const fwd = V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  const l = p.clone().addScaledVector(fwd, 10);
  const m = new THREE.Matrix4().lookAt(p, l, V(0, 1, 0)).setPosition(p);
  return { s, p, l, fwd, m };
});

/** Arma la red (async, con pausas al hilo principal). Devuelve el controlador o null si se desmontó a mitad. */
export async function buildNetwork({ corr, camera, S, ctl, RED, OFF, galW, yieldToMain }) {
  const alive = () => !ctl.disposed && !S.dead;
  const net = new THREE.Group();
  net.name = 'stack-net';
  net.visible = false;
  const appear = galW;

  // aspecto / campo con que se diseñó la red (place() reescala si cambian)
  const fovOf = (a) => (a > 1.9 ? 30 : 32);
  let A0 = camera.aspect, T0 = Math.tan((fovOf(A0) / 2) * D2R);
  const counts = STK_LAYERS.map((_, k) => (S.stk && S.stk.items[k] && S.stk.items[k].length) || DEFAULT_COUNTS[k]);

  /* ---------- uniforms ---------- */
  const camL = uniform(new THREE.Vector3(0, 0, 0));     // cámara en coordenadas del pasillo
  const pxW = uniform(0.001);                          // m por px a 1 m de distancia
  const focusU = uniform(9), rangeU = uniform(1.6), apertU = uniform(2.2);
  const W = uniform(new THREE.Vector4(0, 0, 0, 0));    // onda de cada capa
  const cW = uniform(0);                               // conexión de la nube
  const apU = uniform(0);                              // la red aparece (en espera, tenue)
  const preU = uniform(0);                             // la capa IA en espera se aclara en el primer cruce (D-13)
  const outK = uniform(0);                             // la red se apaga al final
  const headU = uniform(-1), straightK = uniform(0), sR3U = uniform(1e4), beatU = uniform(0), pathOut = uniform(0);

  const isK = (lay, k) => max(float(0), float(1).sub(abs(lay.sub(k))));
  const waveOf = (lay) => W.x.mul(isK(lay, 0)).add(W.y.mul(isK(lay, 1))).add(W.z.mul(isK(lay, 2))).add(W.w.mul(isK(lay, 3))).add(cW.mul(isK(lay, CLOUD)));
  /** estado de un punto de la red: lit (0 → 1 cuando la onda pasó), flash (destello en el frente de onda) */
  const stateOf = (arr, lay) => {
    const w = waveOf(lay);
    const front = w.mul(WAVE_K).sub(arr);
    const lit = smoothstep(0.0, 0.035, front);
    const flash = exp(front.mul(front).mul(-320)).mul(step(0.0, front)).mul(smoothstep(0.0, 0.03, w));
    const isCloud = isK(lay, CLOUD);
    // en espera: un resto apenas visible (la nube no tiene espera: aparece al conectarse)
    // la capa IA (1) sube su espera durante el primer cruce: en los otros dos la capa siguiente ya se lee en espera,
    // en este el cuadro quedaba vacío (u 24,2–24,45)
    const standby = apU.mul(float(0.13).add(preU.mul(isK(lay, 1)))).mul(float(1).sub(isCloud));
    const level = mix(standby, float(0.3), lit).mul(mix(float(1), float(0.22), outK));
    return { lit, flash: flash.mul(float(1).sub(outK)), level };
  };
  const fogOf = (d) => exp(d.mul(-0.042));
  const cocOf = (d) => max(abs(d.sub(focusU)).sub(rangeU), 0).div(d).mul(apertU).min(1.6);

  /* ---------- materiales ---------- */
  // líneas: quads que miran a la cámara, ~1,5 px de ancho (con antialias en el borde), en coordenadas del pasillo
  function lineMat({ widthPx, colorFn, path = false }) {
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const sideA = attribute('side', 'float');
    let pos = positionGeometry, dir = attribute('dir', 'vec3');
    if (path) { pos = mix(positionGeometry, attribute('pos2', 'vec3'), straightK.mul(attribute('mv', 'float'))); dir = mix(dir, attribute('dir2', 'vec3'), straightK.mul(attribute('mv', 'float'))); }
    const toCam = camL.sub(pos);
    const d = length(toCam);
    const coc = cocOf(d);
    const half = d.mul(pxW).mul(widthPx * 0.5).mul(coc.mul(1.2).add(1));
    m.positionNode = pos.add(normalize(cross(dir, toCam)).mul(half).mul(sideA));
    const aa = float(1).sub(smoothstep(0.35, 1.0, abs(sideA)));
    const near = smoothstep(0.5, 1.8, d);
    const k = aa.mul(near).mul(fogOf(d)).div(coc.mul(3.0).add(1)).mul(appear);
    m.colorNode = colorFn(d).mul(k);
    m.opacityNode = k;
    return m;
  }
  // puntos: sprites instanciados (redondos), tamaño en px, bokeh propio
  function pointMat({ pos, arr, lay, seed, sizePx, bright, square = false }) {
    const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const t = time.mul(0.15).add(seed.mul(40));
    const p = pos.add(vec3(sin(t), cos(t.mul(0.7)), sin(t.mul(0.5))).mul(square ? 0.0 : 0.035));
    m.positionNode = p;
    const d = distance(p, camL);
    const coc = cocOf(d);
    const { lit, flash, level } = stateOf(arr, lay);
    m.scaleNode = d.mul(pxW).mul(sizePx).mul(coc.mul(5).add(1)).mul(square ? float(1) : flash.mul(0.8).add(1));
    const r = length(uv().sub(0.5));
    let shape;
    if (square) {
      const q = max(abs(uv().x.sub(0.5)), abs(uv().y.sub(0.5)));
      const ring = smoothstep(0.3, 0.37, q).mul(float(1).sub(smoothstep(0.44, 0.5, q)));
      const core = float(1).sub(smoothstep(0.1, 0.17, q)).mul(lit);
      shape = ring.add(core.mul(0.9));
    } else {
      shape = mix(float(1).sub(smoothstep(0.05, 0.5, r)), float(1).sub(smoothstep(0.38, 0.5, r)).mul(0.55), smoothstep(0.1, 0.6, coc));
    }
    const energy = float(1).div(coc.mul(5).add(1).pow(1.6));
    const k = shape.mul(energy).mul(fogOf(d)).mul(smoothstep(0.45, 1.4, d)).mul(appear);
    // la nube conserva el rojo del haz del que viene; la red es fósforo (off-white) con el rojo sólo en el destello
    const tint = mix(OFF, RED.mul(1.5), isK(lay, CLOUD).mul(0.75));
    m.colorNode = tint.mul(level.mul(bright)).add(RED.mul(flash.mul(square ? 3.2 : 4.0))).mul(k);
    m.opacityNode = k;
    return m;
  }

  /* ---------- nube: el polvo del haz al apagarse la última pantalla (Frame by Frame) ---------- */
  const R = rng(20261011);
  const sc = FBF_SCREENS[FBF_SCREENS.length - 1], vd = VIDEOS[FBF_SCREENS.length - 1];
  const sh = sc.h, sw = sh * vd.width / vd.height;
  const lampC = V(0, 3.6, sc.z + 6.2 - 1.1);         // la lámpara al final de la sala (projector.js: riel de techo)
  const scM = new THREE.Matrix4().makeRotationY(sc.yaw).setPosition(sc.x, sc.y, sc.z);
  const corners = [V(-sw / 2, sh / 2, 0), V(sw / 2, sh / 2, 0), V(sw / 2, -sh / 2, 0), V(-sw / 2, -sh / 2, 0)].map((c) => c.applyMatrix4(scM));
  const NC = 520;
  const cloud = [];
  for (let i = 0; i < NC; i++) {
    const a = R(), b = R(), sp = 0.1 + 0.8 * Math.sqrt(R());
    const top = corners[0].clone().lerp(corners[1], a), bot = corners[3].clone().lerp(corners[2], a);
    const base = top.lerp(bot, b);
    const p = lampC.clone().lerp(base, sp * 1.06);
    p.add(V((R() - 0.5) * 1.8, (R() - 0.5) * 1.1, (R() - 0.5) * 1.8));
    cloud.push(p);
  }
  const cloudC = cloud.reduce((acc, p) => acc.add(p), V(0, 0, 0)).divideScalar(NC);
  // aristas de la nube: 3 vecinos más cercanos (≤ 0,8 m); el orden en que se conectan es al azar
  const cloudEdges = [];
  {
    const seen = new Set();
    for (let i = 0; i < NC; i++) {
      const ds = [];
      for (let j = 0; j < NC; j++) if (j !== i) ds.push([cloud[i].distanceToSquared(cloud[j]), j]);
      ds.sort((x, y) => x[0] - y[0]);
      for (let n = 0; n < 3; n++) {
        const [d2, j] = ds[n];
        if (d2 > 0.64) break;
        const key = i < j ? i * NC + j : j * NC + i;
        if (seen.has(key)) continue;
        seen.add(key);
        cloudEdges.push([i, j, R() * 0.92]);
      }
    }
  }
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- capas: un árbol por capa, en el espacio de su cámara de estadía ---------- */
  const toCamSpace = (nx, ny, d) => V(nx * T0 * A0 * d, ny * T0 * d, -d);
  const layers = [];
  for (let k = 0; k < NL; k++) {
    const r = rng(7919 * (k + 1));
    const s = STK_LAYERS[k].side, n = counts[k];
    const cols = n > 10 ? 3 : 2, rows = Math.ceil(n / cols);
    const x0 = s < 0 ? -0.24 : -0.9, x1 = s < 0 ? 0.9 : 0.24, cw = (x1 - x0) / cols;
    const spineX = s < 0 ? -0.31 : 0.31;
    const yTop = 0.52, yBot = -0.58, stepY = (yTop - yBot) / Math.max(1, rows - 1);
    const depthAt = (nx) => 6.8 + 2.4 * Math.abs(nx - spineX) / 1.2;
    const hubsN = [];
    for (let i = 0; i < n; i++) {
      const c = Math.floor(i / rows), rr = i % rows;
      const nx = x0 + c * cw + 0.02 + (r() - 0.5) * 0.03;
      const ny = yTop - rr * stepY - (c % 2) * stepY * 0.32 + (r() - 0.5) * 0.05;
      hubsN.push([nx, ny, depthAt(nx) + (r() - 0.5) * 0.6]);
    }
    const samples = [];     // { p, d (distancia por el árbol), parent }
    const segs = [];        // [i, j]
    const junctions = [], tips = [];
    const add = (p, parent) => {
      const d = parent >= 0 ? samples[parent].d + samples[parent].p.distanceTo(p) : 0;
      samples.push({ p, d, parent });
      const i = samples.length - 1;
      if (parent >= 0) segs.push([parent, i]);
      return i;
    };
    // tronco: de la raíz (arriba, fuera de cuadro) a la salida (abajo, fuera de cuadro), junto a la cabecera
    const root = toCamSpace(spineX + s * 0.015, 1.14, 8.1), exit = toCamSpace(spineX * 0.82, -1.14, 6.4);
    const trunkC = new THREE.CatmullRomCurve3([
      root, toCamSpace(spineX + 0.025, 0.42, 7.7), toCamSpace(spineX - 0.02, -0.3, 7.1), exit,
    ], false, 'centripetal');
    const trunkLen = trunkC.getLength(), nT = Math.ceil(trunkLen / 0.06);
    const trunk = [];
    let prev = -1;
    for (let i = 0; i <= nT; i++) {
      const p = trunkC.getPointAt(i / nT);
      p.x += Math.sin(i * 0.37 + k) * 0.012; p.z += Math.cos(i * 0.29 + k * 2) * 0.02;
      prev = add(p, prev); trunk.push(prev);
    }
    // ramas a cada nodo con nombre: desde el punto más cercano del árbol, curva suave con un desvío lateral
    const hubIdx = new Array(n);
    const order = hubsN.map((h, i) => i).sort((a, b) => hubsN[b][1] - hubsN[a][1] || hubsN[a][0] * s - hubsN[b][0] * s);
    for (const i of order) {
      const [nx, ny, d] = hubsN[i];
      const H = toCamSpace(nx, ny, d);
      let best = 0, bd = Infinity;
      for (let j = 0; j < samples.length; j++) {
        const q = samples[j].p;
        const dd = q.distanceToSquared(H) + Math.max(0, H.y - q.y) * 0.6;   // las ramas bajan o van a nivel
        if (dd < bd) { bd = dd; best = j; }
      }
      const T = samples[best].p.clone();
      const len = T.distanceTo(H);
      const mid = T.clone().lerp(H, 0.5);
      const perp = V(-(H.y - T.y), H.x - T.x, 0).normalize().multiplyScalar((r() - 0.5) * 0.36 * len);
      mid.add(perp); mid.y -= 0.06 * len; mid.z += (r() - 0.5) * 0.3;
      const bz = new THREE.QuadraticBezierCurve3(T, mid, H);
      const m = Math.max(3, Math.ceil(len / 0.06));
      let pi = best;
      for (let q = 1; q <= m; q++) pi = add(bz.getPoint(q / m), pi);
      hubIdx[i] = pi;
      junctions.push(best);
    }
    // ramitas sin nombre (con una bifurcación a veces): volumen y textura de árbol
    const nTw = 64 + (n > 10 ? 14 : 0);
    for (let q = 0; q < nTw; q++) {
      const from = Math.floor(r() * samples.length);
      const o = samples[from].p;
      const dir = V(r() - 0.5, (r() - 0.62) * 0.9, (r() - 0.5) * 1.2).normalize();
      const grow = (start, dir0, len, depth) => {
        const segN = Math.max(2, Math.ceil(len / 0.07));
        const bend = V(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.6);
        let pi = start;
        const p = samples[start].p.clone(), dd = dir0.clone();
        for (let z = 0; z < segN; z++) {
          dd.addScaledVector(bend, 1 / segN).normalize();
          p.addScaledVector(dd, len / segN);
          pi = add(p.clone(), pi);
          if (depth === 0 && z === Math.floor(segN * 0.55) && r() < 0.45) {
            junctions.push(pi);
            grow(pi, dd.clone().add(V(r() - 0.5, r() - 0.5, r() - 0.5)).normalize(), len * (0.35 + r() * 0.3), 1);
          }
        }
        tips.push(pi);
      };
      void o;
      grow(from, dir, 0.22 + r() * 0.55, 0);
    }
    const maxD = Math.max(...hubIdx.map((i) => samples[i].d));
    const arrOf = (i) => Math.min(1.35, samples[i].d / maxD);
    // polvo sináptico: alrededor de las ramas (y un poco suelto en el volumen de la capa)
    const dust = [];
    for (let q = 0; q < 860; q++) {
      const i = Math.floor(r() * samples.length);
      const o = V(gauss(r) * 0.22, gauss(r) * 0.2, gauss(r) * 0.3);
      dust.push([samples[i].p.clone().add(o), Math.min(1.35, arrOf(i) + o.length() * 0.08)]);
    }
    for (let q = 0; q < 160; q++) {
      const nx = (r() * 2 - 1) * 1.05, ny = (r() * 2 - 1) * 1.05, d = 5.5 + r() * 5;
      dust.push([toCamSpace(nx, ny, d), 0.2 + r() * 1.1]);
    }
    layers.push({ k, s, samples, segs, hubIdx, junctions, tips, dust, trunk, arrOf, root: trunk[0], exit: trunk[trunk.length - 1] });
    await yieldToMain();
    if (!alive()) return null;
  }

  /* ---------- geometría (posiciones en coordenadas del pasillo: place() las escribe) ---------- */
  // líneas de las capas + la nube + axones entre capas: un solo mesh de quads
  const AX_PER = 4, AX_SEG = 36;
  const lineSegs = [];       // { lay, a: [k, i] | world, b, arrA, arrB, seed }
  layers.forEach((L) => L.segs.forEach(([a, b]) => lineSegs.push({ lay: L.k, a: [L.k, a], b: [L.k, b], arrA: L.arrOf(a), arrB: L.arrOf(b), seed: R() })));
  cloudEdges.forEach(([i, j, ar]) => lineSegs.push({ lay: CLOUD, a: [-1, i], b: [-1, j], arrA: ar, arrB: ar, seed: R() }));
  const axons = [];
  for (let k = 0; k < NL - 1; k++) {
    for (let q = 0; q < AX_PER; q++) {
      const A = layers[k], B = layers[k + 1];
      const ia = A.tips[Math.floor(R() * A.tips.length)], ib = B.samples.length ? Math.floor(R() * B.samples.length) : 0;
      axons.push({ k, ia, ib, sag: 0.6 + R() * 1.4, side: (R() - 0.5) * 2 });
    }
  }
  const nAxSegs = axons.length * AX_SEG;
  const NSEG = lineSegs.length + nAxSegs;
  const lPos = new Float32Array(NSEG * 4 * 3), lDir = new Float32Array(NSEG * 4 * 3);
  const lSide = new Float32Array(NSEG * 4), lArr = new Float32Array(NSEG * 4), lLay = new Float32Array(NSEG * 4), lSeed = new Float32Array(NSEG * 4);
  const lIdx = new Uint32Array(NSEG * 6);
  for (let i = 0; i < NSEG; i++) {
    const v = i * 4;
    lSide[v] = -1; lSide[v + 1] = 1; lSide[v + 2] = -1; lSide[v + 3] = 1;
    const o = i * 6;
    lIdx[o] = v; lIdx[o + 1] = v + 1; lIdx[o + 2] = v + 2; lIdx[o + 3] = v + 1; lIdx[o + 4] = v + 3; lIdx[o + 5] = v + 2;
  }
  lineSegs.forEach((sg, i) => {
    const v = i * 4;
    lArr[v] = lArr[v + 1] = sg.arrA; lArr[v + 2] = lArr[v + 3] = sg.arrB;
    lLay[v] = lLay[v + 1] = lLay[v + 2] = lLay[v + 3] = sg.lay;
    lSeed[v] = lSeed[v + 1] = lSeed[v + 2] = lSeed[v + 3] = sg.seed;
  });
  axons.forEach((ax, q) => {
    for (let z = 0; z < AX_SEG; z++) {
      const v = (lineSegs.length + q * AX_SEG + z) * 4;
      // se encienden con la capa de abajo (la señal llega por ellos)
      lArr[v] = lArr[v + 1] = 0.05 + 0.25 * z / AX_SEG; lArr[v + 2] = lArr[v + 3] = 0.05 + 0.25 * (z + 1) / AX_SEG;
      lLay[v] = lLay[v + 1] = lLay[v + 2] = lLay[v + 3] = ax.k + 1;
      lSeed[v] = lSeed[v + 1] = lSeed[v + 2] = lSeed[v + 3] = 0.3;
    }
  });
  const lGeo = new THREE.BufferGeometry();
  const lPosA = new THREE.BufferAttribute(lPos, 3), lDirA = new THREE.BufferAttribute(lDir, 3);
  lGeo.setAttribute('position', lPosA); lGeo.setAttribute('dir', lDirA);
  lGeo.setAttribute('side', new THREE.BufferAttribute(lSide, 1)); lGeo.setAttribute('arr', new THREE.BufferAttribute(lArr, 1));
  lGeo.setAttribute('lay', new THREE.BufferAttribute(lLay, 1)); lGeo.setAttribute('seed', new THREE.BufferAttribute(lSeed, 1));
  lGeo.setIndex(new THREE.BufferAttribute(lIdx, 1));
  const linesM = lineMat({
    widthPx: 1.5,
    colorFn: () => {
      const arr = attribute('arr', 'float'), lay = attribute('lay', 'float'), seed = attribute('seed', 'float');
      const { lit, flash, level } = stateOf(arr, lay);
      // pulsos que corren por las ramas hacia afuera (la red viva); más lentos en la nube
      const ph = fract(arr.mul(4.0).sub(time.mul(0.22)).add(lay.mul(0.37)).add(seed.mul(0.15)));
      const pulse = smoothstep(0.94, 1.0, ph).mul(lit).mul(float(1).sub(outK)).mul(float(1).sub(isK(lay, CLOUD).mul(0.6)));
      const tint = mix(OFF, RED.mul(1.5), isK(lay, CLOUD).mul(0.75));
      return tint.mul(level.mul(mix(float(0.55), float(0.4), isK(lay, CLOUD)))).add(RED.mul(flash.mul(2.4).add(pulse.mul(0.55))));
    },
  });
  const linesMesh = new THREE.Mesh(lGeo, linesM);
  linesMesh.frustumCulled = false; linesMesh.renderOrder = 6;
  net.add(linesMesh);

  // puntos: polvo + uniones + puntas + nube (redondos)
  const pts = [];          // [ref, arr, lay, sizePx, bright]
  layers.forEach((L) => {
    L.dust.forEach(([p, a]) => pts.push([{ k: L.k, p }, a, L.k, 1.8 + R() * 1.2, 0.85]));
    L.junctions.forEach((i) => pts.push([{ k: L.k, i }, L.arrOf(i), L.k, 3.0, 1.0]));
    L.tips.forEach((i) => pts.push([{ k: L.k, i }, L.arrOf(i), L.k, 2.4, 0.9]));
  });
  cloud.forEach((p, i) => pts.push([{ k: -1, p }, cloudEdges.length ? R() * 0.6 : 0, CLOUD, 2.1 + R() * 1.2, 0.8]));
  const NP = pts.length;
  const pPos = new Float32Array(NP * 3), pArr = new Float32Array(NP), pLay = new Float32Array(NP), pSize = new Float32Array(NP), pBr = new Float32Array(NP), pSeed = new Float32Array(NP);
  pts.forEach(([, a, lay, sz, br], i) => { pArr[i] = a; pLay[i] = lay; pSize[i] = sz; pBr[i] = br; pSeed[i] = R(); });
  const pPosA = new THREE.InstancedBufferAttribute(pPos, 3);
  const pointsM = pointMat({
    pos: instancedBufferAttribute(pPosA),
    arr: instancedBufferAttribute(new THREE.InstancedBufferAttribute(pArr, 1)),
    lay: instancedBufferAttribute(new THREE.InstancedBufferAttribute(pLay, 1)),
    seed: instancedBufferAttribute(new THREE.InstancedBufferAttribute(pSeed, 1)),
    sizePx: instancedBufferAttribute(new THREE.InstancedBufferAttribute(pSize, 1)),
    bright: instancedBufferAttribute(new THREE.InstancedBufferAttribute(pBr, 1)),
  });
  const points = new THREE.Sprite(pointsM);
  points.count = NP; points.frustumCulled = false; points.renderOrder = 7;
  net.add(points);

  // nodos con nombre: cuadrados (el marcador del sitio), más grandes
  const hubRefs = [];
  layers.forEach((L) => L.hubIdx.forEach((i) => hubRefs.push({ k: L.k, i, arr: L.arrOf(i) })));
  const NH = hubRefs.length;
  const hPos = new Float32Array(NH * 3), hArr = new Float32Array(NH), hLay = new Float32Array(NH), hSeed = new Float32Array(NH);
  hubRefs.forEach((h, q) => { hArr[q] = h.arr; hLay[q] = h.k; hSeed[q] = R(); });
  const hPosA = new THREE.InstancedBufferAttribute(hPos, 3);
  const hubsM = pointMat({
    pos: instancedBufferAttribute(hPosA),
    arr: instancedBufferAttribute(new THREE.InstancedBufferAttribute(hArr, 1)),
    lay: instancedBufferAttribute(new THREE.InstancedBufferAttribute(hLay, 1)),
    seed: instancedBufferAttribute(new THREE.InstancedBufferAttribute(hSeed, 1)),
    sizePx: float(9), bright: float(1.9), square: true,
  });
  const hubs = new THREE.Sprite(hubsM);
  hubs.count = NH; hubs.frustumCulled = false; hubs.renderOrder = 8;
  net.add(hubs);
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- el camino de la señal: una cinta roja continua (nube → capas → abajo) ---------- */
  const PM = 1800;
  const qPos = new Float32Array(PM * 4 * 3), qDir = new Float32Array(PM * 4 * 3), qPos2 = new Float32Array(PM * 4 * 3), qDir2 = new Float32Array(PM * 4 * 3);
  const qSide = new Float32Array(PM * 4), qArr = new Float32Array(PM * 4), qMv = new Float32Array(PM * 4);
  const qIdx = new Uint32Array(PM * 6);
  for (let i = 0; i < PM; i++) {
    const v = i * 4;
    qSide[v] = -1; qSide[v + 1] = 1; qSide[v + 2] = -1; qSide[v + 3] = 1;
    const o = i * 6;
    qIdx[o] = v; qIdx[o + 1] = v + 1; qIdx[o + 2] = v + 2; qIdx[o + 3] = v + 1; qIdx[o + 4] = v + 3; qIdx[o + 5] = v + 2;
  }
  const pGeo = new THREE.BufferGeometry();
  const qPosA = new THREE.BufferAttribute(qPos, 3), qDirA = new THREE.BufferAttribute(qDir, 3), qPos2A = new THREE.BufferAttribute(qPos2, 3), qDir2A = new THREE.BufferAttribute(qDir2, 3);
  const qArrA = new THREE.BufferAttribute(qArr, 1), qMvA = new THREE.BufferAttribute(qMv, 1);
  pGeo.setAttribute('position', qPosA); pGeo.setAttribute('dir', qDirA); pGeo.setAttribute('pos2', qPos2A); pGeo.setAttribute('dir2', qDir2A);
  pGeo.setAttribute('side', new THREE.BufferAttribute(qSide, 1)); pGeo.setAttribute('arr', qArrA); pGeo.setAttribute('mv', qMvA);
  pGeo.setIndex(new THREE.BufferAttribute(qIdx, 1));
  const pathM = lineMat({
    widthPx: 1.9, path: true,
    colorFn: () => {
      const sA = attribute('arr', 'float'), mv = attribute('mv', 'float');
      const behind = headU.sub(sA);
      const vis = step(0.0, behind);
      // fósforo: lo recién recorrido brilla, lo viejo queda tenue; el cabezal es un punto caliente
      const fresh = exp(behind.mul(-0.16));
      const hot = exp(behind.mul(behind).mul(-14));
      // al final: lo anterior a la última capa se apaga; la recta late (un pulso que baja cada 2,1 s)
      const keep = mix(float(1), mix(float(0.18), float(1), mv), pathOut);
      const bx = sA.sub(sR3U).sub(beatU);
      const beat = exp(bx.mul(bx).mul(-1.2)).mul(mv).mul(straightK).mul(1.6);
      const br = float(0.22).add(fresh.mul(1.0)).add(hot.mul(2.4)).add(beat).mul(vis).mul(keep);
      return RED.mul(br.mul(2.5));
    },
  });
  const pathMesh = new THREE.Mesh(pGeo, pathM);
  pathMesh.frustumCulled = false; pathMesh.renderOrder = 9;
  net.add(pathMesh);
  // cabezal de la señal
  const headMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const headK = uniform(0);
  {
    const r = length(uv().sub(0.5));
    headMat.colorNode = RED.mul(7.0).mul(float(1).sub(smoothstep(0.0, 0.5, r)).pow(3)).mul(appear);
    headMat.opacityNode = float(1).sub(smoothstep(0.0, 0.5, r)).mul(headK).mul(appear);
  }
  const head = new THREE.Sprite(headMat);
  head.scale.setScalar(0.14); head.renderOrder = 10;
  net.add(head);

  corr.group.add(net);
  // las pantallas de la sala (grupos dentro de 'fbf-hall', projector.js): apagadas son siluetas casi negras que
  // tapan la nube y la red con un rectángulo. Pasado el final de Frame by Frame se ocultan (no se ven: están negras).
  const hall = corr.group.getObjectByName('fbf-hall');
  const screensOf = () => (hall ? hall.children.filter((c) => c.isGroup) : []);
  let screensHidden = false;

  /* ---------- colocación: espacio de cada cámara de estadía → pasillo (con el aspecto actual) ---------- */
  let pA = 0, pT = 0;
  const W2 = []; // posiciones de pasillo de cada muestra, por capa
  const hubW = layers.map((L) => L.hubIdx.map(() => V(0, 0, 0)));
  const hubC = layers.map(() => V(0, 0, 0));
  const pathPts = [];        // muestras del camino (pasillo)
  const pathS = new Float32Array(PM + 1);
  const pathStraight = [];
  const marks = { R: [], E: [], end: 0, lineX: 0, lineZ: 0, yTop: 0 };
  const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0);
  function toWorld(k, p, out) {
    out.set(p.x * (pT * pA) / (T0 * A0), p.y * pT / T0, p.z).applyMatrix4(DWELL[k].m);
    return out;
  }
  const refPos = (ref, out) => (ref.k < 0 ? out.copy(ref.p) : ref.i !== undefined ? out.copy(W2[ref.k][ref.i]) : toWorld(ref.k, ref.p, out));
  function writeQuad(arrPos, arrDir, i, a, b) {
    const v = i * 12;
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    for (let c = 0; c < 4; c++) {
      const p = c < 2 ? a : b;
      arrPos[v + c * 3] = p.x; arrPos[v + c * 3 + 1] = p.y; arrPos[v + c * 3 + 2] = p.z;
      arrDir[v + c * 3] = dx; arrDir[v + c * 3 + 1] = dy; arrDir[v + c * 3 + 2] = dz;
    }
  }
  function place() {
    pA = camera.aspect; pT = Math.tan((fovOf(pA) / 2) * D2R);
    layers.forEach((L, k) => {
      W2[k] = L.samples.map((s) => toWorld(k, s.p, V(0, 0, 0)));
      L.hubIdx.forEach((i, q) => hubW[k][q].copy(W2[k][i]));
      hubC[k].set(0, 0, 0); hubW[k].forEach((h) => hubC[k].add(h)); hubC[k].divideScalar(hubW[k].length);
    });
    // líneas
    const a = V(0, 0, 0), b = V(0, 0, 0);
    lineSegs.forEach((sg, i) => {
      if (sg.lay === CLOUD) { a.copy(cloud[sg.a[1]]); b.copy(cloud[sg.b[1]]); }
      else { a.copy(W2[sg.a[0]][sg.a[1]]); b.copy(W2[sg.b[0]][sg.b[1]]); }
      writeQuad(lPos, lDir, i, a, b);
    });
    axons.forEach((ax, q) => {
      const A = W2[ax.k][ax.ia], B = W2[ax.k + 1][ax.ib];
      const mid = A.clone().lerp(B, 0.5); mid.y -= ax.sag; mid.x += ax.side * 1.2;
      const cv = new THREE.QuadraticBezierCurve3(A, mid, B);
      for (let z = 0; z < AX_SEG; z++) writeQuad(lPos, lDir, lineSegs.length + q * AX_SEG + z, cv.getPoint(z / AX_SEG, a), cv.getPoint((z + 1) / AX_SEG, b));
    });
    lPosA.needsUpdate = true; lDirA.needsUpdate = true;
    // puntos
    pts.forEach(([ref], i) => { refPos(ref, tmp); pPos[i * 3] = tmp.x; pPos[i * 3 + 1] = tmp.y; pPos[i * 3 + 2] = tmp.z; });
    pPosA.needsUpdate = true;
    hubRefs.forEach((h, q) => { const p = W2[h.k][h.i]; hPos[q * 3] = p.x; hPos[q * 3 + 1] = p.y; hPos[q * 3 + 2] = p.z; });
    hPosA.needsUpdate = true;
    buildPath();
  }
  // el camino: hilo por la nube → por encima de la pantalla → raíz de cada capa → tronco → salida → … → abajo
  const thread = (() => {
    const seq = [];
    let cur = 0, bd = Infinity;
    cloud.forEach((p, i) => { const d = p.distanceToSquared(cloudC); if (d < bd) { bd = d; cur = i; } });
    const goal = V(-0.7, 4.75, sc.z - 0.2);
    const used = new Set([cur]); seq.push(cur);
    for (let st = 0; st < 6; st++) {
      const c = cloud[cur];
      const cand = cloud.map((p, i) => [p.distanceToSquared(c), i]).filter(([, i]) => !used.has(i)).sort((x, y) => x[0] - y[0]).slice(0, 14);
      let best = cand[0][1], bs = -Infinity;
      cand.forEach(([d2, i]) => {
        const gain = c.distanceTo(goal) - cloud[i].distanceTo(goal);
        const sc2 = gain - Math.abs(Math.sqrt(d2) - 0.45) * 0.6;
        if (sc2 > bs) { bs = sc2; best = i; }
      });
      used.add(best); seq.push(best); cur = best;
    }
    return seq;
  })();
  function buildPath() {
    const all = [];
    const push = (pc) => pc.forEach((p, q) => { if (!(all.length && q === 0 && all[all.length - 1].distanceToSquared(p) < 1e-8)) all.push(p); });
    const sampleCurve = (pts0, step = 0.05) => {
      const cv = new THREE.CatmullRomCurve3(pts0, false, 'centripetal');
      const n = Math.max(2, Math.ceil(cv.getLength() / step));
      const out = [];
      for (let i = 0; i <= n; i++) out.push(cv.getPointAt(i / n));
      return out;
    };
    const over = V(-0.7, 4.75, sc.z - 0.2), over2 = V(-0.65, 4.85, sc.z - 4.0);
    const roots = layers.map((L) => W2[L.k][L.root]), exits = layers.map((L) => W2[L.k][L.exit]);
    const at = { R: [], E: [] };
    push(sampleCurve([...thread.map((i) => cloud[i]), over, over2, roots[0]]));
    layers.forEach((L, k) => {
      at.R[k] = all.length - 1;                       // la curva anterior termina exactamente en la raíz
      push(L.trunk.map((i) => W2[k][i]));
      at.E[k] = all.length - 1;
      if (k < NL - 1) {
        const mid = exits[k].clone().lerp(roots[k + 1], 0.5); mid.y -= 1.3;
        push(sampleCurve([exits[k], mid, roots[k + 1]]));
      } else {
        push(sampleCurve([exits[k], exits[k].clone().add(V(0, -3, -0.3)), exits[k].clone().add(V(0, -16, -0.6))]));
      }
    });
    // arco acumulado del polilineal y remuestreo a PM tramos iguales
    const cum = [0];
    for (let i = 1; i < all.length; i++) cum.push(cum[i - 1] + all[i].distanceTo(all[i - 1]));
    const total = cum[cum.length - 1];
    marks.R = at.R.map((i) => cum[i]); marks.E = at.E.map((i) => cum[i]); marks.end = total;
    pathPts.length = 0;
    let j = 0;
    for (let i = 0; i <= PM; i++) {
      const s = (i / PM) * total;
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const f = (s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
      pathPts.push(all[j].clone().lerp(all[j + 1], Math.min(1, Math.max(0, f))));
      pathS[i] = s;
    }
    // la recta final: x/z medios del tronco de la última capa, y hacia abajo desde su raíz
    const L3 = layers[NL - 1];
    let lx = 0, lz = 0;
    L3.trunk.forEach((i) => { lx += W2[NL - 1][i].x; lz += W2[NL - 1][i].z; });
    lx /= L3.trunk.length; lz /= L3.trunk.length;
    const sR3 = marks.R[NL - 1], yR3 = roots[NL - 1].y;
    marks.lineX = lx; marks.lineZ = lz; marks.yTop = yR3;
    sR3U.value = sR3;
    pathStraight.length = 0;
    for (let i = 0; i <= PM; i++) {
      const s = pathS[i];
      pathStraight.push(s >= sR3 ? V(lx, yR3 - (s - sR3), lz) : pathPts[i].clone());
    }
    for (let i = 0; i < PM; i++) {
      writeQuad(qPos, qDir, i, pathPts[i], pathPts[i + 1]);
      writeQuad(qPos2, qDir2, i, pathStraight[i], pathStraight[i + 1]);
      const v = i * 4;
      qArr[v] = qArr[v + 1] = pathS[i]; qArr[v + 2] = qArr[v + 3] = pathS[i + 1];
      const mv = pathS[i] >= sR3 - 1e-6 ? 1 : 0;
      qMv[v] = qMv[v + 1] = qMv[v + 2] = qMv[v + 3] = mv;
    }
    qPosA.needsUpdate = qDirA.needsUpdate = qPos2A.needsUpdate = qDir2A.needsUpdate = qArrA.needsUpdate = qMvA.needsUpdate = true;
  }
  const pathAt = (s, out) => {
    const total = marks.end;
    const f = Math.min(PM, Math.max(0, (s / total) * PM)), i = Math.min(PM - 1, Math.floor(f));
    out.copy(pathPts[i]).lerp(pathPts[i + 1], f - i);
    tmp2.copy(pathStraight[i]).lerp(pathStraight[i + 1], f - i);
    return out.lerp(tmp2, straightK.value);
  };
  place();
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- cámara: llaves en u (coordenadas del pasillo) ---------- */
  let KEYS = [], posCurve = null, lookCurve = null;
  const k0P = V(1e9, 0, 0), k0L = V(1e9, 0, 0);
  let keyAspect = 0;
  const dwellPose = (k, which) => {
    const D = DWELL[k], s = D.s;
    const right = V(-D.fwd.z, 0, D.fwd.x).normalize();
    // A: un poco atrás y del lado de la cabecera (orbit corto); B: adelante y del otro lado. Centro = diseño.
    if (which === 'A') return { p: D.p.clone().addScaledVector(D.fwd, -0.55).addScaledVector(right, s * 0.3).add(V(0, 0.12, 0)), l: D.l.clone().addScaledVector(right, s * 0.25) };
    return { p: D.p.clone().addScaledVector(D.fwd, 0.45).addScaledVector(right, -s * 0.22).add(V(0, -0.08, 0)), l: D.l.clone().addScaledVector(right, -s * 0.2) };
  };
  function finalPose(tanV, aspect) {
    // horizontal (pitch 0: la recta se ve vertical), un poco más atrás que la estadía; la recta en +0,3 NDC
    const C = V(marks.lineX, marks.yTop - 2.6, marks.lineZ);
    const D = DWELL[NL - 1];
    const p = V(D.p.x - 0.4, C.y, D.p.z + 1.4);
    const f = C.clone().sub(p).setY(0); const dh = f.length(); f.divideScalar(dh);
    const right = V(-f.z, 0, f.x);
    const l = C.clone().addScaledVector(right, -0.3 * tanV * aspect * dh);
    return { p, l };
  }
  function buildKeys(P0, L0, tanV, aspect) {
    const K = [];
    K.push([FBF_END, P0.clone(), L0.clone()]);
    // los puntos se conectan: la cámara empuja despacio hacia la nube
    const toC = cloudC.clone().sub(P0).normalize();
    K.push([STK_CONNECT[1], P0.clone().addScaledVector(toC, 1.3).add(V(0, 0.15, 0)), L0.clone().lerp(cloudC, 0.6)]);
    // crane por encima de la pantalla apagada, entre sus cables; la nube queda abajo y la red aparece adelante
    K.push([STK_INTRO[1] - 0.3, V(-1.3, 4.25, sc.z + 3.6), V(-0.7, 3.4, DWELL[0].p.z - 7)]);
    STK_DWELLS.forEach((d, k) => {
      const A = dwellPose(k, 'A'), B = dwellPose(k, 'B');
      K.push([d[0], A.p, A.l, true]);
      K.push([d[1], B.p, B.l]);
      const nx = STK_DWELLS[k + 1];
      if (nx) {
        const An = dwellPose(k + 1, 'A');
        // cruce: la cámara atraviesa la capa (las ramas pasan junto a la lente) y baja a la siguiente
        const pm = B.p.clone().lerp(An.p, 0.5); pm.y += 0.5;
        K.push([(d[1] + nx[0]) / 2, pm, B.l.clone().lerp(An.l, 0.6)]);
      }
    });
    const F = finalPose(tanV, aspect);
    K.push([STK_END, F.p, F.l]);
    KEYS = K;
    posCurve = new THREE.CatmullRomCurve3(K.map((x) => x[1]), false, 'centripetal');
    lookCurve = new THREE.CatmullRomCurve3(K.map((x) => x[2]), false, 'centripetal');
  }
  function keyParam(u) {
    u = Math.min(STK_END, Math.max(FBF_END, u));
    let i = 0;
    while (i < KEYS.length - 2 && u >= KEYS[i + 1][0]) i++;
    const a = KEYS[i][0], b = KEYS[i + 1][0];
    const l = Math.min(1, Math.max(0, (u - a) / (b - a)));
    return (i + (KEYS[i][3] ? l : easeIO(l))) / (KEYS.length - 1);
  }
  /** Pose de la red para u > FBF_END. P/L llegan con la última pose de Frame by Frame: es la primera llave. */
  function pose(u, cam, P, L) {
    const tanV = Math.tan((fovOf(cam.aspect) / 2) * D2R);
    if (cam.aspect !== keyAspect || P.distanceToSquared(k0P) > 1e-6 || L.distanceToSquared(k0L) > 1e-6) {
      if (cam.aspect !== pA) place();
      keyAspect = cam.aspect; k0P.copy(P); k0L.copy(L);
      buildKeys(P, L, tanV, cam.aspect);
    }
    const k01 = keyParam(u);
    posCurve.getPoint(k01, P); lookCurve.getPoint(k01, L);
  }
  /** deriva de la cámara viva (la escala corridor.js): sale de la de la sala (0,6 al final) y queda en 0,7 */
  const calm = (u) => 0.6 + 0.1 * smooth(FBF_END, STK_INTRO[1], u) - 0.35 * smooth(STK_OUT[0], STK_END, u);

  /* ---------- cabezal: arco recorrido en función de u ---------- */
  const layerOf = (k) => layers[k];
  function headArc(u) {
    const t0 = STK_CONNECT[1] - 0.25;
    if (u < t0) return -1;
    const firstArrive = STK_DWELLS[0][0] - 0.45;
    if (u < firstArrive) return easeIO((u - t0) / (firstArrive - t0)) * marks.R[0];
    for (let k = 0; k < NL; k++) {
      const d = STK_DWELLS[k];
      const w = stkWave(k, u);
      const L = layerOf(k);
      const maxD = Math.max(...L.hubIdx.map((i) => L.samples[i].d));
      const sIn = Math.min(marks.E[k], marks.R[k] + w * WAVE_K * maxD);
      const leave = d[1] - 0.15;
      if (u < leave) return sIn;
      if (k < NL - 1) {
        const arrive = STK_DWELLS[k + 1][0] - 0.45;
        if (u < arrive) return marks.E[k] + easeIO((u - leave) / (arrive - leave)) * (marks.R[k + 1] - marks.E[k]);
      } else {
        return marks.E[k] + easeIO((u - STK_OUT[0]) / (STK_END - STK_OUT[0])) * (marks.end - 0.5 - marks.E[k]);
      }
    }
    return marks.end;
  }

  /* ---------- estado por frame ---------- */
  const st = { focus: 9, range: 1.6, mode: '', active: -1, built: true };
  const fwd = V(0, 0, 0), q = V(0, 0, 0), wv = V(0, 0, 0), camW = V(0, 0, 0);
  const itemsOn = layers.map((L) => L.hubIdx.map(() => false));
  const hubArr = layers.map((L) => L.hubIdx.map((i) => L.arrOf(i)));
  const hideItems = (k) => {
    const els = S.stk && S.stk.items[k];
    if (!els) return;
    els.forEach((el, i) => { if (itemsOn[k][i] || el.hasAttribute('data-on')) { itemsOn[k][i] = false; el.removeAttribute('data-on'); } });
  };
  function placeItems(u, w) {
    const all = S.stk && S.stk.items;
    if (!all) return;
    for (let k = 0; k < NL; k++) {
      const els = all[k];
      if (!els || !els.length) continue;
      const inWin = S.stk.live && stkItemsWindow(k, u);
      if (!inWin) { hideItems(k); continue; }
      for (let i = 0; i < els.length && i < hubW[k].length; i++) {
        const el = els[i];
        const on = hubArr[k][i] <= w[k] * WAVE_K;
        wv.copy(hubW[k][i]).applyMatrix4(net.matrixWorld).project(camera);
        const vis = on && wv.z < 1 && wv.z > -1;
        // contra el atributo real (el HTML lo limpia al pasar a escena viva): nunca queda un rótulo trabado
        if (vis !== el.hasAttribute('data-on')) el.toggleAttribute('data-on', vis);
        itemsOn[k][i] = vis;
        if (wv.z < 1) {
          const x = (wv.x * 0.5 + 0.5) * innerWidth, y = (-wv.y * 0.5 + 0.5) * innerHeight;
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        }
      }
    }
  }

  /** Estado de la red para u. Escribe uniforms y rótulos; devuelve el foco, o null antes de la red. */
  function update(u, t, dt, gw, P, L) {
    const on = u > FBF_END - 0.6;
    net.visible = on;
    if (!on) {
      st.active = -1; if (S.stk) S.stk.active = -1; for (let k = 0; k < NL; k++) hideItems(k);
      if (screensHidden) { screensHidden = false; screensOf().forEach((g) => { g.visible = true; }); }
      return null;
    }
    if (camera.aspect !== pA) place();
    const hide = u > FBF_END + 0.08;
    if (hide !== screensHidden) { screensHidden = hide; screensOf().forEach((g) => { g.visible = !hide; }); }
    net.updateMatrixWorld();
    camW.copy(camera.position);
    camL.value.copy(net.worldToLocal(camW));
    pxW.value = 2 * Math.tan((camera.fov / 2) * D2R) / innerHeight;

    const w = STK_LAYERS.map((_, k) => stkWave(k, u));
    W.value.set(w[0], w[1], w[2], w[3]);
    cW.value = smooth(STK_CONNECT[0] - 0.05, STK_CONNECT[1], u);
    apU.value = smooth(22.2, 22.75, u);
    preU.value = 0.22 * smooth(STK_DWELLS[0][1] - 0.15, STK_DWELLS[0][1] + 0.1, u);
    outK.value = smooth(STK_OUT[0], STK_OUT[0] + 0.55, u);
    pathOut.value = smooth(STK_OUT[0], STK_END, u);
    straightK.value = easeIO(smooth(STK_OUT[0] + 0.1, STK_END, u));
    beatU.value = ((t % 2.1) / 2.1) * 9 - 1;
    const h = headArc(u);
    headU.value = h;
    if (h >= 0 && h < marks.end - 0.6) { pathAt(h, head.position); headK.value = 1; } else headK.value = 0;

    // foco: qué está nítido (la nube, la capa, la próxima raíz, la recta). Cada cambio de modo = rack focus.
    fwd.copy(L).sub(P).normalize();
    let mode, fT, rT;
    const dIdx = STK_DWELLS.findIndex((d) => u >= d[0] - 0.2 && u <= d[1] + 0.05);
    if (u < STK_INTRO[1] - 0.3) { mode = 'stk-connect'; fT = q.copy(cloudC).sub(P).dot(fwd); rT = 1.6; }
    else if (u > STK_DWELLS[NL - 1][1] + 0.05) { mode = 'stk-out'; fT = q.set(marks.lineX, P.y, marks.lineZ).sub(P).dot(fwd); rT = 3.5; }
    else if (dIdx >= 0) { mode = 'stk' + dIdx; fT = q.copy(hubC[dIdx]).sub(P).dot(fwd); rT = 1.4; }
    else {
      const nx = STK_DWELLS.findIndex((d) => u < d[0]);
      mode = 'stk-travel' + nx; fT = q.copy(hubC[Math.max(0, nx)]).sub(P).dot(fwd); rT = 2.6;
    }
    st.mode = mode;
    st.focus = damp(st.focus, Math.max(0.8, fT), 2.4, dt);
    st.range = damp(st.range, rT, 2.4, dt);
    focusU.value = st.focus; rangeU.value = st.range;
    st.active = dIdx;
    if (S.stk) S.stk.active = dIdx;
    placeItems(u, w);
    // hasta el final de Frame by Frame el foco es de la sala (su plano de salida); desde ahí, de la red
    if (u <= FBF_END) return null;
    // el post abre el rango del DOF: el desenfoque de la red lo hace cada punto (ver arriba)
    return { mode, fT, rT: 400 };
  }

  /** precalentado: la red visible para que compileAsync la incluya */
  const warm = (v) => { net.visible = v; headK.value = v ? 1 : 0; };

  return {
    group: net, pose, calm, update, warm, U0: FBF_END,
    /** la recta final (coordenadas del pasillo): x/z, arriba (raíz de la última capa) y abajo (donde termina). La
        lee Experience (ecg.js) para seguir la misma línea. Cambia con el aspecto de la ventana (place()). */
    line: () => ({ x: marks.lineX, z: marks.lineZ, yTop: marks.yTop, yBot: marks.yTop - (marks.end - sR3U.value) }),
    info: () => ({ stk: st.mode, focus: +st.focus.toFixed(2), head: +headU.value.toFixed(2), end: +marks.end.toFixed(1), w: [...W.value.toArray()].map((x) => +x.toFixed(2)), nodes: NP + NH, segs: NSEG + PM, built: st.built }),
    dispose: () => { for (let k = 0; k < NL; k++) hideItems(k); },
  };
}
