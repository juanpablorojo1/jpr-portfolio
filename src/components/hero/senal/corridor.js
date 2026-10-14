/* Projects «Vitrina en el vacío» + el riel que lleva a Frame by Frame, dentro de la escena persistente «Señal».
   Antes este módulo era el pasillo de radiología («Negatoscopio», 2026-10-10). Juan lo cambió dos veces
   (2026-10-11: «No me gustan las paredes [...] prefiero que le demos otra estetica»; 2026-10-12: eligió la maqueta A
   «Vitrina» con una laptop íntegra por proyecto). Lo que queda acá es la parte que no es de Projects:
   - el sistema de coordenadas del pasillo (`group`, girado 90°, con su origen sobre la recta del About), en el que
     viven Frame by Frame (projector.js), Stack, Experience y Contact;
   - el riel (la recta del About que sigue a la izquierda) con su cabezal, el piso de puntos y el polvo del tramo final;
   - el post (DOF + bloom del rojo + viñeta + grano) que usan las secciones que siguen.
   Projects es vitrina.js: cuatro laptops en el vacío (sin paredes), la señal que dibuja cada vitrina y la salida, que
   corre por el riel hasta el umbral donde Frame by Frame recibe el cabezal (la misma toma de antes en u = GAL_END).

   Coordenadas: las del pasillo (x a lo ancho, y arriba, −z hacia el fondo) dentro de `group`, girado 90° en y, con el
   origen sobre la recta del About (z −33,5, a la altura del riel). Los shaders pasan positionWorld a coordenadas del
   pasillo con `toL` (offset uniforme: cambia con el tamaño de la ventana). */
import * as THREE from 'three/webgpu';
import {
  uniform, vec2, vec3, vec4, float, smoothstep, exp, abs, fract, mix, max, screenUV,
  length, time, sin, cos, positionWorld, distance, luminance, cameraPosition, dot, instancedBufferAttribute, uv,
  select, min, clamp
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { GAL_DWELLS, GAL_END, GAL_ABOUT_OUT, tagWanted } from './gallery';
import { FBF_BEAM, FBF_INTRO, FBF_OFF } from './frames';
import { playSound } from '../../../lib/sound';
import { buildProjector } from './projector';
import { buildVitrina, VIT_FOV } from './vitrina';

export const WALL = 3.2, CEIL = 3.4, Z_IN = 2, Z_END = -62;
const RAIL_STOP = Z_END + 0.7;                  // el riel termina en el umbral de la sala de proyección
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const LAST_OUT = GAL_DWELLS[GAL_DWELLS.length - 1][1];
const NP = GAL_DWELLS.length;

/** Arma el riel, la vitrina y la sala (async, con pausas al hilo principal). Devuelve el controlador o null si se desmontó a mitad. */
export async function buildCorridor({ renderer, scene, camera, scenePass, S, ctl, RED, OFF, galW, assetBase = '/projects/', yieldToMain }) {
  const alive = () => !ctl.disposed && !S.dead;
  const group = new THREE.Group();
  group.name = 'corridor';
  const offU = uniform(new THREE.Vector3());
  // positionWorld → coordenadas del pasillo (grupo girado +90° en y: x_w = z_l + ox, z_w = −x_l + oz)
  const toL = (p) => { const q = p.sub(offU); return vec3(q.z.negate(), q.y, q.x); };
  const texs = [];
  const prep = (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.getMaxAnisotropy ? renderer.getMaxAnisotropy() : 8); t.needsUpdate = true; texs.push(t); ctl.texs.push(t); return t; };

  ctl.corrStage = 'materials';
  /* ---------- luz y materiales del tramo final (coordenadas del pasillo) ---------- */
  const FOG = vec3(0.0030, 0.0028, 0.0028);
  const headPos = uniform(new THREE.Vector3(0, 0.03, RAIL_STOP + 0.15)), headI = uniform(1), railI = uniform(1);
  // Frame by Frame (projector.js): la pantalla encendida alumbra el piso, los cables y el polvo cercano
  const scrPos = uniform(new THREE.Vector3(0, -50, 0)), scrI = uniform(0);
  /* Umbrales del tramo final (heredados del pasillo, U-motion-1, D-01/D-02):
     - redFar / redNear: alcance largo y charco cercano del cabezal (el rojo queda en el cabezal y su estela).
     - ambX: ambiente neutro que se suma al del riel.
     - roomI: la sala de proyección con las pantallas en espera: un derrame neutro sobre el final del riel. */
  const redFar = uniform(1), redNear = uniform(1), ambX = uniform(0), roomI = uniform(0), dotK = uniform(0);
  // post (más abajo); acá porque el polvo de la sala (projector.js) también los lee
  const focusU = uniform(7), rangeU = uniform(1.6), bokehU = uniform(12.0), voidK = uniform(0), grainK = uniform(0), farK = uniform(50);
  // el tramo del riel (piso, polvo, grano): aparece con la salida de Projects; en la vitrina no hay piso ni grano
  const fbfK = uniform(0);
  // polvo del tramo final: recién en Video (R3-02: en la salida de Projects eran ~1150 motas fuera de cualquier haz)
  const dustK = uniform(0);
  const ROOM_POS = new THREE.Vector3(0, 2.1, Z_END - 4.5);
  const roomPos = vec3(ROOM_POS.x, ROOM_POS.y, ROOM_POS.z);
  const appear = galW;                           // existe sólo con la galería abierta (0 en el About)
  const lightAt = (p) => {
    let l = vec3(0.0);
    const dh = distance(p, headPos);
    l = l.add(RED.mul(headI.mul(exp(dh.mul(-1.15)).mul(1.2).mul(redNear).add(exp(dh.mul(-0.32)).mul(0.45).mul(redFar)))));
    l = l.add(OFF.mul(scrI.mul(exp(distance(p, scrPos).mul(-0.55)))));
    l = l.add(RED.mul(exp(abs(p.x).mul(-7.0)).mul(exp(p.y.mul(-4.5))).mul(0.3).mul(railI)));    // el riel ilumina su franja de piso
    l = l.add(RED.mul(exp(p.y.mul(-0.6)).mul(0.03).mul(railI))).add(OFF.mul(railI.mul(0.03).add(ambX)));
    // sala de proyección: derrame neutro desde la sala
    const dr = distance(p, roomPos);
    l = l.add(OFF.mul(roomI.mul(float(1).div(dr.mul(dr).mul(0.045).add(1)))));
    return l.mul(appear);
  };
  const fogF = (k = 1) => float(1).sub(exp(distance(positionWorld, cameraPosition).mul(-0.05 * k)));
  const withFog = (c, k = 1) => mix(c, FOG, fogF(k));

  const FLOOR_NEAR = Z_IN + 4, FLOOR_FAR = Z_END - 120;   // sigue bajo la sala de proyección (projector.js)
  const floorMat = new THREE.MeshBasicNodeMaterial({ transparent: true });
  {
    const p = toL(positionWorld);
    const d = length(fract(p.xz.div(0.6)).sub(0.5));
    // los puntos cercanos a cámara se apagan (fuera de foco eran discos de bokeh en el tercio inferior)
    const dots = float(1).sub(smoothstep(0.02, 0.06, d))
      .mul(float(1).sub(dotK.mul(float(1).sub(smoothstep(2.2, 7.5, distance(positionWorld, cameraPosition))))));
    const seam = smoothstep(0.985, 1.0, abs(fract(p.z.div(1.2)).sub(0.5)).mul(2)).mul(0.5);
    const alb = float(0.07).add(dots.mul(0.6)).add(seam.mul(0.12));
    const edge = smoothstep(FLOOR_NEAR, FLOOR_NEAR - 5, p.z);
    // el borde lejano (y los laterales) se funden al fondo del render (#080808 lineal) (D-15)
    const farEdge = smoothstep(FLOOR_FAR, FLOOR_FAR + 60, p.z).mul(smoothstep(45, 33, abs(p.x)));
    floorMat.colorNode = mix(vec3(0.00243), withFog(lightAt(p).mul(alb).add(float(0.0018).mul(appear)).mul(edge)), farEdge);
    // en la vitrina no hay piso (el vacío): aparece con la salida, bajo el riel que lleva a la sala
    floorMat.opacityNode = fbfK;
  }
  const metalMat = new THREE.MeshBasicNodeMaterial();
  metalMat.colorNode = withFog(lightAt(toL(positionWorld)).mul(0.2).add(float(0.004).mul(appear)));
  const housingMat = new THREE.MeshBasicNodeMaterial();
  housingMat.colorNode = withFog(lightAt(toL(positionWorld)).mul(0.075).add(float(0.003).mul(appear)));

  const floorM = new THREE.Mesh(new THREE.PlaneGeometry(90, FLOOR_NEAR - FLOOR_FAR), floorMat);
  floorM.position.set(0, 0, (FLOOR_NEAR + FLOOR_FAR) / 2); floorM.rotation.set(-Math.PI / 2, 0, 0); floorM.renderOrder = -2;
  group.add(floorM);
  await yieldToMain();
  if (!alive()) return null;

  ctl.corrStage = 'dust';
  /* ---------- polvo del tramo final (con las luces cerca, se tiñe) ---------- */
  const DUST = 1400;
  const dPos = new Float32Array(DUST * 3), dSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dPos[i * 3] = (Math.random() - 0.5) * 2 * (WALL - 0.1); dPos[i * 3 + 1] = Math.random() * CEIL; dPos[i * 3 + 2] = -34 - Math.random() * 32;
    dSeed[i] = Math.random();
  }
  const dustMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  {
    const base = instancedBufferAttribute(new THREE.InstancedBufferAttribute(dPos, 3));
    const seed = instancedBufferAttribute(new THREE.InstancedBufferAttribute(dSeed, 1));
    const t = time.mul(0.16).add(seed.mul(40));
    dustMat.positionNode = base.add(vec3(sin(t).mul(0.14), cos(t.mul(0.7)).mul(0.09), sin(t.mul(0.5)).mul(0.12)));
    const near = distance(positionWorld, cameraPosition);
    dustMat.scaleNode = seed.mul(0.016).add(0.006).mul(smoothstep(0.2, 2.2, near).mul(-0.6).add(1.6));
    const soft = float(1).sub(smoothstep(0.0, 0.5, length(uv().sub(0.5))));
    dustMat.colorNode = lightAt(toL(positionWorld)).mul(2.2).add(OFF.mul(0.01).mul(appear));
    const oof = smoothstep(rangeU.mul(0.35), rangeU, near.sub(focusU).abs()).mul(0.8).mul(dotK);
    dustMat.opacityNode = soft.mul(seed.mul(0.6).add(0.4)).mul(float(1).sub(fogF())).mul(smoothstep(0.3, 0.9, near)).mul(float(1).sub(oof)).mul(appear).mul(dustK);
  }
  const dust = new THREE.Sprite(dustMat); dust.count = DUST; dust.frustumCulled = false; group.add(dust);

  /* ---------- Projects: la vitrina (cuatro laptops en el vacío) ---------- */
  ctl.corrStage = 'vitrina';
  const vit = await buildVitrina({ renderer, camera, S, ctl, RED, OFF, appear, yieldToMain, assetBase, railStop: RAIL_STOP });
  if (!vit || !alive()) return null;
  group.add(vit.group);
  vit.texs.forEach((t) => texs.push(t));
  // fondo: el vacío de la vitrina (#050505 con el pozo de luz) mezclado con el del hero (#080808, el clear del render)
  scene.backgroundNode = mix(vec3(0.00243), vit.bgNode, vit.voidW);

  /* ---------- Frame by Frame: la sala de proyección, del otro lado del umbral ---------- */
  ctl.corrStage = 'projector';
  const END_P = V(0.78, 0.86, -54.8), END_L = V(-0.12, 0.12, -61.8);   // última pose de Projects (= primera de la sala)
  const proj = await buildProjector({
    group, toL, RED, OFF, appear, S, ctl, prep, yieldToMain, withFog, lightAt, metalMat, housingMat,
    headPos, headI, scrPos, scrI, endP: END_P, endL: END_L, railHeadZ: RAIL_STOP + 0.15, focusU, rangeU,
  });
  if (!proj || !alive()) return null;
  // Video (Tambor 360) sigue en el negro y la fotografía de la vitrina hasta su apagado (U3, costura Projects → Video)
  const lookW = max(vit.voidW, proj.lookW);
  scene.backgroundNode = mix(vec3(0.00243), vit.bgNode, lookW);

  group.visible = false;
  scene.add(group);

  /* ---------- post: DOF real + bloom sólo del rojo + viñeta + grano ----------
     Segundo RenderPipeline sobre el MISMO pass de escena (un solo render de la escena por frame, un solo contexto).
     Con galW → 0 empata con el post del hero. En la vitrina el DOF está apagado (rango enorme) y no hay grano: el
     desenfoque vive en el polvo y el grano en el fondo. Las pantallas de las laptops quedan FUERA del post: `vit.maskNode`
     es su cuadro en pantalla (proyectado en cada frame) y ahí sale el color del pase tal cual (MSAA, sin bloom, sin
     viñeta, sin DOF, sin grano). Es lo que pidió Juan: que los proyectos no se vean borrosos. */
  const pipeline = new THREE.RenderPipeline(renderer);
  const col = scenePass.getTextureNode('output');
  // El DOF lee la profundidad de lo opaco: el polvo y el haz (aditivos, sin depthWrite) toman la de lo que tienen detrás.
  // Donde detrás no hay nada, el vacío pasa a la distancia de foco (voidK 0 → 1) para no abrir discos (U4).
  const camFar = camera.far;
  const viewZ0 = scenePass.getViewZNode();
  const viewZc = clamp(viewZ0.negate(), focusU.sub(rangeU.mul(farK)), focusU.add(rangeU.mul(farK))).negate();
  const viewZ = select(viewZ0.lessThan(-(camFar - 0.5)), focusU.add(min(rangeU, 40).mul(3).mul(float(1).sub(voidK))).negate(), viewZc);
  const dofN = dof(col, viewZ, focusU, rangeU, bokehU);
  const redOnly = (c) => { const r = max(c.r.sub(max(c.g, c.b).mul(1.15)), 0); return vec4(r, r.mul(0.04), r.mul(0.05), 1); };
  const bl = bloom(mix(dofN, redOnly(dofN), galW), 1.2, 0.6, 0.12);
  const vigHero = smoothstep(1.05, 0.25, length(screenUV.sub(0.5).mul(vec2(1.25, 1.0))).mul(1.35)).mul(0.85).add(0.15);
  const vigNeg = smoothstep(1.05, 0.2, length(screenUV.sub(0.5).mul(vec2(1.2, 1.0))).mul(1.3)).mul(0.82).add(0.18);
  const grainN = fract(sin(dot(screenUV.mul(vec2(1731.3, 977.1)).add(fract(time.mul(13.7)).mul(91.7)), vec2(12.9898, 78.233))).mul(43758.5453)).sub(0.5).mul(0.03);
  const grainAmp = mix(float(1), smoothstep(0.0, 0.05, luminance(dofN.rgb)).mul(0.65).add(0.35), grainK);
  /* Fotografía de la vitrina (vW = vit.voidW: 1 en Projects, 0 desde la salida a Video). Fuera de la pantalla:
     - aberración cromática mínima, sólo hacia los bordes del cuadro (r², ≤ 1,3 px a 1440 en la esquina);
     - negro aplastado (sin velo: se resta un piso y nada queda gris) y sombras frías por multiplicación (no levanta);
     - viñeta del ~22 % en las esquinas (la del pasillo llegaba al 80 %);
     - grano fino proporcional a la luz (en el negro no se ve: no lo levanta). */
  const vW = lookW;
  const cOff = screenUV.sub(0.5);
  const caOff = cOff.mul(dot(cOff, cOff).mul(0.0042));
  // D-03 (2026-10-13): los tres canales salen de la MISMA imagen (la del DOF). Antes R y B se leían del pase crudo
  // (nítido) y G del DOF: con el DOF encendido (costura Projects → Video, u 9,3–11,3, foco en la señal) el verde
  // desenfocado se abría alrededor de cada punto del piso y de las aristas del tambor lejano (halo verde) y el centro
  // nítido quedaba en R+B (violeta). En la vitrina el DOF está apagado (CoC 0: su salida es el pase tal cual), así que
  // ahí la aberración no cambia.
  const dofT = dofN.getTextureNode();
  const ca = vec4(dofT.sample(screenUV.add(caOff)).r, dofN.g, dofT.sample(screenUV.sub(caOff)).b, 1);
  const baseC = mix(dofN, ca, vW);
  const lumB = luminance(baseC.rgb);
  // sombras frías por multiplicación (D-10: B − R ≈ +2–3 en 8 bit en los oscuros), luz neutra arriba
  const cold = mix(vec3(0.86, 0.97, 1.16), vec3(1), smoothstep(0.0, 0.08, lumB));
  const graded = max(baseC.rgb.sub(0.00035), 0).mul(cold);
  const vigVit = float(1).sub(smoothstep(0.32, 1.0, length(cOff.mul(vec2(1.25, 1.0))).mul(1.45)).mul(0.22));
  const gNorm = grainN.div(0.03);                                      // −0,5..0,5
  const vitLook = vec4(graded.mul(vigVit).mul(gNorm.mul(0.07).add(1)), 1).add(bl.mul(vigVit));
  const corrLook = dofN.add(bl).mul(mix(vigHero, vigNeg, galW)).add(grainN.mul(galW).mul(fbfK).mul(grainAmp));
  const post = mix(corrLook, vitLook, vW);
  // QA (?vmask): la máscara de las pantallas teñida de verde
  const maskDbg = S.params && S.params.has('vmask');
  // las caras del tambor de Frame by Frame (projector.js) tampoco pasan por el post (U3)
  const clean = max(vit.maskNode, proj.maskNode);
  pipeline.outputNode = maskDbg ? mix(post, vec4(0, 0.4, 0, 1), clean.mul(0.5)) : mix(post, col, clean);
  ctl.nodes.push(dofN, bl);
  ctl.pipelines.push(pipeline);

  /* ---------- colocación en el mundo (depende del layout del hero: la recta del About) ----------
     aboutPos/aboutLook: la pose final del About (mundo). El origen del pasillo cae sobre la recta, 9 m detrás de la
     cámara del About en el sentido del riel: así la cámara del About queda en (−7, 1,28, 9) del pasillo. */
  let railY = 0;
  function place({ yT, railZ, aboutPos, aboutLook }) {
    railY = yT;
    const ox = aboutPos.x - 9, oy = yT - 0.03, oz = -railZ;
    group.position.set(ox, oy, oz);
    group.rotation.set(0, Math.PI / 2, 0);
    group.updateMatrixWorld(true);
    offU.value.set(ox, oy, oz);
    const aP = group.worldToLocal(aboutPos.clone()), aL = group.worldToLocal(aboutLook.clone());
    vit.place(aP, aL);
    vit.setEnd(END_P, END_L);
    group.updateMatrixWorld(true);
  }
  /** x de mundo del final del riel (la cinta de la señal termina ahí) */
  const railEndX = () => group.position.x + RAIL_STOP;

  /* ---------- estado por frame ---------- */
  const st8 = { u: 0, focus: 7, range: 4, bokeh: 12, farK: 50, mode: '', headZ: RAIL_STOP + 0.15, endK: 0, lampK: 0, joinZ: -1e9, liveDone: false };
  const P = new THREE.Vector3(), L = new THREE.Vector3(), q = new THREE.Vector3(), fwd = new THREE.Vector3();
  const heartbeat = (t) => { const ph = t % 2.4; return Math.exp(-((ph - 0.05) ** 2) / 0.0016) + 0.6 * Math.exp(-((ph - 0.27) ** 2) / 0.0022); };
  /* Tomas que siguen después de Frame by Frame (Stack, Experience, Contact), en el orden del recorrido. Las engancha
     scene.js con setExt() y quedan ordenadas por U0. Cada una recibe la pose de la anterior (P/L) y sigue desde ahí. */
  const exts = [];
  const u0Of = (x) => (typeof x.U0 === 'function' ? x.U0() : x.U0);
  const extAt = (u) => { let e = null; for (const x of exts) if (u > u0Of(x)) e = x; return e; };
  let mouseRef = { x: 0, y: 0 };
  let hallRef = null;

  /** Pose de cámara para u (coordenadas del pasillo → mundo). */
  function camPose(u, t, dt, mouse, outPos, outLook) {
    mouseRef = mouse;
    if (u <= GAL_END) vit.pose(u, t, P, L);
    else { P.copy(END_P); L.copy(END_L); proj.pose(u, camera, P, L); }   // Frame by Frame: la sala sigue la misma toma
    for (const x of exts) if (u > u0Of(x)) x.pose(u, camera, P, L);   // Stack, Experience: siguen desde la pose anterior
    // deriva lenta del tramo final (la vitrina respira por su cuenta, vitrina.pose); en u = GAL_END empata con la sala (0,45)
    const xa = extAt(u);
    const calm = xa ? xa.calm(u) : u > GAL_END ? proj.calm(u) : 0.45 * smooth(LAST_OUT + 0.2, GAL_END, u);
    if (calm > 0) {
      P.x += Math.sin(t * 0.23) * 0.17 * calm; P.y += Math.sin(t * 0.31 + 1) * 0.04 * calm; P.z += Math.cos(t * 0.19) * 0.2 * calm;
      L.x += Math.sin(t * 0.17 + 2) * 0.1 * calm; L.y += Math.sin(t * 0.27) * 0.035 * calm;
    }
    outPos.copy(P); group.localToWorld(outPos);
    outLook.copy(L); group.localToWorld(outLook);
  }

  /** Estado para u: vitrina, riel, cabezal, foco, sala. Escribe uniforms. Corre con la cámara ya puesta. */
  function update(u, t, dt, gw) {
    st8.u = u;
    // señal: en la salida de Projects el cabezal corre por el riel desde la unión hasta el umbral y se queda
    const hb = heartbeat(t);
    headI.value = (0.75 + hb * 1.1) * (1 + 0.9 * smooth(LAST_OUT + 0.3, GAL_END, u));
    const eh = u < GAL_END ? vit.exitHead(u) : null;
    st8.headZ = eh ? eh.z : RAIL_STOP + 0.15;
    st8.lampK = u >= GAL_END ? 1 : eh ? eh.k : 0;
    if (eh) st8.joinZ = eh.joinZ;
    headPos.value.set(0, 0.03, st8.headZ);
    const endK = smooth(LAST_OUT, LAST_OUT + 0.7, u);
    st8.endK = endK;
    railI.value = (1 - 0.75 * endK) * smooth(LAST_OUT, LAST_OUT + 0.6, u);
    const thr = smooth(LAST_OUT + 0.1, LAST_OUT + 0.8, u);
    redFar.value = 1 - 0.85 * thr;
    redNear.value = 1 - 0.55 * thr;
    ambX.value = 0.034 * thr;
    roomI.value = 0.55 * smooth(LAST_OUT + 0.2, LAST_OUT + 1.0, u) * (1 - 0.5 * smooth(FBF_BEAM[0], FBF_BEAM[1] + 0.3, u));
    dotK.value = thr;
    fbfK.value = smooth(LAST_OUT + 0.3, GAL_END - 0.05, u);
    floorM.visible = fbfK.value > 0.001;
    dustK.value = smooth(GAL_END - 0.1, GAL_END + 0.4, u);
    dust.visible = dustK.value > 0.001;
    const fbfMid = smooth(FBF_INTRO[0], FBF_INTRO[1], u) * (1 - smooth(FBF_OFF - 0.2, FBF_OFF + 0.2, u));
    voidK.value = smooth(LAST_OUT + 0.15, LAST_OUT + 0.6, u) * (1 - 0.22 * fbfMid);
    grainK.value = thr;
    // Projects: laptops, señal, lente, máscaras (la cámara ya está puesta)
    vit.update(u, t, dt, gw);
    // Frame by Frame: lámpara, haz, pantallas y foco (null antes de la sala)
    const fx = proj.update(u, t, dt, gw, P, L, S.inView);
    if (fx && fx.ambK !== undefined) ambX.value *= fx.ambK;   // Tambor: el piso sólo en el charco del video (U3, R56-05)
    // R3-02: la sala de Video (pantallas en espera y su polvo) no se adivina en la salida de Projects: aparecía cortada
    // arriba a la izquierda, a ~8 %, como un resto. Entra cuando la cámara ya mira la sala (sin tocar projector.js).
    if (!hallRef) hallRef = group.getObjectByName('fbf-hall');
    if (hallRef && u < GAL_END - 0.15) hallRef.visible = false;
    let ex = null;
    for (const x of exts) { const r = x.update(u, t, dt, gw, P, L); if (r) ex = r; }

    // foco (sólo cuenta desde la salida: en la vitrina no hay DOF). Cada cambio de modo = rack focus (con su sonido).
    fwd.copy(L).sub(P).normalize();
    let mode, fT;
    const vi = vit.info().vit;
    if (ex) { mode = ex.mode; fT = ex.fT; }
    else if (fx && u > GAL_END) { mode = fx.mode; fT = fx.fT; }
    else if (u < 0.9) { mode = 'about'; fT = 7; }
    else if (u > LAST_OUT + 0.35) { mode = 'end'; fT = q.set(0, 0.03, st8.headZ).sub(P).dot(fwd); }   // el cabezal, nítido
    else { mode = vi; fT = 8; }
    if (mode !== st8.mode) {
      // en la vitrina suenan el cenital y la bisagra (vitrina.js); el rack focus queda para Frame by Frame en adelante
      if (st8.mode && st8.liveDone && gw > 0.5 && !/^(relay|enter|exit|stay)/.test(mode)) playSound('focus', { rate: fT > st8.focus ? 0.92 : 1.1 });
      st8.mode = mode;
    }
    st8.liveDone = true;
    st8.focus = damp(st8.focus, Math.max(0.6, fT), 2.4, dt);
    focusU.value = st8.focus;
    const rT = ex ? ex.rT : fx && u > GAL_END ? fx.rT : mode === 'end' ? 5.5 : 4;
    st8.range = damp(st8.range, rT, 2.4, dt);
    const fm = fx && u > GAL_END ? fx.mode : mode;
    const bT = fm === 'end' || fm === 'rise' || fm === 'fbf-end' ? 6 : fm === 'intro' ? 8 : 12;
    st8.bokeh = damp(st8.bokeh, bT, 2.4, dt);
    bokehU.value = st8.bokeh;
    st8.farK = damp(st8.farK, fm === 'fbf-end' ? 0.35 : 50, 2.4, dt);
    farK.value = st8.farK;
    // DOF: apagado en toda la vitrina (rango enorme); entra con la salida, cuando el riel y la sala llenan el cuadro
    const dofIn = gw * smooth(LAST_OUT + 0.3, GAL_END, u);
    rangeU.value = st8.range + (1 - dofIn) * (1 - dofIn) * 1e5;
  }

  /** Bloques de texto de Projects (vitrina) y rótulos de Frame by Frame. */
  function placeTags() {
    proj.placeTags(camera);
    vit.placeTags(S.neg.tags, mouseRef);
  }

  /** Precalentado: compila los materiales (sin dibujar) con todo visible. */
  async function warm() {
    const prevVis = group.visible;
    group.visible = true;
    proj.warm(true);
    vit.warm(true);
    const culled = [];
    group.traverse((o) => { if (o.isMesh || o.isSprite) { culled.push([o, o.frustumCulled]); o.frustumCulled = false; } });
    ctl.corrStage = 'compile';
    // compileAsync arma la lista y pide los pipelines en forma síncrona y recién después espera: todo lo que se tocó se
    // restaura ANTES del await (si no, un frame del loop podía dibujar el post dentro de la textura que él mismo lee).
    const prevRT = renderer.getRenderTarget();
    let pending = null;
    try {
      if (scenePass.renderTarget) renderer.setRenderTarget(scenePass.renderTarget);
      pending = renderer.compileAsync(scene, camera);
    } catch (e) { /* sin compileAsync: compila en el primer frame */ }
    finally {
      renderer.setRenderTarget(prevRT);
      culled.forEach(([o, f]) => { o.frustumCulled = f; });
      group.visible = prevVis;
      proj.warm(false);
      vit.warm(false);
    }
    // tope de 4 s (WebGL 2 con la pestaña oculta no termina nunca); lo que falte compila en el primer frame
    try { await Promise.race([pending, new Promise((r) => setTimeout(r, 4000))]); } catch (e) { /* idem */ }
    // las texturas (pantallas, teclado, nombres, pósters) se suben a la GPU acá, de a una por tarea (U-fix-2)
    ctl.corrStage = 'upload';
    for (const t of texs) {
      if (!alive()) return;
      try { renderer.initTexture(t); } catch (e) { /* se sube en el primer frame */ }
      await yieldToMain();
    }
  }

  return {
    group, pipeline, bloom: bl, place, camPose, update, placeTags, warm, railEndX,
    /** brillo de la cinta del riel en x de mundo. Entrada: la recta del About se recoge hasta la base de TraumaVision
        (que queda encendida en su estadía). Salida: estela del cabezal desde la unión con la línea de LEEX hasta el
        umbral. Nada en el resto (la vitrina vive en el vacío). */
    railBri(xw) {
      const zl = xw - group.position.x;
      if (zl < RAIL_STOP) return 0;
      const u = st8.u;
      const c = camera.position, gx = xw - c.x, gy = railY - c.y, gz = group.position.z - c.z;
      const near = smooth(0.8, 2.5, Math.sqrt(gx * gx + gy * gy + gz * gz));
      let b = 0;
      if (u < GAL_DWELLS[1][0]) {
        const w = vit.railWindow(u);
        if (w.k > 0) b += 0.34 * w.k * smooth(w.a - 0.05, w.a + 0.05, zl) * (1 - smooth(w.b - 0.05, w.b + 0.05, zl));
      }
      if (u > LAST_OUT && st8.lampK > 0) {
        const fade = Math.min(1, (zl - RAIL_STOP) / 0.25);
        const dz = Math.abs(zl - st8.headZ);
        const base = 0.34 * (1 - 0.6 * st8.endK);
        // estela: de la unión (donde entra la línea de LEEX) al cabezal; adelante del cabezal, sólo su resplandor
        const trail = smooth(st8.headZ - 0.6, st8.headZ, zl) * (1 - smooth(st8.joinZ - 0.3, st8.joinZ + 0.3, zl));
        b += (base * trail + 1.25 * Math.exp(-dz * 0.9) * headI.value / 1.85) * fade * st8.lampK;
      }
      return b * near;
    },
    /** óptica: la vitrina usa una más larga (VIT_FOV); vuelve a la del sitio con la salida a Video */
    fovAt: (u, base) => base + (VIT_FOV - base) * (1 - smooth(LAST_OUT + 0.2, GAL_END, u)) * smooth(GAL_ABOUT_OUT, GAL_ABOUT_OUT + 0.6, u),
    /** la galería cerrada (scene.js no llama a update): silencio */
    idle: () => vit.idle(),
    /** peso de la vitrina (1 en Projects): scene.js achica el halo del bloom ahí (el rojo es un hilo, no neón: D-04) */
    vitW: () => vit.voidW.value,
    headWorldX: () => group.position.x + st8.headZ,
    /** cabezal en el mundo (en Frame by Frame sube y es la lámpara del proyector) */
    headWorld: (out) => group.localToWorld(out.copy(headPos.value)),
    /** visibilidad del cabezal: aparece cuando la línea de LEEX llega a la recta */
    lampVis: () => st8.lampK,
    fbf: proj,
    /** engancha una toma posterior (U0: u desde el que manda; pose, calm, update) */
    setExt: (e) => { exts.push(e); exts.sort((a, b) => u0Of(a) - u0Of(b)); },
    /** pantalla de la laptop bajo el puntero (sólo la del bloque visible) */
    pick: (mx, my, active) => vit.pick(mx, my, active),
    pickFbf: (mx, my) => proj.pick(mx, my, camera),
    railY: () => railY,
    info: () => ({ mode: st8.mode, focus: +st8.focus.toFixed(2), range: +st8.range.toFixed(2), headZ: +st8.headZ.toFixed(2), ...vit.info(), ...proj.info() }),
    activeTag: (u) => { for (let k = 0; k < NP; k++) if (tagWanted(k, u)) return k; return -1; },
    ABOUT_OUT: GAL_ABOUT_OUT,
  };
}
