/* Frame by Frame «Tambor 360» dentro de la escena persistente «Señal» (U3, 2026-10-12). Port de la maqueta A de la
   sección de videos (clients/jpr-portfolio/maquetas/2026-10-12-videos/a/), elegida por Juan («A»). Reemplaza a la sala
   de proyección (U4); la galería 360 de u2-galeria360 no se usa (Juan: «No me gusta»).

   Un tambor de cinco pantallas LED (9:16, los videos en el orden fijo de Juan) sobre un zócalo de aluminio grafito,
   en el vacío. La línea roja con la que se cierra la última laptop de Projects corre por el piso desde el umbral, sube
   por el zócalo y se abre en el anillo rojo de la base; las caras se encienden desde el anillo hacia arriba. El tambor
   gira SÓLO si el usuario lo pide (S.fbf.rot lo escribe VideosStage.tsx: flechas, ← →, arrastre) y da la vuelta
   completa. La cara de frente queda casi de frente (órbita ±4°) y grande; las vecinas se ven de canto, así que a mitad
   de un giro hay dos caras a ±36° y nunca un hueco en el centro. Al girar, la cámara se aleja y sube un poco y vuelve.
   Cada video horizontal sale de su cara y se abre a 16:9 delante del tambor (un solo 16:9 que se muda a la cara de
   frente que tenga un horizontal; 2026-10-15: son tres, la demo de licitaciones, el trailer LEEX × KIBBO y la
   comparación de modelos). N videos, 5 caras (2026-10-14, opción A de Juan: «Mismo tambor, 10 videos»; 12 desde el
   2026-10-15): el prisma no cambia; S.fbf.rot es el paso lógico. Cara de frente = paso mod 5, video = paso mod N, giro
   infinito. Cada cara muestra el video del paso más
   cercano que le toca (paso ≡ cara mod 5): ese paso cambia sólo cuando la cara cruza los 180° (de espaldas, tapada por
   el resto del prisma), y ahí se le reasigna video y textura. Nunca hay un cambio a la vista.
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
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
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
const N = 5;                                         // caras del prisma (fijo: la geometría que eligió Juan)
const NV = VIDEOS.length;                            // videos que recorre (12)
/** pasos de la cara k al frente, en [-N/2, N/2): ±2,5 = de espaldas (180°) */
const relOf = (k, r) => mod(k - r + N / 2, N) - N / 2;
/** el video que muestra la cara k con el tambor en r: el del paso más cercano que cae en esa cara */
const vidOf = (k, r) => mod(Math.round(r + relOf(k, r)), NV);
/** el video j es horizontal: en la cara se ve su centro y, con el tambor quieto, se abre a 16:9 */
const isLand = (j) => VIDEOS[j].width > VIDEOS[j].height;
const SRC_IN = 1.5, SRC_OUT = 1.9;                   // src cuando la cara puede llegar al frente; se suelta lejos de él
const LAST_OUT = GAL_DWELLS[GAL_DWELLS.length - 1][1];
const PRE_U = LAST_OUT - 1.5;                        // precalentado de los videos aunque el scroll no se detenga (~u 7,5)
const PRE_FROM = 1.0;                                // desde la estadía de TraumaVision, con el scroll quieto

/* ---------- el tambor (metros del pasillo) ---------- */
const H = FBF_DRUM.h, W = FBF_DRUM.w, Y0 = FBF_DRUM.base;
const STEP = (Math.PI * 2) / N;
const AP = W / (2 * Math.tan(Math.PI / N));        // apotema
const R = W / (2 * Math.sin(Math.PI / N));          // radio a las aristas
const FZ = FBF_DRUM.frontZ, ZC = FZ - AP;            // cara de frente / eje del tambor
const LAMP = V(0, 3.6, FZ + 5.1);                    // de dónde baja el haz (network.js arma la nube entre esto y la cara)
const REFL = false;                                  // reflejo de las caras en el piso: apagado (R7-02)
const FILL = 0.7;                                    // la cara de frente: ~70 % del alto del cuadro (≈ 630 px a 1440×900)

/** Arma el tambor. Devuelve el controlador o null si se desmontó a mitad. */
export async function buildProjector({
  renderer, quality = null, group, toL, RED, OFF, appear, S, ctl, prep, yieldToMain, withFog, lightAt, metalMat, housingMat,
  headPos, headI, scrPos, scrI, endP, endL, railHeadZ, focusU, rangeU,
}) {
  const alive = () => !ctl.disposed && !S.dead;
  const RM = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hall = new THREE.Group();
  hall.name = 'fbf-hall';                            // network.js oculta sus grupos hijos cuando arranca Stack
  hall.visible = false;
  group.add(hall);
  const camL = uniform(new THREE.Vector3());         // cámara en coordenadas del pasillo (cintas y haz miran a cámara)
  /* Video hereda la fotografía de la vitrina (negro aplastado sin velo, sombras frías, viñeta suave, grano sólo en la
     luz) y su fondo #050505: es el mismo vacío y la misma toma, así el empalme Projects → Video no tiene salto de
     gradación (design-critic, ronda 4). corridor.js usa max(vitrina, lookW); vuelve al look del pasillo recién en el
     apagado del tambor, camino a Stack. */
  const lookW = uniform(0);
  const texs = [];
  /* nivel de calidad vigente (quality.js): en bajo, src sólo para la cara de frente (la que llega en un giro lo pide al
     empezar el giro). Se aplica en cada asignación, nunca a un video que ya corre.
     La sección de Video no se optimiza (2026-10-20, Juan: «por que se ven tan feos los videos??»): en todos los niveles
     el video y el póster 1080p (los -720 iban a ~0,4-0,8 Mbps) y las caras con anisotropía 16 (el máximo de WebGPU;
     three lo recorta al del adaptador). sharp() sólo arma texturas de las caras (pósters y videos). */
  const Q = () => (quality ? quality() : { frontOnly: false });
  const posterOf = (j) => VIDEOS[j].poster;
  const ANISO = Math.min(16, renderer && renderer.getMaxAnisotropy ? renderer.getMaxAnisotropy() : 16);
  const sharp = (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = ANISO;
    t.needsUpdate = true; texs.push(t); ctl.texs.push(t); return t;
  };
  /** sube la textura a la GPU (con sus mipmaps) en un hueco ocioso, no en el primer cuadro en que se ve: los pósters que
      llegan en segundo plano y el primer cuadro de cada video (antes se subían en pleno pase Projects → Video) */
  /* Con el scroll quieto (S.scrollQuiet, scene.js): subir 1080p con mipmaps en pleno scroll era parte del tirón del
     precalentado (u 7,6). Si el scroll no se queda quieto en ~3 s, se sube igual. `done`: después de subir. */
  const quiet = () => !S.scrollQuiet || S.scrollQuiet();
  const idleUpload = (t, done) => {
    if (!renderer || !renderer.initTexture) { if (done) done(); return; }
    let tries = 0;
    const go = () => {
      if (!alive() || !texs.includes(t)) return;
      if (!quiet() && ++tries < 10) { setTimeout(() => (typeof requestIdleCallback === 'function' ? requestIdleCallback(go, { timeout: 400 }) : go()), 300); return; }
      try { renderer.initTexture(t); if (done) done(); } catch (e) { /* se sube al dibujarla */ }
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 400 }); else setTimeout(go, 0);
  };

  /* ---------- pósters (las texturas hasta que el video tiene su primer cuadro) ---------- */
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  // al armar: los de las cinco caras de arranque; el resto, en segundo plano apenas está el tambor
  const r0 = (S.fbf && S.fbf.rot) || 0;
  const posterTex = VIDEOS.map(() => null), posterReq = VIDEOS.map(() => null);
  /** un <video> por video (ver «videos» más abajo); arriba porque el 16:9 lee su textura al colgarse */
  const vids = VIDEOS.map(() => null);
  /** lo que muestra el video j: su textura de video si ya tiene cuadro, si no su póster */
  // el video recién se muestra con su primer cuadro ya subido a la GPU (ready); hasta ahí, su póster: así la subida de
  // 1080p con mipmaps nunca cae en el primer cuadro en que la cara se ve (tirón de u 9,7 / 11)
  const texOf = (j) => (vids[j] && vids[j].ready && vids[j].tex) || posterTex[j];
  const first = [...new Set(Array.from({ length: N }, (_, k) => vidOf(k, r0)))];
  const firstImgs = await Promise.all(first.map((j) => loadImg(posterOf(j))));
  if (!alive()) return null;
  first.forEach((j, i) => { posterTex[j] = sharp(new THREE.Texture(firstImgs[i])); });
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- materiales del objeto: el mismo grafito PBR y el mismo estudio HDRI que la notebook (R56-06) ----------
     El env no se vuelve a cargar ni a filtrar: se toma el PMREM que ya armó la vitrina (studioEnv, notebook.js) de uno de
     sus materiales. Cuerpo arenado (roughness .5), aristas y chaflanes pulidos (.28) que atrapan el estudio; bisel de
     vidrio negro con clearcoat. La luz del pasillo (la señal roja, el video encendido) entra como emisión tenue. */
  let env = null;
  const vitG = group.getObjectByName('vitrina');
  if (vitG) vitG.traverse((o) => {
    if (env || !o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (!env && m && m.envMap) env = m.envMap;
  });
  const spill = lightAt(toL(positionWorld));
  const graphite = new THREE.MeshPhysicalNodeMaterial({ color: 0x55585e, metalness: 0.9, roughness: 0.5, envMap: env, envMapIntensity: 0.34 });
  graphite.emissiveNode = spill.mul(0.1);
  const polished = new THREE.MeshPhysicalNodeMaterial({ color: 0x7d8086, metalness: 0.9, roughness: 0.28, envMap: env, envMapIntensity: 0.42 });
  polished.emissiveNode = spill.mul(0.12);
  const bezelM = new THREE.MeshPhysicalNodeMaterial({ color: 0x030304, metalness: 0, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, envMap: env, envMapIntensity: 0.2 });
  bezelM.emissiveNode = spill.mul(0.02);

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
  // chaflanes pulidos: filetes finos en el canto del zócalo y en los dos cantos de la tapa
  for (const y of [Y0 - 0.006, Y0 + H + 0.003, Y0 + H + 0.057]) {
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.036, R + 0.036, 0.012, N, 1, false, Math.PI / N), polished);
    ch.position.y = y; drum.add(ch);
  }
  for (let k = 0; k < N; k++) {
    const a = k * STEP + STEP / 2;
    const p = new THREE.Mesh(new RoundedBoxGeometry(0.045, H + 0.02, 0.045, 2, 0.012), polished);
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
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true });
    const fade = smoothstep(0.8, 1.0, uv().y).pow(1.6);
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
    // sin piso (2026-10-15): la mitad de abajo del halo ya no la tapa nada y bajaba como una columna de luz detrás de
    // los controles (el lugar de R7-02). Se apaga suave bajo el zócalo, donde antes cortaba el piso: luz alrededor del
    // objeto, nada colgando en el vacío
    const under = smoothstep(-0.55, 0.12, toL(positionWorld).y);
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    m.colorNode = avg.mul(exp(d.mul(d).mul(-3.2)).mul(edge).mul(under)).mul(u.halo).mul(appear);
    m.opacityNode = float(1);
    return { m, tn };
  }
  const mkU = () => ({ dim: uniform(1), cropW: uniform(1), cropH: uniform(1), offY: uniform(0), lift: uniform(0), refl: uniform(0), halo: uniform(0) });

  const cropOf = (j) => { const vd = VIDEOS[j]; return vd.width > vd.height ? (W / H) / (vd.width / vd.height) : 1; };  // la cara muestra el centro del 16:9
  const faces = Array.from({ length: N }, (_, k) => {
    const j = vidOf(k, r0);
    const th = k * STEP;
    const g = new THREE.Group();
    g.position.set(Math.sin(th) * AP, Y0 + H / 2, Math.cos(th) * AP); g.rotation.y = th;
    drum.add(g);
    const poster = posterTex[j];
    const u = mkU();
    const sc = screenMat(poster, cropOf(j), u);
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
      // B-01: el núcleo lee #E8272A (G/R ≈ 0,17 en sRGB), sin el centro blanco-salmón: sólo rojo de marca, sin quemar
      rm.colorNode = RED.mul(core.mul(1.5)).mul(win).mul(ring.inten).mul(appear);
      rm.opacityNode = float(1);
    }
    const ringM = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.05, 0.02), rm);
    ringM.position.set(0, -H / 2 - 0.012, 0.03); ringM.renderOrder = 6; g.add(ringM);
    const rf = reflMat(poster, u);
    const refl = new THREE.Mesh(new THREE.PlaneGeometry(W, H), rf.m);
    refl.position.set(0, -2 * (Y0 + H / 2), 0.012); refl.renderOrder = -1;
    // R7-02: el reflejo de las caras caía justo detrás de los controles (y ≈ 794–860 a 1440) y se leía como una caja de
    // bordes rectos sobre el piso; queda fuera de la escena (el piso ya toma la luz del video en el charco)
    if (REFL) g.add(refl);
    const hl = haloMat(poster, u, 2.3);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.3, H * 2.3), hl.m);
    halo.position.z = -0.45; halo.renderOrder = 1; g.add(halo);
    return { k, j, g, scr, u, nodes: [sc.tn, rf.tn, hl.tn].filter(Boolean), halo, ring, ringM, front: 0, facing: 0, pw: 0 };
  });

  /* ---------- la cara horizontal: sale del tambor y se abre a 16:9 delante ----------
     Un solo 16:9 para todos los horizontales: cuelga de la cara de frente cuando su video es horizontal y toma su
     textura y su proporción (se muda de cara o de video sólo con el 16:9 cerrado). */
  let wide = null;
  if (VIDEOS.some((_, j) => isLand(j))) {
    const H2 = H * 0.86;
    const u = mkU();
    const t0 = posterTex[first[0]];
    const sc = screenMat(t0, 1, u);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sc.m);
    scr.renderOrder = 3; scr.visible = false;
    const bz = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bezelM);
    bz.visible = false;
    const rf = reflMat(t0, u);
    const refl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), rf.m);
    refl.renderOrder = -1; refl.visible = false;
    wide = { u, scr, bz, refl, H2, W2: H2, asp: 1, j: -1, e: 0, f: null, nodes: [sc.tn, rf.tn] };
  }
  /** cuelga el 16:9 de la cara f, con el video que muestra esa cara */
  function hangWide(f) {
    wide.f = f;
    if (!f) { wide.j = -1; return; }
    wide.j = f.j;
    const vd = VIDEOS[f.j];
    wide.asp = vd.width / vd.height; wide.W2 = wide.H2 * wide.asp;
    const t = texOf(f.j);
    if (t) wide.nodes.forEach((n) => { n.value = t; });
    f.g.add(wide.scr, wide.bz);
    if (REFL) f.g.add(wide.refl);
  }
  // al armar ya cuelga de una cara (warm lo compila con el resto); la de frente si es horizontal
  if (wide) hangWide(faces.find((f) => f.k === mod(Math.round(r0), N) && isLand(f.j)) || faces.find((f) => isLand(f.j)) || faces[0]);
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
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true });
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
    // B-01: núcleo y cabeza en el rojo de marca (sin el blanco-salmón): la cabeza es más rojo, no más blanco
    m.colorNode = RED.mul(glowP.add(coreP.mul(1.3)).add(headF.mul(coreP.add(glowP)).mul(0.8))).mul(I);
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
  // no dibujar lo invisible: el haz (× beamI), el polvo (× luz del haz o del video) y, por cara, el halo y el anillo
  // (× su intensidad) dejan de dibujarse cuando valen 0; desde Stack se dibujaban apagados hasta Contacto
  let beamMesh = null, hallDust = null;
  const bA = uniform(LAMP.clone()), bB = uniform(V(0, Y0 + H * 0.78, FZ + 0.2));
  {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    geo.setAttribute('aEnd', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 1]), 1));
    geo.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array([-1, 1, -1, 1]), 1));
    geo.setIndex([0, 2, 1, 1, 2, 3]);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true });
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
    beamMesh = new THREE.Mesh(geo, m);
    beamMesh.frustumCulled = false; beamMesh.renderOrder = 4;
    hall.add(beamMesh);
  }

  /* ---------- polvo alrededor del tambor (lo único con bokeh): toma la luz del video y, en el haz, el rojo ---------- */
  {
    const DUST = 900;
    const dPos = new Float32Array(DUST * 3), dSeed = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      dPos[i * 3] = (Math.random() - 0.5) * 6; dPos[i * 3 + 1] = 0.1 + Math.random() * 4.2; dPos[i * 3 + 2] = FZ + 6.5 - Math.random() * 8;
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
    const inB = float(1).sub(smoothstep(sp.mul(0.3), sp.mul(1.1).add(0.08), radial))   // 0 fuera del cono (bordes en orden: WGSL/GLSL)
      .mul(smoothstep(0.05, 0.2, sp)).mul(float(1).sub(smoothstep(0.6, 0.95, sp)));
    const near = distance(positionWorld, cameraPosition);
    m.scaleNode = seed.mul(0.013).add(0.006).mul(smoothstep(0.2, 2.2, near).mul(-0.6).add(1.6));
    const soft = float(1).sub(smoothstep(0.0, 0.5, length(uv().sub(0.5))));
    m.colorNode = lightAt(toL(positionWorld)).mul(2.0).add(RED.mul(inB.mul(beamI).mul(1.6))).add(OFF.mul(0.005));
    // R56-05: sólo existe donde hay luz: dentro del haz o en el charco del video (frente al tambor); nada en el vacío
    // R7-01: el charco es del piso: gaussiana corta alrededor de la luz del video y sólo en la franja baja (nada sobre
    // el horizonte); fuera del cono del haz y del charco, cero
    const pl = toL(positionWorld);
    const dp = distance(pl, scrPos);
    const pool = exp(dp.mul(dp).mul(-0.9)).mul(float(1).sub(smoothstep(0.2, 0.7, pl.y))).mul(scrI.mul(2.0)).min(1);
    const lit = max(inB.mul(beamI), pool);
    m.opacityNode = soft.mul(seed.mul(0.6).add(0.4)).mul(smoothstep(0.3, 0.9, near)).mul(lit).mul(appear);
    hallDust = new THREE.Sprite(m); hallDust.count = DUST; hallDust.frustumCulled = false; hallDust.renderOrder = 30; hallDust.userData.dust = DUST;
    hall.add(hallDust);
  }
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- videos: fuera del DOM, mudos, en loop; src recién cuando su cara puede llegar al frente ----------
     Uno por video (no por cara). El que se aleja del frente suelta su src (removeAttribute + load) y su textura: con las
     vueltas la memoria no crece (a lo sumo las tres caras que pueden llegar al frente tienen src). */
  /** apunta las caras (y el 16:9) que muestran el video j a su textura actual */
  function showVid(j) {
    const t = texOf(j);
    if (!t) return;
    faces.forEach((f) => { if (f.j === j) f.nodes.forEach((n) => { n.value = t; }); });
    if (wide && j === wide.j) wide.nodes.forEach((n) => { n.value = t; });
  }
  /** póster del video entrante: se pide antes de que su cara llegue a los 180° (en segundo plano, una vez) */
  function loadPoster(j) {
    if (posterTex[j] || posterReq[j]) return;
    posterReq[j] = loadImg(posterOf(j)).then((img) => {
      if (!alive()) return;
      posterTex[j] = sharp(new THREE.Texture(img));
      idleUpload(posterTex[j]);
      if (!(vids[j] && vids[j].ready)) showVid(j);
    }).catch(() => { posterReq[j] = null; });
  }
  /** la cara f pasa a mostrar el video j (sólo de espaldas: ver update) */
  function assign(f, j) {
    f.j = j;
    f.u.cropW.value = cropOf(j);
    loadPoster(j);
    const t = texOf(j);
    if (t) f.nodes.forEach((n) => { n.value = t; });
  }
  const dropTex = (t) => {
    for (const a of [texs, ctl.texs]) { const i = a.indexOf(t); if (i >= 0) a.splice(i, 1); }
    t.dispose();
  };
  /** el video j suelta su src y su textura; lo que lo mostraba vuelve a su póster */
  function release(j) {
    const r = vids[j];
    if (!r) return;
    vids[j] = null;
    try { r.v.pause(); r.v.removeAttribute('src'); r.v.load(); } catch (e) { /* noop */ }
    if (!r.tex) return;
    faces.forEach((f) => {
      if (f.nodes[0].value !== r.tex) return;
      const t = posterTex[f.j] || posterTex[j];
      f.nodes.forEach((n) => { n.value = t; });
    });
    if (wide && wide.nodes[0].value === r.tex) wide.nodes.forEach((n) => { n.value = posterTex[wide.j] || posterTex[j]; });
    dropTex(r.tex);
  }
  function ensureVideo(k, preload = 'auto') {
    if (vids[k]) return vids[k];
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.preload = preload;
    const rec = { v, tex: null, last: -1, vfc: false, fresh: true };
    // un cuadro nuevo del video avisa con requestVideoFrameCallback (Chrome lo dispara también fuera del DOM): la subida
    // va a la cadencia del video (24-30 fps), no a la del rAF (72 o 144). Hasta el primer aviso (o sin rVFC), como antes.
    if (typeof v.requestVideoFrameCallback === 'function') {
      const onFrame = () => { if (vids[k] !== rec) return; rec.vfc = true; rec.fresh = true; v.requestVideoFrameCallback(onFrame); };
      v.requestVideoFrameCallback(onFrame);
    }
    v.addEventListener('loadeddata', () => {
      if (!alive() || rec.tex || vids[k] !== rec) return;
      v.width = v.videoWidth; v.height = v.videoHeight;      // la textura común toma el tamaño de estos atributos
      rec.tex = sharp(new THREE.Texture(v));
      // subido el primer cuadro, no se vuelve a subir el mismo en el primer cuadro visible (antes currentTime ≠ −1 lo
      // volvía a marcar al entrar al Tambor)
      idleUpload(rec.tex, () => {
        if (vids[k] !== rec) return;
        rec.last = v.currentTime; rec.fresh = false; rec.ready = true;
        showVid(k);
      });
    });
    v.src = VIDEOS[k].src;
    v.load();                                                // explícito: fuera del DOM Chrome puede no empezar a cargar solo
    vids[k] = rec;
    return rec;
  }
  function preheat() {
    if (vids.some((r) => r && !r.tex)) return;                 // de a uno: el anterior todavía no tiene su primer cuadro
    // R-04: en bajo (frontOnly) sólo la cara de frente, como en el camino `on`
    const near = faces.filter((f) => Math.abs(relOf(f.k, st.rot)) < (Q().frontOnly ? 0.999 : SRC_IN))
      .sort((a, b) => Math.abs(relOf(a.k, st.rot)) - Math.abs(relOf(b.k, st.rot)));
    for (const f of near) if (!vids[f.j]) { ensureVideo(f.j, 'metadata'); return; }
  }
  /** R-05: los videos precalentados se sueltan (src y textura) si el usuario sale de Projects hacia arriba o la galería
      se cierra; vuelven a pedirse al volver */
  function dropPreheat() { vids.forEach((r, j) => { if (r) release(j); }); }
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
    lookW.value = on ? gw * (1 - smooth(FBF_OFF + 0.1, FBF_END, u)) : 0;
    if (!on) {
      st.active = -1; S.fbf.active = -1; S.fbf.wide = 0; scrI.value = 0; pauseAll();
      // precalentado (tirones de u 7,6 y 9,7): los videos de la cara de frente y sus vecinas piden src (sólo metadatos y
      // su primer cuadro), de a uno, desde Projects y con el scroll quieto; el primer cuadro se sube en idle, también
      // quieto. Si el usuario no se detiene nunca, desde PRE_U igual (como antes). En el pase al Tambor ya están.
      if (gw > 0.5 && u > PRE_FROM && (u > PRE_U || quiet())) preheat();
      else if (gw < 0.5 || u < PRE_FROM) dropPreheat();          // R-05: fuera de Projects se sueltan
      return null;
    }
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
    // reasignación: el paso de una cara cambia sólo al cruzar los 180° (de espaldas); ahí toma su video nuevo
    faces.forEach((f) => { const j = vidOf(f.k, st.rot); if (j !== f.j) assign(f, j); });
    const fadeK = rm ? smooth(0, 0.35, t - st.fadeT) : 1;

    // la señal: corre por el piso desde el umbral y sube por el zócalo; queda una cola encendida que alimenta el anillo
    const run = easeIO(range(u, FBF_RUN[0], FBF_RUN[1]));
    const off = smooth(FBF_OFF - 0.05, FBF_OFF + 0.45, u);
    const s1 = run * RUN_LEN;
    // R56-07: llegada la señal, la cola se recoge hasta el zócalo (en la estadía, en el piso bajaba por el centro del
    // cuadro y partía el contador); queda la subida al anillo
    const tail = run < 1 ? 9 : lerp(3.2, RUN_LEN - (LZ0 - LZ1) + 0.06, smooth(FBF_RUN[1], FBF_STAY[0] - 0.05, u));
    line.u.s1.value = s1; line.u.s0.value = Math.max(0, s1 - tail);
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
      f.u.refl.value = 0.03 * f.front * pw * fadeK;
      f.u.halo.value = 0.022 * f.front * pw;
      f.ring.inten.value = ringI * lerp(0.4, 1.1, f.front);
      f.scr.visible = pw > 0.0005;
      if (f.front > bestF) { bestF = f.front; best = f.k; }
    });

    // la cara horizontal sale cuando el usuario se queda en ella (estadía, sin arrastrar, tambor quieto)
    if (wide) {
      const ff = faces[mod(Math.round(st.rot), N)];
      const wf = isLand(ff.j) ? ff : null;
      if ((wf !== wide.f || (wf && wf.j !== wide.j)) && wide.e < 0.002) hangWide(wf);
      const WF = wide.f;
      const near = Math.abs(st.rot - Math.round(st.rot)) < 0.03;
      const settled = !!WF && WF.j === wide.j && isLand(WF.j) && mod(Math.round(st.rot), NV) === WF.j && near && !S.fbf.drag && WF.pw > 0.99 && u > FBF_STAY[0] && u < FBF_STAY[1] + 0.05;
      wide.e = rm ? (settled ? 1 : 0) : damp(wide.e, settled ? 1 : 0, settled ? 2.6 : 8, dt);
      S.fbf.wide = wide.e;                            // VideosStage funde el título sólo con el 16:9 abierto
      const e = sm(clamp01(wide.e));
      const sw = lerp(W, wide.W2, e), sh = lerp(H, wide.H2, e);
      const vis = wide.e > 0.002 && !!WF;
      wide.scr.visible = vis; wide.bz.visible = vis; wide.refl.visible = vis;
      const y = lerp(0, (wide.H2 - H) / 2 + 0.1, e), z = 0.03 + e * 0.95;
      wide.scr.scale.set(sw, sh, 1); wide.scr.position.set(0, y, z);
      wide.bz.scale.set(sw + 0.04, sh + 0.04, 0.03); wide.bz.position.set(0, y, z - 0.02);
      wide.u.cropW.value = Math.min(1, (sw / sh) / wide.asp);
      wide.u.dim.value = fadeK;
      wide.refl.scale.set(sw, sh, 1); wide.refl.position.set(0, -2 * (Y0 + H / 2) - y, z);
      wide.u.refl.value = 0.03 * e;
      if (WF) { WF.u.dim.value *= lerp(1, 0.06, e); WF.u.refl.value *= 1 - e; WF.u.halo.value *= 1 - e; }
    }

    // haz tenue desde arriba (Juan: «(a) Tenue»)
    beamI.value = smooth(FBF_BEAM[0], FBF_BEAM[1] + 0.2, u) * (1 - off);
    beamMesh.visible = beamI.value > 1e-4;
    faces.forEach((f) => { f.halo.visible = f.u.halo.value > 1e-6; f.ringM.visible = f.ring.inten.value > 1e-6; });

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
    hallDust.visible = beamI.value > 1e-4 || scrI.value > 1e-4;

    // videos: src cuando su cara puede llegar al frente (la de frente y sus dos vecinas); el que se aleja lo suelta;
    // corre el de frente (y el que llega, en un giro)
    const srcWin = ready && u > GAL_END - 0.4 && u < FBF_END + 0.3;
    vids.forEach((r, j) => {
      if (!r) return;
      const f = faces.find((x) => x.j === j);
      if (!f || Math.abs(relOf(f.k, st.rot)) > SRC_OUT) release(j);
    });
    faces.forEach((f) => {
      // preload: la cara de frente (o la que empieza a llegar en un giro: |rel| < 1) baja entera; las vecinas, sólo
      // metadatos y su primer cuadro (antes, las tres con 'auto': hasta 36,8 MB por recorrido sin tocar nada). Al
      // empezar el giro, la que llega pasa a 'auto'; el póster y su primer cuadro cubren la espera.
      const rel = Math.abs(relOf(f.k, st.rot));
      if (srcWin && rel < (Q().frontOnly ? 0.999 : SRC_IN)) {
        const full = rel < 0.999;
        const rr = ensureVideo(f.j, full ? 'auto' : 'metadata');
        if (full && rr.v.preload !== 'auto') rr.v.preload = 'auto';
      }
      const r = vids[f.j];
      if (!r) return;
      const play = ready && inView && !document.hidden && !S.fbf.paused && f.pw > 0.3 && f.front > 0.45 && u < FBF_OFF + 0.2;
      // si el usuario llegó sin pausa y el primer cuadro todavía no se subió en idle, al reproducir se muestra igual
      // (nunca un póster quieto con el video corriendo)
      if (play && r.tex && !r.ready) { r.ready = true; showVid(f.j); }
      if (play && r.v.paused) r.v.play().catch(() => {});
      else if (!play && !r.v.paused) r.v.pause();
      r.v.muted = !(S.fbf.sound && f.k === active);
      // sube un cuadro sólo cuando el video presenta uno nuevo: con rVFC, una vez por cuadro del video (antes, con
      // currentTime, que avanza en cada rAF, se subía el mismo cuadro 2-3 veces, cada una con sus mipmaps)
      if (r.tex && r.v.readyState >= 2) {
        if (r.vfc) { if (r.fresh) { r.fresh = false; r.tex.needsUpdate = true; } }
        else if (r.v.currentTime !== r.last) { r.last = r.v.currentTime; r.tex.needsUpdate = true; }
      }
    });

    // foco: viajando, la señal; frente al tambor, el post sin DOF (rango enorme); al final, los puntos
    fwd.copy(L).sub(P).normalize();
    let mode, fT, rT;
    if (u < FBF_RUN[1]) { mode = 'fbf-run'; fT = q.copy(st.head).sub(P).dot(fwd); rT = 9; }
    else if (u > FBF_OFF + 0.1) { mode = 'fbf-end'; fT = q.copy(LAMP).lerp(V(0, FY, FZ), 0.6).sub(P).dot(fwd); rT = 7; }
    else { mode = 'fbf-drum'; fT = q.set(0, FY, FZ).sub(P).dot(fwd); rT = 400; }
    st.mode = mode;
    projectMask();
    // R56-05: frente al tambor el piso de puntos sólo se ve en el charco del video (y el rojo del anillo): el ambiente
    // del pasillo baja a 15 % después de la costura (u > 10,75) y vuelve en el apagado, camino a Stack
    const ambK = 1 - 0.85 * smooth(FBF_RUN[1] - 0.2, FBF_STAY[0], u) * (1 - smooth(FBF_OFF, FBF_END, u));
    return { mode, fT, rT, ambK };
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
    if (wide && wide.scr.visible && wide.f === faces[st.active]) targets.push(wide.scr);
    return ray.intersectObjects(targets, false).length ? st.active : -1;
  }

  /** precalentado (corridor.warm): todo visible para que compileAsync lo incluya */
  let saved = null;
  function warm(v) {
    const objs = [hall, line.mesh, beamMesh, hallDust, ...faces.flatMap((f) => [f.scr, f.halo, f.ringM]), ...(wide ? [wide.scr, wide.bz, wide.refl] : [])];
    if (v) { saved = objs.map((o) => o.visible); objs.forEach((o) => { o.visible = true; }); }
    else if (saved) { objs.forEach((o, i) => { o.visible = saved[i]; }); saved = null; }
  }
  VIDEOS.forEach((_, j) => loadPoster(j));         // pósters entrantes, en segundo plano
  void housingMat; void metalMat; void prep; void focusU; void rangeU; void cameraPosition;

  return {
    pose, calm, update, placeTags, pick, pauseAll, warm, maskNode, lookW, texs, idle: dropPreheat,
    lampK: () => st.lampK,
    info: () => ({
      fbf: st.mode, rot: +st.rot.toFixed(2), active: st.active, vid: st.active < 0 ? -1 : mod(Math.round(st.rot), NV), spin: +st.spin.toFixed(2),
      faceVid: faces.map((f) => f.j),
      faceTex: faces.map((f) => (vids[f.j] && f.nodes[0].value === vids[f.j].tex ? 'video' : f.nodes[0].value === posterTex[f.j] ? 'poster' : 'other')),
      pw: faces.map((f) => +f.pw.toFixed(2)), wide: wide ? +wide.e.toFixed(2) : 0,
      vids: vids.map((r) => (r ? (r.tex ? (r.v.paused ? 'paused' : 'playing') : 'loading') : '-')),
      vidSrc: vids.filter(Boolean).length,
    }),
  };
}
