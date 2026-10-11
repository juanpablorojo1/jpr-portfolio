/* Frame by Frame «sala de proyección» dentro de la escena persistente «Señal» (U4, 2026-10-10).
   Projects termina con el cabezal como única luz en el umbral del último vano. Acá el cabezal se despega del riel,
   sube por el vano y sigue por un riel de techo: es la lámpara de un proyector. Del otro lado del vano, una sala a
   oscuras con las cinco pantallas colgadas a distinta profundidad (frames.ts, en el orden fijo de Juan). El haz es una
   pirámide de luz roja de la lámpara a las cuatro esquinas de la pantalla en foco, con polvo que se enciende adentro;
   barre de una pantalla a la otra mientras la lámpara avanza por el riel de techo y la cámara hace travelling con rack
   focus. La pantalla que recibe el haz se enciende (arranque de lámpara) y su video corre mudo; las demás quedan como
   fantasmas. Al apagarse la última, el haz se apaga y el polvo que estaba adentro queda encendido: puntos (Stack).

   Se arma dentro de buildCorridor (mismo grupo, mismas coordenadas del pasillo, mismo post: DOF + bloom del rojo +
   grano), así el relevo Projects → Frame by Frame es la misma toma. Los videos: <video> fuera del DOM, mudos, con
   src recién al acercarse su estadía; corren sólo en foco, con la escena a la vista, la pestaña visible, sin pausa
   del usuario y sin el diálogo abierto (S.fbf). Las rutas salen de VIDEOS (content.ts): reemplazar un video es
   cambiar esa fila. */
import * as THREE from 'three/webgpu';
import {
  uniform, texture, uv, vec3, float, smoothstep, exp, mix, length, time, sin, cos, distance, clamp, dot, step,
  attribute, instancedBufferAttribute, positionWorld, cameraPosition, max
} from 'three/tsl';
import { GAL_END, GAL_DWELLS } from './gallery';
import { FBF_RISE, FBF_BEAM, FBF_INTRO, FBF_DWELLS, FBF_OFF, FBF_END, FBF_SCREENS } from './frames';
import { VIDEOS } from '../../../lib/content';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const easeIO = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
const N = FBF_SCREENS.length;
const LAST_OUT = GAL_DWELLS[GAL_DWELLS.length - 1][1];
const TRACK_Y = 3.6;
// arranque de lámpara de proyector: dos parpadeos y queda
const flicker = (t) => {
  if (t < 0) return 0;
  if (t < 0.06) return 0.9; if (t < 0.14) return 0.15; if (t < 0.2) return 1; if (t < 0.3) return 0.35;
  return Math.min(1, 0.7 + (t - 0.3) * 1.5);
};

/** Arma la sala. Devuelve el controlador o null si se desmontó a mitad. Todo en coordenadas del pasillo. */
export async function buildProjector({
  group, toL, RED, OFF, appear, S, ctl, prep, yieldToMain, withFog, lightAt, metalMat, housingMat,
  headPos, headI, scrPos, scrI, endP, endL, railHeadZ, focusU, rangeU,
}) {
  const alive = () => !ctl.disposed && !S.dead;
  const hall = new THREE.Group();
  hall.name = 'fbf-hall';
  hall.visible = false;
  group.add(hall);

  /* ---------- posters (las texturas hasta que el video tiene su primer cuadro) ---------- */
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const posters = await Promise.all(VIDEOS.slice(0, N).map((v) => loadImg(v.poster)));
  if (!alive()) return null;
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- haz: uniforms compartidos por la pirámide y el polvo ---------- */
  const bA = uniform(new THREE.Vector3()), bC = uniform(new THREE.Vector3()), bR = uniform(1), bI = uniform(0), shatterU = uniform(0), dustOut = uniform(0);
  // fantasmas: las pantallas apagadas. Al final de Projects quedan en espera (se adivinan por el último vano, el
  // cabezal sigue siendo la luz que manda); con el haz suben a fantasma pleno
  const ghostU = uniform(0);

  /* ---------- pantallas ---------- */
  const screens = FBF_SCREENS.map((sc, k) => {
    const vd = VIDEOS[k];
    const h = sc.h, w = h * vd.width / vd.height;
    const g = new THREE.Group();
    g.position.set(sc.x, sc.y, sc.z);
    g.rotation.y = sc.yaw;
    hall.add(g);
    g.updateMatrix();
    // cuerpo: una placa con espesor (se lee de canto en el oblicuo), oscura, mate
    const body = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.05), housingMat);
    g.add(body);
    const posterTex = prep(new THREE.Texture(posters[k]));
    const tn = texture(posterTex, uv());
    const onU = uniform(0);
    const mat = new THREE.MeshBasicNodeMaterial();
    {
      const u = uv();
      const ex = smoothstep(0.0, 0.025, u.x).mul(smoothstep(0.0, 0.025, float(1).sub(u.x)))
        .mul(smoothstep(0.0, 0.015, u.y)).mul(smoothstep(0.0, 0.015, float(1).sub(u.y)));
      const gain = mix(ghostU.mul(0.065), float(0.88), onU);       // fantasma → proyectada
      const col = tn.rgb.mul(gain).mul(mix(float(0.78), float(1), ex));
      mat.colorNode = withFog(col, 0.3).mul(appear);
    }
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    face.position.z = 0.027;
    g.add(face);
    // piloto rojo en el borde inferior: encendido = en foco (entra al bloom)
    const tallyMat = new THREE.MeshBasicNodeMaterial();
    tallyMat.colorNode = RED.mul(onU.mul(3.4).add(0.04)).mul(appear);
    const tally = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.012), tallyMat);
    tally.position.set(-sc.side * (w / 2 - 0.1), -h / 2 - 0.018, 0.027);
    g.add(tally);
    // colgada: dos cables que se pierden en la oscuridad
    [-0.38, 0.38].forEach((fx) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.008, 5, 0.008), metalMat);
      c.position.set(fx * w, h / 2 + 0.03 + 2.5, 0);
      g.add(c);
    });
    // esquinas (TL, TR, BR, BL) y centro, en coordenadas del pasillo (el hall no tiene transform propio)
    const corners = [V(-w / 2, h / 2, 0.03), V(w / 2, h / 2, 0.03), V(w / 2, -h / 2, 0.03), V(-w / 2, -h / 2, 0.03)].map((c) => c.applyMatrix4(g.matrix));
    const center = V(sc.x, sc.y, sc.z);
    const normal = V(Math.sin(sc.yaw), 0, Math.cos(sc.yaw));
    return { sc, vd, w, h, g, face, tn, posterTex, onU, corners, center, normal, lit: 0, litT0: -1, wasLit: false, land: vd.width > vd.height };
  });
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- riel de techo: el camino de la señal del riel del piso a la lámpara ---------- */
  const TRACK = [V(0, 0.004, railHeadZ), V(0, 2.3, railHeadZ), V(0, 2.3, -63.0), V(0, TRACK_Y, -64.4), V(0, TRACK_Y, -112)];
  const segL = TRACK.slice(1).map((p, i) => p.distanceTo(TRACK[i]));
  const cum = [0]; segL.forEach((l) => cum.push(cum[cum.length - 1] + l));
  const TOTAL = cum[cum.length - 1];
  const trackAt = (d, out) => {
    d = Math.min(TOTAL, Math.max(0, d));
    let i = 0; while (i < segL.length - 1 && d > cum[i + 1]) i++;
    return out.copy(TRACK[i]).lerp(TRACK[i + 1], (d - cum[i]) / segL[i]);
  };
  const arcZ = (z) => cum[3] + (TRACK[3].z - z);            // distancia sobre el riel hasta la z dada (tramo largo)
  const lampZ = screens.map((s) => s.center.z + 6.2);
  // lámpara: [u, distancia sobre el riel]; entre llaves, ease in-out
  const LK = [[FBF_RISE[0], 0], [FBF_RISE[1], arcZ(-64.6)], [FBF_INTRO[1] - 0.2, arcZ(-64.9)]];
  FBF_DWELLS.forEach((d, k) => { LK.push([d[0], arcZ(lampZ[k])]); LK.push([d[1], arcZ(lampZ[k] - 0.45)]); });
  LK.push([FBF_END, arcZ(lampZ[N - 1] - 1.1)]);
  const lampDist = (u) => {
    if (u <= LK[0][0]) return 0;
    for (let i = 0; i < LK.length - 1; i++) {
      if (u <= LK[i + 1][0]) return LK[i][1] + (LK[i + 1][1] - LK[i][1]) * easeIO((u - LK[i][0]) / (LK[i + 1][0] - LK[i][0]));
    }
    return LK[LK.length - 1][1];
  };
  const trProg = uniform(0), trI = uniform(1);
  {
    const path = new THREE.CurvePath();
    for (let i = 0; i < TRACK.length - 1; i++) path.add(new THREE.LineCurve3(TRACK[i], TRACK[i + 1]));
    // opaco y con profundidad: el DOF lee la profundidad del riel (transparente leía la del vacío de atrás y lo
    // desenfocaba en una banda gruesa). Lo que está adelante de la lámpara se descarta con alphaTest.
    const m = new THREE.MeshBasicNodeMaterial({ alphaTest: 0.5 });
    const x = uv().x;
    // trazo tenue detrás de la lámpara, cabeza brillante donde está; nada adelante
    m.colorNode = RED.mul(1.2).mul(float(0.18).add(exp(x.sub(trProg).mul(TOTAL * 4.0)).mul(1.4))).mul(trI).mul(appear);
    m.opacityNode = float(1).sub(step(trProg, x)).mul(step(0.5, appear));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 600, 0.0032, 5, false), m);
    tube.frustumCulled = false;
    hall.add(tube);
  }

  /* ---------- el haz: pirámide de la lámpara a las esquinas de la pantalla ---------- */
  const beamGeo = new THREE.BufferGeometry();
  const beamPos = new Float32Array(12 * 3);
  const bs = new Float32Array(12), be = new Float32Array(12);
  for (let f = 0; f < 4; f++) { bs[f * 3] = 0; bs[f * 3 + 1] = 1; bs[f * 3 + 2] = 1; be[f * 3] = 0.5; be[f * 3 + 1] = 0; be[f * 3 + 2] = 1; }
  beamGeo.setAttribute('position', new THREE.BufferAttribute(beamPos, 3).setUsage(THREE.DynamicDrawUsage));
  beamGeo.setAttribute('bs', new THREE.BufferAttribute(bs, 1));
  beamGeo.setAttribute('be', new THREE.BufferAttribute(be, 1));
  const beamMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  {
    const s = attribute('bs', 'float'), e = attribute('be', 'float');
    // sin aristas duras: cada cara se apaga hacia sus bordes (la silueta del haz es luz, no una forma)
    const soft = smoothstep(0.0, 0.5, e).mul(smoothstep(0.0, 0.5, float(1).sub(e))).pow(1.4);
    // nace en la lámpara y se abre; cerca de la pantalla casi no queda (la imagen no se tiñe de rojo)
    const along = smoothstep(0.0, 0.06, s).mul(float(1).sub(s.mul(0.6))).mul(float(1).sub(smoothstep(0.62, 0.97, s)));
    // vetas de polvo que corren por el haz (no un bloque parejo)
    const motes = sin(s.mul(21.0).sub(time.mul(0.7)).add(e.mul(7.0))).mul(0.5).add(0.5)
      .mul(sin(s.mul(9.0).add(time.mul(0.35)).add(e.mul(17.0))).mul(0.5).add(0.5))
      .mul(sin(e.mul(41.0).add(s.mul(3.0))).mul(0.5).add(0.5)).mul(0.7).add(0.3);
    // cerca de cámara el haz se apaga (fuera de foco, a 1-2 m sería un velo rojo en todo el cuadro)
    const near = smoothstep(0.8, 2.6, distance(positionWorld, cameraPosition));
    beamMat.colorNode = RED.mul(bI).mul(along).mul(soft).mul(motes).mul(near).mul(0.11);
    beamMat.opacityNode = appear;
  }
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.frustumCulled = false; beam.renderOrder = 4;
  hall.add(beam);

  /* polvo fuera de foco: se apaga en lugar de abrirse en discos. Sin esto, en el cruce entre pantallas el polvo del haz
     cercano a cámara se leía como una columna de manchas rojas (U4, captura u4-fbf-05). Mota a más de un rango del
     plano de foco: queda al 20 %. */
  const oofK = (near) => float(1).sub(smoothstep(rangeU.mul(0.35), rangeU, near.sub(focusU).abs()).mul(0.8));

  /* ---------- polvo de la sala: se enciende dentro del haz; al final queda como puntos ---------- */
  const DUST = 1500;
  const dPos = new Float32Array(DUST * 3), dSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dPos[i * 3] = (Math.random() - 0.5) * 13; dPos[i * 3 + 1] = 0.15 + Math.random() * 4.6; dPos[i * 3 + 2] = -62.5 - Math.random() * 47;
    dSeed[i] = Math.random();
  }
  const dustMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  {
    const base = instancedBufferAttribute(new THREE.InstancedBufferAttribute(dPos, 3));
    const seed = instancedBufferAttribute(new THREE.InstancedBufferAttribute(dSeed, 1));
    // dentro del haz: distancia al eje relativa al radio en ese punto (cono que envuelve la pirámide)
    const ax = bC.sub(bA), len = length(ax), dir = ax.div(len);
    const sp = clamp(dot(base.sub(bA), dir).div(len), 0, 1);
    const radial = length(base.sub(bA.add(dir.mul(sp.mul(len)))));
    const r = bR.mul(sp);
    const inB = smoothstep(r.add(0.04), r.mul(0.35), radial).mul(smoothstep(0.03, 0.12, sp));
    const t = time.mul(0.14).add(seed.mul(40));
    // al descomponerse, los puntos del haz se abren un poco hacia afuera del eje
    const outward = base.sub(bA.add(dir.mul(sp.mul(len)))).mul(shatterU.mul(0.35).mul(inB));
    dustMat.positionNode = base.add(vec3(sin(t).mul(0.12), cos(t.mul(0.7)).mul(0.08), sin(t.mul(0.5)).mul(0.1))).add(outward);
    const near = distance(positionWorld, cameraPosition);
    dustMat.scaleNode = seed.mul(0.014).add(0.006).mul(smoothstep(0.2, 2.2, near).mul(-0.6).add(1.6)).mul(shatterU.mul(inB).mul(0.7).add(1));
    const soft = float(1).sub(smoothstep(0.0, 0.5, length(uv().sub(0.5))));
    const beamLit = inB.mul(bI.add(shatterU.mul(1.5)));
    // en el haz: rojo con el centro caliente; fuera: lo que alumbre la pantalla encendida (lightAt) y un resto neutro
    dustMat.colorNode = RED.mul(beamLit.mul(5.0)).add(OFF.mul(beamLit.mul(beamLit).mul(0.6)))
      .add(lightAt(toL(positionWorld)).mul(2.0)).add(OFF.mul(0.006)).mul(float(1).sub(dustOut));
    dustMat.opacityNode = soft.mul(seed.mul(0.6).add(0.4)).mul(smoothstep(0.3, 0.9, near)).mul(max(beamLit.mul(1.2), float(0.35))).mul(oofK(near)).mul(appear);
  }
  const dust = new THREE.Sprite(dustMat); dust.count = DUST; dust.frustumCulled = false;
  hall.add(dust);

  /* ---------- polvo dentro del haz: motas que viven en la pirámide (lámpara → 4 esquinas). Con el haz encendido son
     el polvo iluminado del proyector; al apagarse la última pantalla quedan encendidas y se abren: la luz en puntos ---------- */
  const bq = [0, 1, 2, 3].map(() => uniform(new THREE.Vector3()));
  const MOTES = 900;
  const mP = new Float32Array(MOTES * 3), mSeed = new Float32Array(MOTES);
  for (let i = 0; i < MOTES; i++) {
    mP[i * 3] = Math.random(); mP[i * 3 + 1] = Math.random();
    mP[i * 3 + 2] = 0.1 + 0.8 * Math.sqrt(Math.random());          // más motas donde el haz es más ancho; ninguna pegada a la imagen
    mSeed[i] = Math.random();
  }
  const motesMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  {
    const prm = instancedBufferAttribute(new THREE.InstancedBufferAttribute(mP, 3));
    const seed = instancedBufferAttribute(new THREE.InstancedBufferAttribute(mSeed, 1));
    const a = prm.x, b = prm.y, sp = prm.z;
    const top = mix(bq[0], bq[1], a), bot = mix(bq[3], bq[2], a);
    const base = mix(top, bot, b);
    const ray = base.sub(bA);
    const t = time.mul(0.11).add(seed.mul(50));
    const drift = vec3(sin(t).mul(0.05), cos(t.mul(0.8)).mul(0.04), sin(t.mul(0.6)).mul(0.05));
    // al descomponerse: se abren desde el eje y quedan flotando
    const spread = vec3(sin(seed.mul(91.0)), cos(seed.mul(57.0)).mul(0.6), sin(seed.mul(33.0))).mul(shatterU.mul(0.9));
    motesMat.positionNode = bA.add(ray.mul(sp.mul(shatterU.mul(0.12).add(1)))).add(drift).add(spread);
    const near = distance(positionWorld, cameraPosition);
    const tw = sin(time.mul(seed.mul(2.0).add(0.6)).add(seed.mul(20.0))).mul(0.35).add(0.65);   // centelleo
    motesMat.scaleNode = seed.mul(0.009).add(0.005).mul(shatterU.mul(0.3).add(1)).mul(smoothstep(0.3, 2.0, near).mul(-0.5).add(1.5));
    const lit = bI.mul(0.55).add(shatterU.mul(1.3)).mul(float(1).sub(dustOut));
    motesMat.colorNode = RED.mul(lit.mul(4.0)).add(OFF.mul(lit.mul(shatterU).mul(0.5))).mul(tw);
    const soft = float(1).sub(smoothstep(0.0, 0.5, length(uv().sub(0.5))));
    motesMat.opacityNode = soft.mul(seed.mul(0.5).add(0.5)).mul(smoothstep(0.4, 1.0, near)).mul(oofK(near)).mul(appear);
  }
  const motes = new THREE.Sprite(motesMat); motes.count = MOTES; motes.frustumCulled = false; motes.renderOrder = 5;
  hall.add(motes);
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- videos: fuera del DOM, mudos, en loop; src recién cerca de su estadía ---------- */
  const vids = screens.map(() => null);
  function ensureVideo(k) {
    if (vids[k]) return vids[k];
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.preload = 'auto';
    const rec = { v, tex: null, last: -1, playing: false };
    v.addEventListener('loadeddata', () => {
      if (!alive() || rec.tex) return;
      rec.tex = new THREE.VideoTexture(v);
      rec.tex.colorSpace = THREE.SRGBColorSpace;
      rec.tex.generateMipmaps = false;
      ctl.texs.push(rec.tex);
      screens[k].tn.value = rec.tex;
    });
    v.src = VIDEOS[k].src;
    v.load();                                      // explícito: fuera del DOM Chrome puede no empezar a cargar solo
    vids[k] = rec;
    return rec;
  }
  function pauseAll() { vids.forEach((r) => { if (r && !r.v.paused) r.v.pause(); }); }
  ctl.offs.push(() => {
    vids.forEach((r) => { if (!r) return; try { r.v.pause(); r.v.removeAttribute('src'); r.v.load(); } catch (e) { /* noop */ } });
    S.fbf.live = false; S.fbf.active = -1; S.fbf.hover = -1;
  });

  /* ---------- cámara: llaves en u (coordenadas del pasillo) ---------- */
  let KEYS = [], posCurve = null, lookCurve = null, keyAspect = 0, keyFov = 0;
  const tmpF = V(0, 0, 0);
  /** Toma frente a una pantalla: oblicua (orbit corto de 23° a 17°, nunca de frente), dolly hacia adentro, y la
      pantalla corrida a su lado del cuadro (el texto va del otro). */
  function shot(k, end, tanV, aspect) {
    const s = screens[k], sc = s.sc, C = s.center;
    const dist = s.land ? (end ? 9.1 : 10.0) : (end ? 7.3 : 8.2);
    const a = sc.yaw + sc.side * (end ? 0.3 : 0.4);
    const p = V(C.x + Math.sin(a) * dist, C.y - 0.12 + (end ? -0.05 : 0.08), C.z + Math.cos(a) * dist);
    const ndcX = sc.side * (s.land ? 0.26 : 0.3), ndcY = 0.04;
    tmpF.copy(C).sub(p).setY(0);
    const dh = tmpF.length(); tmpF.divideScalar(dh);
    const right = V(-tmpF.z, 0, tmpF.x);
    const l = C.clone().addScaledVector(right, -ndcX * tanV * aspect * dh);
    l.y = C.y - ndcY * tanV * dh;
    return { p, l };
  }
  function buildKeys(tanV, aspect) {
    const K = [];
    K.push([GAL_END, endP.clone(), endL.clone()]);
    // el cabezal se despega del riel y sube: la cámara lo sigue con la mirada (crane corto)
    K.push([10.7, V(0.5, 1.15, -57.4), V(-0.15, 2.0, -66)]);
    // plano de situación: la cámara pasa el vano; la sala, el haz y la primera pantalla a la derecha del cuadro
    const s0 = screens[0].center;
    const pEst = V(1.45, 1.78, -60.7);
    tmpF.copy(s0).sub(pEst).setY(0); const dh = tmpF.length(); tmpF.divideScalar(dh);
    const lEst = s0.clone().addScaledVector(V(-tmpF.z, 0, tmpF.x), -0.2 * tanV * aspect * dh); lEst.y = 2.15;
    K.push([11.4, pEst, lEst, true]);
    K.push([FBF_INTRO[1] - 0.15, pEst.clone().add(V(-0.35, 0.04, -1.3)), lEst.clone().add(V(-0.2, -0.05, -0.4))]);
    FBF_DWELLS.forEach((d, k) => {
      const A = shot(k, false, tanV, aspect), B = shot(k, true, tanV, aspect);
      K.push([d[0], A.p, A.l, true]);
      K.push([d[1], B.p, B.l]);
      const nx = FBF_DWELLS[k + 1];
      if (nx) {
        const An = shot(k + 1, false, tanV, aspect);
        const pm = B.p.clone().lerp(An.p, 0.5); pm.x *= 0.6; pm.y += 0.3;
        K.push([(d[1] + nx[0]) / 2, pm, B.l.clone().lerp(An.l, 0.55)]);
      }
    });
    // final: la cámara se aleja y sube; el haz se apaga y quedan los puntos donde estaba
    const Bl = shot(N - 1, true, tanV, aspect), sl = screens[N - 1];
    const mid = sl.center.clone().lerp(V(0, TRACK_Y, lampZ[N - 1]), 0.45);
    K.push([FBF_OFF + 0.35, Bl.p.clone().add(V(0.6, 0.4, 1.3)), mid.clone().lerp(sl.center, 0.4)]);
    K.push([FBF_END, Bl.p.clone().add(V(1.2, 0.85, 2.8)), mid.clone().add(V(0, -0.15, 0))]);
    KEYS = K;
    posCurve = new THREE.CatmullRomCurve3(K.map((x) => x[1]), false, 'centripetal');
    lookCurve = new THREE.CatmullRomCurve3(K.map((x) => x[2]), false, 'centripetal');
  }
  function keyParam(u) {
    u = Math.min(FBF_END, Math.max(GAL_END, u));
    let i = 0;
    while (i < KEYS.length - 2 && u >= KEYS[i + 1][0]) i++;
    const a = KEYS[i][0], b = KEYS[i + 1][0];
    const l = Math.min(1, Math.max(0, (u - a) / (b - a)));
    return (i + (KEYS[i][3] ? l : easeIO(l))) / (KEYS.length - 1);
  }
  /** Pose de la sala para u > GAL_END (coordenadas del pasillo). La primera llave es la última del pasillo. */
  function pose(u, camera, outP, outL) {
    const tanV = Math.tan(THREE.MathUtils.degToRad((camera.aspect > 1.9 ? 30 : 32) / 2));
    if (camera.aspect !== keyAspect || tanV !== keyFov) { keyAspect = camera.aspect; keyFov = tanV; buildKeys(tanV, camera.aspect); }
    const k01 = keyParam(u);
    posCurve.getPoint(k01, outP); lookCurve.getPoint(k01, outL);
  }
  /** deriva de la cámara viva: sale de la calma del final del pasillo (0,45) y queda en 0,85 */
  const calm = (u) => 0.45 + 0.4 * smooth(GAL_END, 11.3, u) - 0.25 * smooth(FBF_OFF, FBF_END, u);

  /* ---------- estado por frame ---------- */
  const st = { b: 0, beam: 0, mode: '', lamp: V(0, 0, 0), lampK: 1, active: -1 };
  const tmp = V(0, 0, 0), q = V(0, 0, 0), fwd = V(0, 0, 0), c0 = V(0, 0, 0), c1 = V(0, 0, 0);
  const heartbeat = (t) => { const ph = t % 2.4; return Math.exp(-((ph - 0.05) ** 2) / 0.0016) + 0.6 * Math.exp(-((ph - 0.27) ** 2) / 0.0022); };
  /** índice continuo de la pantalla que recibe el haz (0 … N−1): barre a mitad de cada cruce */
  const beamIndex = (u) => {
    let b = 0;
    for (let k = 0; k < N - 1; k++) {
      const mid = (FBF_DWELLS[k][1] + FBF_DWELLS[k + 1][0]) / 2;
      b += smooth(mid - 0.2, mid + 0.2, u);
    }
    return b;
  };

  /** Estado de la sala para u. Escribe uniforms (haz, pantallas, lámpara) y devuelve el foco, o null antes de la sala. */
  function update(u, t, dt, gw, P, L, inView) {
    // la sala existe desde el final de Projects: sus pantallas en espera se adivinan por el último vano (D-01)
    const on = u > LAST_OUT + 0.1;
    hall.visible = on;
    const ready = on && gw > 0.5;
    if (!on) { st.active = -1; S.fbf.active = -1; scrI.value = 0; pauseAll(); return null; }

    // lámpara: sube por el vano y sigue por el riel de techo
    const ld = lampDist(u);
    trackAt(ld, st.lamp);
    trProg.value = ld / TOTAL;
    const off = smooth(FBF_OFF, FBF_OFF + 0.4, u);
    const hb = heartbeat(t);
    st.lampK = 1 - 0.92 * off;
    trI.value = (0.85 + 0.15 * hb) * (1 - 0.7 * off);

    // haz
    const b = beamIndex(u), k0 = Math.floor(Math.min(b, N - 1)), k1 = Math.min(N - 1, k0 + 1), f = b - k0;
    const sweep = Math.sin(Math.PI * Math.min(1, f));
    st.b = b;
    st.beam = smooth(FBF_BEAM[0], FBF_BEAM[1], u) * (1 - off);
    ghostU.value = Math.max(smooth(FBF_BEAM[0], FBF_BEAM[1] + 0.3, u), 0.45 * smooth(LAST_OUT + 0.3, LAST_OUT + 0.9, u)) * (1 - off);
    bI.value = st.beam * (1 - 0.35 * sweep) * (0.92 + 0.08 * hb);
    shatterU.value = smooth(FBF_OFF - 0.05, FBF_OFF + 0.45, u);
    dustOut.value = 0.65 * smooth(FBF_END + 0.1, FBF_END + 1.1, u);
    bA.value.copy(st.lamp);
    const s0 = screens[k0], s1 = screens[k1];
    bC.value.copy(s0.center).lerp(s1.center, f);
    bR.value = THREE.MathUtils.lerp(Math.hypot(s0.w, s0.h), Math.hypot(s1.w, s1.h), f) * 0.5 * 0.82;
    for (let c = 0; c < 4; c++) {
      c0.copy(s0.corners[c]).lerp(s1.corners[c], f);
      c1.copy(s0.corners[(c + 1) % 4]).lerp(s1.corners[(c + 1) % 4], f);
      bq[c].value.copy(c0);
      const o = c * 9;
      beamPos[o] = st.lamp.x; beamPos[o + 1] = st.lamp.y; beamPos[o + 2] = st.lamp.z;
      beamPos[o + 3] = c0.x; beamPos[o + 4] = c0.y; beamPos[o + 5] = c0.z;
      beamPos[o + 6] = c1.x; beamPos[o + 7] = c1.y; beamPos[o + 8] = c1.z;
    }
    beamGeo.attributes.position.needsUpdate = true;
    beam.visible = st.beam > 0.002;

    // pantallas: la que recibe el haz se enciende (arranque de lámpara); las demás quedan como fantasmas
    let active = -1;
    screens.forEach((s, k) => {
      const lit = Math.max(0, 1 - Math.abs(b - k) * 4) * st.beam;
      if (lit > 0.85 && !s.wasLit) { s.wasLit = true; s.litT0 = t; }
      if (lit < 0.4) s.wasLit = false;
      const fl = s.wasLit ? flicker(t - s.litT0) : 0;
      const target = Math.min(lit, fl || lit * 0.3);
      s.onU.value = damp(s.onU.value, target, s.wasLit && t - s.litT0 < 0.4 ? 60 : 5, dt);
      if (lit > 0.6) active = k;
    });
    st.active = active;
    S.fbf.active = active;

    // luz de la pantalla encendida sobre el piso, los cables y el polvo cercano
    const sa = screens[active >= 0 ? active : Math.round(Math.min(b, N - 1))];
    scrPos.value.copy(sa.center).addScaledVector(sa.normal, 0.6);
    scrI.value = sa.onU.value * 0.55;
    // el cabezal del pasillo es la lámpara recién cuando se despega del riel (antes lo mueve corridor.js)
    if (u > FBF_RISE[0]) headPos.value.copy(st.lamp);
    // la lámpara alumbra parejo (proyector), con un resto del latido; al final cae con el haz
    const rise = smooth(FBF_RISE[0], FBF_RISE[1], u);
    headI.value = THREE.MathUtils.lerp(headI.value, (1.1 + 0.25 * hb) * (1 - 0.75 * off), rise);

    // videos: src con anticipo; corren sólo en foco, a la vista, sin pausa del usuario ni diálogo abierto
    screens.forEach((s, k) => {
      if (ready && u > FBF_DWELLS[k][0] - 0.9 && u < FBF_DWELLS[k][1] + 0.6) ensureVideo(k);
      const r = vids[k];
      if (!r) return;
      const want = ready && inView && !document.hidden && active === k && s.onU.value > 0.5 && !S.fbf.paused && S.fbf.open < 0;
      if (want && r.v.paused) { r.v.play().catch(() => {}); }
      else if (!want && !r.v.paused) r.v.pause();
      // sube un cuadro nuevo sólo cuando cambia (sin depender de requestVideoFrameCallback fuera del DOM)
      if (r.tex && r.v.readyState >= 2 && r.v.currentTime !== r.last) { r.last = r.v.currentTime; r.tex.needsUpdate = true; }
    });

    // foco: qué capa está nítida. Cada cambio de modo = rack focus (corridor.js toca el sonido)
    fwd.copy(L).sub(P).normalize();
    let mode, fT, rT;
    const dIdx = FBF_DWELLS.findIndex((d) => u >= d[0] - 0.1 && u <= d[1] + 0.05);
    if (u < FBF_RISE[1]) { mode = 'rise'; fT = q.copy(st.lamp).sub(P).dot(fwd); rT = 3.2; }
    else if (u < FBF_INTRO[1]) { mode = 'intro'; fT = q.copy(screens[0].center).sub(P).dot(fwd); rT = 4.5; }
    else if (u > FBF_OFF + 0.1) { mode = 'fbf-end'; fT = q.copy(bA.value).lerp(bC.value, 0.62).sub(P).dot(fwd); rT = 7.0; }   // los puntos, nítidos
    else if (dIdx >= 0) { mode = 'scr' + dIdx; fT = q.copy(screens[dIdx].center).sub(P).dot(fwd); rT = screens[dIdx].land ? 3.4 : 2.2; }
    else {
      const nx = FBF_DWELLS.findIndex((d) => u < d[0]);
      mode = 'fbf-travel' + nx; fT = q.copy(screens[Math.max(0, nx)].center).sub(P).dot(fwd); rT = 6.5;
    }
    st.mode = mode;
    return { mode, fT, rT };
  }

  /** Parallax leve de los rótulos: siguen el corrimiento de su pantalla en el cuadro (capas que se separan). */
  function placeTags(camera) {
    const tags = S.fbf.tags;
    for (let k = 0; k < tags.length && k < N; k++) {
      const el = tags[k];
      if (!el || el.dataset.on === undefined) continue;
      const s = screens[k];
      tmp.copy(s.center); hall.localToWorld(tmp); tmp.project(camera);
      const tx = s.sc.side * (s.land ? 0.26 : 0.3);
      const dx = Math.max(-1, Math.min(1, (tmp.x - tx) / 0.4)) * 26, dy = Math.max(-1, Math.min(1, (tmp.y - 0.04) / 0.4)) * -12;
      el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    }
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  /** pantalla en foco bajo el puntero (-1 si no) */
  function pick(mx, my, camera) {
    if (st.active < 0 || S.fbf.open >= 0) return -1;
    ndc.set(mx, -my);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(screens[st.active].face, false).length ? st.active : -1;
  }

  /** precalentado (corridor.warm): la sala visible para que compileAsync la incluya */
  const warm = (v) => { hall.visible = v; beam.visible = v; };

  return {
    pose, calm, update, placeTags, pick, pauseAll, warm,
    lampK: () => st.lampK,
    info: () => ({ fbf: st.mode, b: +st.b.toFixed(2), beam: +st.beam.toFixed(2), on: screens.map((s) => +s.onU.value.toFixed(2)), vids: vids.map((r) => (r ? (r.tex ? (r.v.paused ? 'paused' : 'playing') : 'loading') : '-')) }),
  };
}
