/* Projects «Negatoscopio» dentro de la escena persistente «Señal» (port de la maqueta A, 2026-10-10).
   La recta roja que deja el About gira 90° y se vuelve el riel de un pasillo de radiología a oscuras. Cada proyecto es
   una placa en un negatoscopio de pared, en paredes alternadas y a distinta profundidad. La señal sube por un ramal y
   lo enciende (parpadeo de tubo). La cámara hace dolly, encara cada placa en oblicuo y hace rack focus desde las
   películas colgadas en primer plano. Al final los negatoscopios se apagan y la cámara sigue al cabezal hasta el
   final del riel: la única luz que queda, para Frame by Frame.

   Coordenadas: todo se arma en las del pasillo de la maqueta (x a lo ancho, y arriba, −z hacia el fondo) dentro de un
   grupo girado 90° (`group`) cuyo origen cae sobre la recta del About (z −33,5, a la altura del riel). Así el riel de
   la maqueta ES la cinta de la señal y nada se duplica. Los shaders pasan positionWorld a coordenadas del pasillo con
   `toL` (offset uniforme: cambia con el tamaño de la ventana).

   Correcciones respecto de la maqueta (su autocrítica):
   (a) cruces oscuros/barrosos: el lavado rojo general se redujo a un resto junto al riel; cada negatoscopio encendido
       tiene, además de su luz cercana, un relleno neutro de largo alcance (1/(1+kd²)); el próximo se enciende a mitad
       del cruce (antes: al llegar), así el pasillo siempre tiene un destino iluminado; la niebla ya no tira a rojo;
       las películas sin placa detrás caen a negro (no a cartón gris).
   (b) placas de canto en el plano final: el plano final ya no es la grúa que mira hacia atrás; la cámara sigue al
       cabezal por el pasillo hasta el final del riel y las placas quedan detrás de cámara, apagándose.
   (c) borde de acrílico leído como marco: sin franja de luz alrededor de la placa; el panel cae suave hacia los
       bordes (tubos y difusor), la carcasa es un aparato (filo fino arriba y a los lados, zócalo de comando abajo con
       el LED rojo donde termina el ramal) y la luz se derrama en los azulejos. */
import * as THREE from 'three/webgpu';
import {
  uniform, texture, uv, vec2, vec3, vec4, float, smoothstep, exp, abs, fract, mix, max, screenUV,
  length, time, sin, cos, positionWorld, distance, luminance, cameraPosition, step, dot, instancedBufferAttribute,
  normalWorld, select, min, clamp
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { GAL_PROJECTS, GAL_DWELLS, GAL_END, GAL_ABOUT_OUT } from './gallery';
import { FBF_BEAM, FBF_INTRO, FBF_OFF } from './frames';
import { playSound } from '../../../lib/sound';
import { buildProjector } from './projector';
import { createPlateVideos } from './plate-video';

export const WALL = 3.2, CEIL = 3.4, Z_IN = 2, Z_END = -62;
const BOX_W = 2.6, BOX_H = BOX_W * 756 / 1600, BOX_Y = 1.75;
const RAIL_STOP = Z_END + 0.7;
const STANDBY = 0.07;                           // negatoscopio en espera: un resto de luz antes de que llegue la señal                  // el riel termina en el umbral del último vano
const ST = GAL_PROJECTS.map((p, k) => ({ ...p, dwell: GAL_DWELLS[k] }));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const easeIO = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
const LAST_OUT = GAL_DWELLS[GAL_DWELLS.length - 1][1];

function dwellPose(st, end) {
  const s = st.side, z = st.z;
  if (st.far) return end
    ? { p: V(-s * 1.25, 1.55, z + 3.0), l: V(s * 2.4, 1.24, z - 0.9) }
    : { p: V(-s * 1.6, 1.62, z + 3.7), l: V(s * 2.4, 1.22, z - 0.6) };
  return end
    ? { p: V(-s * 1.15, 1.52, z + 2.45), l: V(s * 2.6, 1.22, z - 0.05) }
    : { p: V(-s * 1.5, 1.58, z + 3.1), l: V(s * 2.6, 1.2, z + 0.1) };
}

/** Arma el pasillo (async, con pausas al hilo principal). Devuelve el controlador o null si se desmontó a mitad. */
export async function buildCorridor({ renderer, scene, camera, scenePass, S, ctl, RED, OFF, galW, assetBase = '/projects/', yieldToMain }) {
  const alive = () => !ctl.disposed && !S.dead;
  const group = new THREE.Group();
  group.name = 'corridor';
  const offU = uniform(new THREE.Vector3());
  // positionWorld → coordenadas del pasillo (grupo girado +90° en y: x_w = z_l + ox, z_w = −x_l + oz)
  const toL = (p) => { const q = p.sub(offU); return vec3(q.z.negate(), q.y, q.x); };

  ctl.corrStage = 'images';
  const maxAniso = Math.min(8, renderer.getMaxAnisotropy ? renderer.getMaxAnisotropy() : 8);

  /* ---------- texturas: capturas reales del repo (public/projects/<proyecto>/, Track C) ---------- */
  const loadImg = (f) => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = assetBase + f; });
  const names = [...new Set(ST.flatMap((s) => [s.main, s.sec, ...s.films.map((f) => f[0])]))];
  const imgs = Object.fromEntries(await Promise.all(names.map(async (n) => {
    // sin im.decode(): con la pestaña en segundo plano Chrome lo retiene y el armado quedaba colgado
    const im = await loadImg(n);
    return [n, im];
  })));
  if (!alive()) return null;
  const display = (() => {   // Bebas Neue de next/font (el índice «01» de la película)
    const el = document.querySelector('.font-display');
    return el ? getComputedStyle(el).fontFamily : '"Bebas Neue", sans-serif';
  })();
  ctl.corrStage = 'font';
  try { await document.fonts.load(`400 250px ${display}`); } catch (e) { /* sin la fuente: cae a la de respaldo */ }
  const texs = [];
  const prep = (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; t.needsUpdate = true; texs.push(t); ctl.texs.push(t); return t; };
  const texOf = (n, blurPx) => {
    if (!blurPx) return prep(new THREE.Texture(imgs[n]));
    const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * 756 / 1600);
    const x = c.getContext('2d'); x.filter = `blur(${blurPx}px)`; x.drawImage(imgs[n], -20, -20, c.width + 40, c.height + 40);
    return prep(new THREE.CanvasTexture(c));
  };
  // película colgada: negativo de una captura real, recortada en vertical, con el índice del proyecto
  const filmTex = (n, cx, idx, blurPx) => {
    const c = document.createElement('canvas'); c.width = 640; c.height = 800;
    const x = c.getContext('2d');
    x.fillStyle = '#0d0d0d'; x.fillRect(0, 0, c.width, c.height);
    const im = imgs[n], sh = im.height, sw = sh * c.width / c.height, sx = Math.max(0, Math.min(im.width - sw, cx * im.width - sw / 2));
    // una película es fondo oscuro con trazo claro: las capturas de interfaz clara se invierten (negativo real)
    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    probe.canvas.width = probe.canvas.height = 16; probe.drawImage(im, sx, 0, sw, sh, 0, 0, 16, 16);
    const px = probe.getImageData(0, 0, 16, 16).data; let lum = 0;
    for (let i = 0; i < px.length; i += 4) lum += (px[i] * 0.2126 + px[i + 1] * 0.7152 + px[i + 2] * 0.0722) / 255;
    const light = lum / 256 > 0.45;
    x.filter = `grayscale(1)${light ? ' invert(1)' : ''} contrast(1.7) brightness(.85)${blurPx ? ` blur(${blurPx}px)` : ''}`;
    x.drawImage(im, sx, 0, sw, sh, 18, 18, c.width - 36, c.height - 36);
    x.filter = 'none';
    if (idx) {
      x.fillStyle = 'rgba(232,228,222,.92)'; x.font = `400 250px ${display}`; x.textBaseline = 'alphabetic';
      x.fillText(idx, 34, c.height - 40);
    }
    return prep(new THREE.CanvasTexture(c));
  };
  await yieldToMain();
  if (!alive()) return null;

  ctl.corrStage = 'materials';
  /* ---------- luz y materiales (coordenadas del pasillo) ---------- */
  const FOG = vec3(0.0030, 0.0028, 0.0028);
  const boxU = ST.map(() => ({ pos: uniform(new THREE.Vector3()), ig: uniform(0) }));
  const headPos = uniform(new THREE.Vector3(0, 0.03, 7)), headI = uniform(1), railI = uniform(1);
  // Frame by Frame (projector.js): la pantalla encendida alumbra el piso, los cables y el polvo cercano
  const scrPos = uniform(new THREE.Vector3(0, -50, 0)), scrI = uniform(0);
  // caso abierto (0..1, con el damp de la cámara): el barrido de TraumaVision se apaga detrás del panel (D-09)
  const caseU = uniform(0);
  /* Umbrales (U-motion-1, D-01/D-02). En el giro de entrada y en el plano final el cuadro no puede quedar en negro
     con un punto: el pasillo se lee por luz neutra y por canto, y el rojo queda en el cabezal.
     - redFar / redNear: alcance largo y charco cercano del cabezal (teñían todo el cuadro de rojo en el plano final;
       ahí bajan: el rojo queda en el cabezal y su estela, no en el piso entero).
     - ambX: ambiente neutro que se suma al del riel; sostiene azulejos y vanos cuando el riel cae.
     - roomI: la sala de proyección, del otro lado del último vano, con las pantallas en espera: un derrame neutro
       que recorta el vano a contraluz y lame el final del pasillo.
     - entryI: el giro de entrada. Un relleno neutro bajo y largo desde adentro del pasillo (el primer negatoscopio en
       espera y los que siguen): paredes, piso y vano existen antes de que la señal encienda la primera placa. */
  const redFar = uniform(1), redNear = uniform(1), ambX = uniform(0), roomI = uniform(0), entryI = uniform(0), dotK = uniform(0);
  // post (más abajo); acá porque el polvo de la sala (projector.js) también los lee
  const focusU = uniform(7), rangeU = uniform(1.6), bokehU = uniform(12.0), voidK = uniform(0), grainK = uniform(0), farK = uniform(50);
  const ROOM_POS = new THREE.Vector3(0, 2.1, Z_END - 4.5);
  const roomPos = vec3(ROOM_POS.x, ROOM_POS.y, ROOM_POS.z);
  const appear = galW;                           // el pasillo existe sólo con la galería abierta (0 en el About)
  const lightAt = (p) => {
    let l = vec3(0.0);
    boxU.forEach((b) => {
      const d = distance(p, b.pos);
      // luz cercana (el derrame en los azulejos) + relleno neutro de largo alcance (los cruces se leen, sin barro)
      l = l.add(OFF.mul(b.ig.mul(exp(d.mul(-0.8)).mul(0.55).add(float(0.2).div(d.mul(d).mul(0.06).add(1))))));
    });
    const dh = distance(p, headPos);
    l = l.add(RED.mul(headI.mul(exp(dh.mul(-1.15)).mul(1.2).mul(redNear).add(exp(dh.mul(-0.32)).mul(0.45).mul(redFar)))));
    l = l.add(OFF.mul(scrI.mul(exp(distance(p, scrPos).mul(-0.55)))));
    l = l.add(RED.mul(exp(abs(p.x).mul(-7.0)).mul(exp(p.y.mul(-4.5))).mul(0.3).mul(railI)));    // el riel ilumina su franja de piso (angosta: de cerca no es una banda)
    l = l.add(RED.mul(exp(p.y.mul(-0.6)).mul(0.03).mul(railI))).add(OFF.mul(railI.mul(0.03).add(ambX)));   // ambiente neutro: se leen azulejos y vanos
    // sala de proyección: derrame neutro por el último vano (sólo hacia este lado del vano y adentro de la sala)
    const dr = distance(p, roomPos);
    l = l.add(OFF.mul(roomI.mul(float(1).div(dr.mul(dr).mul(0.045).add(1)))));
    // giro de entrada: relleno neutro desde el fondo del primer tramo (TraumaVision en espera), cae hacia la entrada
    l = l.add(OFF.mul(entryI.mul(smoothstep(Z_IN + 4, Z_IN - 6, p.z)).mul(exp(abs(p.z.sub(-9)).mul(-0.07)))));
    return l.mul(appear);
  };
  const fogF = (k = 1) => float(1).sub(exp(distance(positionWorld, cameraPosition).mul(-0.05 * k)));
  const withFog = (c, k = 1) => mix(c, FOG, fogF(k));

  const wallMat = new THREE.MeshBasicNodeMaterial();
  {
    const p = toL(positionWorld);
    const g1 = abs(fract(vec2(p.z, p.y).div(vec2(0.3, 0.3))).sub(0.5)).mul(2);       // azulejo
    const g2 = abs(fract(vec2(p.z, p.y).div(vec2(2.4, 1.2))).sub(0.5)).mul(2);       // juntas de panel
    const tile = smoothstep(0.93, 0.985, max(g1.x, g1.y)).mul(0.35).add(smoothstep(0.975, 0.995, max(g2.x, g2.y)).mul(0.9));
    const dado = smoothstep(0.995, 1.0, fract(p.y.div(1.05))).mul(step(p.y, 1.1)).mul(0.6);  // guardasilla
    const alb = float(0.12).add(tile.mul(0.3)).add(dado.mul(0.35));
    wallMat.colorNode = withFog(lightAt(p).mul(alb).add(float(0.0022).mul(appear)));
  }
  const FLOOR_NEAR = Z_IN + 4, FLOOR_FAR = Z_END - 120;   // sigue bajo la sala de proyección (projector.js)
  const floorMat = new THREE.MeshBasicNodeMaterial();
  {
    const p = toL(positionWorld);
    const d = length(fract(p.xz.div(0.6)).sub(0.5));
    // plano final: los puntos cercanos a cámara se apagan (fuera de foco eran discos de bokeh en el tercio inferior);
    // la retícula se lee lejos, donde la lame el cabezal (D-01)
    const dots = float(1).sub(smoothstep(0.02, 0.06, d))
      .mul(float(1).sub(dotK.mul(float(1).sub(smoothstep(2.2, 7.5, distance(positionWorld, cameraPosition))))));
    const seam = smoothstep(0.985, 1.0, abs(fract(p.z.div(1.2)).sub(0.5)).mul(2)).mul(0.5);
    const alb = float(0.07).add(dots.mul(0.6)).add(seam.mul(0.12));
    // el borde cercano del piso (hacia el About) se funde a negro: sin costura recta en el giro
    const edge = smoothstep(FLOOR_NEAR, FLOOR_NEAR - 5, p.z);
    floorMat.colorNode = withFog(lightAt(p).mul(alb).add(float(0.0018).mul(appear)).mul(edge));
  }
  const ceilMat = new THREE.MeshBasicNodeMaterial();
  {
    const p = toL(positionWorld);
    const fz = abs(fract(p.z.div(4.0)).sub(0.5)), fx = abs(p.x);
    const fixture = step(fz, 0.08).mul(step(fx, 0.55));                       // luminarias apagadas
    const alb = float(0.06).add(fixture.mul(0.3));
    ceilMat.colorNode = withFog(lightAt(p).mul(alb).add(float(0.0012).mul(appear)));
  }
  const metalMat = new THREE.MeshBasicNodeMaterial();
  metalMat.colorNode = withFog(lightAt(toL(positionWorld)).mul(0.2).add(float(0.004).mul(appear)));
  const housingMat = new THREE.MeshBasicNodeMaterial();                       // carcasa del negatoscopio: oscura, mate
  housingMat.colorNode = withFog(lightAt(toL(positionWorld)).mul(0.075).add(float(0.003).mul(appear)));

  const corridorLen = Z_IN - Z_END, zMid = (Z_IN + Z_END) / 2;
  const addPlane = (w, h, mat, pos, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.copy(pos); m.rotation.set(...rot); group.add(m); return m; };
  addPlane(corridorLen, CEIL, wallMat, V(-WALL, CEIL / 2, zMid), [0, Math.PI / 2, 0]);
  addPlane(corridorLen, CEIL, wallMat, V(WALL, CEIL / 2, zMid), [0, -Math.PI / 2, 0]);
  addPlane(2 * WALL, corridorLen, ceilMat, V(0, CEIL, zMid), [Math.PI / 2, 0, 0]);
  // piso: desde la entrada hacia el fondo y más allá del final (el riel termina en el umbral de la oscuridad).
  // No llega a la zona del About (z > Z_IN + 4): ahí sigue el piso de puntos del hero.
  addPlane(90, FLOOR_NEAR - FLOOR_FAR, floorMat, V(0, 0, (FLOOR_NEAR + FLOOR_FAR) / 2), [-Math.PI / 2, 0, 0]);
  const box = (w, h, d, mat, pos, parent = group) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.copy(pos); parent.add(m); return m; };
  // vanos cada 12 m (el primero es la entrada; el último, el final del pasillo, donde termina el riel)
  /* vanos de la entrada y del final: con canto (D-01/D-02). Antes eran un plano de color uniforme (una losa marrón);
     ahora cada cara toma la luz según hacia dónde mira: la que da al cabezal se enciende en rojo, la que da a la
     sala de proyección (o al fondo del pasillo, en el giro) toma el neutro a contraluz. El filo entre caras se lee. */
  const portalMat = new THREE.MeshBasicNodeMaterial();
  {
    const p = toL(positionWorld);
    const n = vec3(normalWorld.z.negate(), normalWorld.y, normalWorld.x);
    const toH = headPos.sub(p), dh = length(toH);
    const lamH = max(dot(n, toH.div(dh)), 0);
    const toR = roomPos.sub(p), dr = length(toR);
    const lamR = max(dot(n, toR.div(dr)), 0);
    const lamE = max(n.z.negate(), 0);                                    // la cara que mira al fondo del pasillo
    const keyH = RED.mul(headI.mul(lamH).mul(exp(dh.mul(-0.3))).mul(0.08));
    const rimR = OFF.mul(roomI.mul(lamR).mul(float(1).div(dr.mul(dr).mul(0.03).add(1))).mul(0.2));
    const fillE = OFF.mul(entryI.mul(lamE).mul(0.6).add(entryI.mul(0.08)));
    portalMat.colorNode = withFog(lightAt(p).mul(0.05).add(keyH.add(rimR).add(fillE).mul(appear)).add(float(0.004).mul(appear)));
  }
  [Z_IN, -14, -26, -38, -50, Z_END].forEach((z) => {
    const m = z === Z_IN || z === Z_END ? portalMat : metalMat;
    box(0.34, CEIL, 0.42, m, V(-WALL + 0.17, CEIL / 2, z));
    box(0.34, CEIL, 0.42, m, V(WALL - 0.17, CEIL / 2, z));
    box(2 * WALL, 0.46, 0.42, m, V(0, CEIL - 0.23, z));
  });
  await yieldToMain();
  if (!alive()) return null;

  /* ---------- estaciones: negatoscopio + placa, secundario en brazo, ramal, películas colgadas ---------- */
  const headMatLocal = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  {
    const r = length(uv().sub(0.5));
    headMatLocal.colorNode = RED.mul(6.0).mul(float(1).sub(smoothstep(0.0, 0.5, r)).pow(3));
    headMatLocal.opacityNode = float(1).sub(smoothstep(0.0, 0.5, r));
  }
  const BZ = 0.024, BOT = 0.12, DEPTH = 0.12;
  // video demo de cada placa (plate-video.js): se funde sobre la captura principal cuando la placa está en foco
  const pv = createPlateVideos({ ST, S, ctl, alive });
  const stations = ST.map((st, k) => {
    const g = new THREE.Group();
    const s = st.side;
    g.position.set(s * WALL, 0, st.z);
    g.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2;      // el frente (+z local) mira al pasillo
    group.add(g);
    const deeper = s < 0 ? 1 : -1;
    const ig = boxU[k].ig;
    const scanU = uniform(st.scan ? 0 : 1), hoverU = uniform(0);

    const makeViewer = (tex, w, h, isMain) => {
      const v = new THREE.Group();
      // carcasa: filo fino arriba y a los lados, zócalo de comando abajo (un aparato, no un marco parejo)
      const body = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * BZ, h + BZ + BOT, DEPTH), housingMat);
      body.position.y = -(BOT - BZ) / 2;
      v.add(body);
      // LED de encendido en el zócalo: ahí termina el ramal de la señal (rojo, entra al bloom)
      const ledMat = new THREE.MeshBasicNodeMaterial();
      ledMat.colorNode = RED.mul(ig.mul(3.2).add(0.05)).mul(appear);
      const led = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.012), ledMat);
      led.position.set(-deeper * (w / 2 - 0.08), -h / 2 - BOT / 2, DEPTH / 2 + 0.002);
      v.add(led);
      const film = new THREE.MeshBasicNodeMaterial();
      {
        const u = uv();
        const c = isMain ? pv.over(k, u, texture(tex, u), tex) : texture(tex, u);
        const L = luminance(c.rgb);
        // difusor: tubos verticales y caída suave hacia los bordes del panel (sin franja de luz: no se lee marco)
        const tubes = sin(u.x.mul(Math.PI * 4)).abs().mul(0.07).add(0.93);
        const ex = smoothstep(0.0, 0.07, u.x).mul(smoothstep(0.0, 0.07, float(1).sub(u.x)));
        const ey = smoothstep(0.0, 0.1, u.y).mul(smoothstep(0.0, 0.1, float(1).sub(u.y)));
        const panel = mix(float(0.5), float(1), ex.mul(ey)).mul(tubes);
        const back = ig.mul(hoverU.mul(0.1).add(0.88)).mul(panel).add(0.006);
        let col = mix(vec3(L), c.rgb, 0.82).mul(back);
        if (st.scan && isMain) {
          // antes del barrido: una radiografía (sólo la muñeca, hueso blanco; la interfaz apenas velada)
          const [x0, x1, y0, y1] = st.xray;       // la radiografía dentro de la captura (gallery.ts)
          const inX = smoothstep(x0 - 0.004, x0 + 0.004, u.x).mul(float(1).sub(smoothstep(x1 - 0.004, x1 + 0.004, u.x)));
          const inY = smoothstep(y0 - 0.004, y0 + 0.004, u.y).mul(float(1).sub(smoothstep(y1 - 0.004, y1 + 0.004, u.y)));
          const xr = inX.mul(inY);
          const bone = L.pow(1.25).mul(1.25);
          const neg = OFF.mul(mix(L.mul(0.07), bone, xr)).mul(back);
          const edge = scanU.mul(1.04).sub(0.02);
          const revealed = float(1).sub(smoothstep(edge.sub(0.004), edge, u.x));
          col = mix(neg, col, revealed);
          const band = exp(abs(u.x.sub(edge)).mul(-260)).mul(step(scanU, 0.999)).mul(step(0.001, scanU));
          const trail = exp(edge.sub(u.x).mul(-18)).mul(revealed).mul(step(scanU, 0.999)).mul(0.25);
          col = col.add(RED.mul(band.mul(4.5).add(trail)).mul(ig.add(0.3)).mul(float(1).sub(caseU)));
        }
        film.colorNode = col.mul(appear);
      }
      const filmM = new THREE.Mesh(new THREE.PlaneGeometry(w, h), film);
      filmM.position.z = DEPTH / 2 + 0.003; v.add(filmM);
      [-0.3, 0.3].forEach((fx) => { const c = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), metalMat); c.position.set(fx * w, h / 2 + BZ + 0.004, DEPTH / 2 + 0.012); v.add(c); });
      return { v, filmM };
    };

    const main = makeViewer(texOf(st.main, st.blur ? 9 : 0), BOX_W, BOX_H, true);
    main.v.position.set(0, BOX_Y, 0.12);
    g.add(main.v);
    const sw = 1.3, sh = sw * 756 / 1600;
    const sec = makeViewer(texOf(st.sec, st.blur ? 6 : 0), sw, sh, false);
    sec.v.position.set(deeper * (BOX_W / 2 + 1.05), 2.12, 0.62);
    sec.v.rotation.y = -deeper * 0.42;
    g.add(sec.v);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.6), metalMat);
    arm.position.set(deeper * (BOX_W / 2 + 1.05), 2.12, 0.3); g.add(arm);

    // luz del negatoscopio (un poco delante del acrílico), en coordenadas del pasillo
    const lp = V(s * (WALL - 0.12) - s * 0.35, BOX_Y, st.z);
    boxU[k].pos.value.copy(lp);

    // ramal: del riel al zócalo, sube por la pared y llega bajo el borde cercano del negatoscopio
    const zb = st.z + (BOX_W / 2 + 0.25);
    const wx = s * (WALL - 0.012);
    const yb = BOX_Y - BOX_H / 2 - BOT - 0.06;
    const path = new THREE.CurvePath();
    const pts = [V(0, 0.004, zb), V(wx, 0.004, zb), V(wx, 0.62, zb), V(wx, 0.62, zb - 0.32), V(wx, yb, zb - 0.32), V(wx, yb, st.z + BOX_W / 2 - 0.1)];
    for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    const progU = uniform(0);
    const brMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    brMat.colorNode = RED.mul(2.2).mul(float(1).add(exp(abs(uv().x.sub(progU)).mul(-40)).mul(3))).mul(railI.mul(0.6).add(0.4));
    brMat.opacityNode = float(1).sub(step(progU, uv().x)).mul(appear);
    const branch = new THREE.Mesh(new THREE.TubeGeometry(path, 220, 0.006, 5, false), brMat);
    branch.frustumCulled = false; group.add(branch);
    const spark = new THREE.Sprite(headMatLocal); spark.scale.setScalar(0.14); spark.visible = false; group.add(spark);

    // películas colgadas de un alambre: primer plano entre la cámara y la placa (negativos reales del proyecto)
    const pose = dwellPose(st, false);
    const d = pose.l.clone().sub(pose.p).setY(0).normalize();
    const r = new THREE.Vector3().crossVectors(d, V(0, 1, 0)).normalize();
    const filmsG = [];
    const fdef = [[1.55, 0.86, 0.06], [2.55, 1.12, 0.2]];
    st.films.forEach(([n, cx], i) => {
      const [D, R, U] = fdef[i];
      const c = pose.p.clone().addScaledVector(d, D).addScaledVector(r, R); c.y = pose.p.y + U + 0.39;
      const fw = 0.56, fh = 0.7;
      const fg = new THREE.Group(); fg.position.copy(c);
      group.add(fg);
      fg.lookAt(c.clone().sub(d.clone().multiplyScalar(1)).add(r.clone().multiplyScalar(0.25 * (i ? -1 : 1))));
      const fm = new THREE.MeshBasicNodeMaterial();
      const ft = filmTex(n, cx, i === 0 ? String(k + 1).padStart(2, '0') : '', st.blur ? 5 : 0);
      {
        // a contraluz: la placa encendida detrás la atraviesa; sin ella, cae a negro (no a cartón gris)
        const ftc = texture(ft, uv()).rgb;
        fm.colorNode = withFog(ftc.mul(ig.mul(0.34).add(0.004)).add(ftc.mul(lightAt(toL(positionWorld))).mul(0.06)), 0.5);
      }
      const fmesh = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh).translate(0, -fh / 2, 0), fm);
      fg.add(fmesh);
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), metalMat); clip.position.set(0, 0.0, 0.01); fg.add(clip);
      filmsG.push({ fg, fmesh, ph: k * 1.7 + i * 2.3 });
    });
    {
      const a = filmsG[0].fg.position, b = filmsG[1].fg.position;
      const dir = b.clone().sub(a).setY(0).normalize();
      const tA = (Math.sign(dir.x) * -WALL - a.x) / dir.x, tB = (Math.sign(dir.x) * WALL - a.x) / dir.x;
      const p0 = a.clone().addScaledVector(dir, tA), p1 = a.clone().addScaledVector(dir, tB);
      p0.y = a.y; p1.y = b.y;
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, p0.distanceTo(p1)), metalMat);
      w.position.copy(p0.clone().add(p1).multiplyScalar(0.5)); group.add(w); w.lookAt(p1);
    }
    return { st, g, main, sec, ig, scanU, hoverU, progU, path, spark, filmsG, igT0: -1, igOn: false, lightPos: lp };
  });
  await yieldToMain();
  if (!alive()) return null;

  ctl.corrStage = 'dust';
  /* ---------- polvo en el aire (con las luces cerca, se tiñe) ---------- */
  const DUST = 2200;
  const dPos = new Float32Array(DUST * 3), dSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dPos[i * 3] = (Math.random() - 0.5) * 2 * (WALL - 0.1); dPos[i * 3 + 1] = Math.random() * CEIL; dPos[i * 3 + 2] = Z_IN + 2 - Math.random() * (Z_IN + 2 - Z_END + 4);
    dSeed[i] = Math.random();
  }
  const dustMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  {
    const base = instancedBufferAttribute(new THREE.InstancedBufferAttribute(dPos, 3));
    const seed = instancedBufferAttribute(new THREE.InstancedBufferAttribute(dSeed, 1));
    const t = time.mul(0.16).add(seed.mul(40));
    dustMat.positionNode = base.add(vec3(sin(t).mul(0.14), cos(t.mul(0.7)).mul(0.09), sin(t.mul(0.5)).mul(0.12)));
    const near = distance(positionWorld, cameraPosition);
    dustMat.scaleNode = seed.mul(0.016).add(0.006).mul(smoothstep(0.2, 2.2, near).mul(-0.6).add(1.6));   // cerca: disco de bokeh
    const soft = float(1).sub(smoothstep(0.0, 0.5, length(uv().sub(0.5))));
    dustMat.colorNode = lightAt(toL(positionWorld)).mul(2.2).add(OFF.mul(0.01).mul(appear));
    // una mota pegada a la lente taparía el cuadro entero (disco de bokeh gigante): debajo de ~0,6 m se apaga
    // plano final (dotK): la mota lejos del plano de foco se apaga en lugar de abrirse en un disco
    const oof = smoothstep(rangeU.mul(0.35), rangeU, near.sub(focusU).abs()).mul(0.8).mul(dotK);
    dustMat.opacityNode = soft.mul(seed.mul(0.6).add(0.4)).mul(float(1).sub(fogF())).mul(smoothstep(0.3, 0.9, near)).mul(float(1).sub(oof)).mul(appear);
  }
  const dust = new THREE.Sprite(dustMat); dust.count = DUST; dust.frustumCulled = false; group.add(dust);

  /* ---------- Frame by Frame: la sala de proyección, del otro lado del último vano ---------- */
  ctl.corrStage = 'projector';
  const END_P = V(0.78, 0.86, -54.8), END_L = V(-0.12, 0.12, -61.8);   // última llave del pasillo (= primera de la sala)
  const proj = await buildProjector({
    group, toL, RED, OFF, appear, S, ctl, prep, yieldToMain, withFog, lightAt, metalMat, housingMat,
    headPos, headI, scrPos, scrI, endP: END_P, endL: END_L, railHeadZ: RAIL_STOP + 0.15, focusU, rangeU,
  });
  if (!proj || !alive()) return null;

  group.visible = false;
  scene.add(group);

  /* ---------- post del pasillo: DOF real + bloom sólo del rojo + viñeta + grano ----------
     Segundo RenderPipeline sobre el MISMO pass de escena (un solo render de la escena por frame, un solo contexto).
     Con galW → 0 empata con el post del hero (mismo bloom, misma viñeta, sin grano, DOF con rango enorme): el relevo
     entre los dos pipelines no se nota. Se usa sólo con la galería abierta; el hero no paga el DOF. */
  const pipeline = new THREE.RenderPipeline(renderer);
  const col = scenePass.getTextureNode('output');
  /* El DOF lee la profundidad de lo opaco: el polvo y el haz (aditivos, sin depthWrite) toman la de lo que tienen
     detrás. Donde detrás no hay nada (el vacío más allá del último vano, la sala), esa profundidad es el plano lejano
     y todo lo que flota delante se desenfocaba al máximo en discos; sobre una pantalla, en cambio, quedaba nítido:
     un rectángulo de polvo nítido con borde recto dentro de un campo de discos (U4). Desde el plano final, el vacío
     pasa a la distancia de foco (voidK 0 → 1, continuo: arranca en foco + 3 rangos, que ya es desenfoque pleno). */
  const camFar = camera.far;
  const viewZ0 = scenePass.getViewZNode();
  // farK (en rangos): tope del desenfoque por profundidad, hacia adelante y hacia atrás del foco. Sólo en la salida en
  // puntos de Frame by Frame (0,35 ≈ 28 % del bokeh): las motas que flotan delante del piso tomaban su desenfoque y
  // quedaban como discos alrededor de la pantalla apagada
  const viewZc = clamp(viewZ0.negate(), focusU.sub(rangeU.mul(farK)), focusU.add(rangeU.mul(farK))).negate();
  const viewZ = select(viewZ0.lessThan(-(camFar - 0.5)), focusU.add(min(rangeU, 40).mul(3).mul(float(1).sub(voidK))).negate(), viewZc);
  const dofN = dof(col, viewZ, focusU, rangeU, bokehU);
  const redOnly = (c) => { const r = max(c.r.sub(max(c.g, c.b).mul(1.15)), 0); return vec4(r, r.mul(0.04), r.mul(0.05), 1); };
  const bl = bloom(mix(dofN, redOnly(dofN), galW), 1.2, 0.6, 0.12);
  const vigHero = smoothstep(1.05, 0.25, length(screenUV.sub(0.5).mul(vec2(1.25, 1.0))).mul(1.35)).mul(0.85).add(0.15);
  const vigNeg = smoothstep(1.05, 0.2, length(screenUV.sub(0.5).mul(vec2(1.2, 1.0))).mul(1.3)).mul(0.82).add(0.18);
  const grainN = fract(sin(dot(screenUV.mul(vec2(1731.3, 977.1)).add(fract(time.mul(13.7)).mul(91.7)), vec2(12.9898, 78.233))).mul(43758.5453)).sub(0.5).mul(0.03);
  // en los umbrales (cuadros oscuros) el grano manda: ahí se atenúa donde no hay luz (grainK, D-01)
  const grainAmp = mix(float(1), smoothstep(0.0, 0.05, luminance(dofN.rgb)).mul(0.65).add(0.35), grainK);
  pipeline.outputNode = dofN.add(bl).mul(mix(vigHero, vigNeg, galW)).add(grainN.mul(galW).mul(grainAmp));
  ctl.nodes.push(dofN, bl);
  ctl.pipelines.push(pipeline);

  /* ---------- cámara: llaves en u (coordenadas del pasillo) ---------- */
  let KEYS = [], posCurve = null, lookCurve = null;
  function buildKeys(aP, aL) {
    const K = [];
    K.push([0.0, aP.clone(), aL.clone()]);
    K.push([0.4, aP.clone().add(V(0.2, -0.02, -0.3)), aL.clone().add(V(0, 0.01, -0.2)), true]);
    // giro: en u 0,95 la cámara ya mira adentro por el vano de entrada (antes miraba el borde derecho del vano y el
    // cuadro quedaba en negro con una losa hasta u 1,3; D-02). Misma posición: sólo el objetivo entra al pasillo.
    K.push([0.95, V(-3.4, 1.12, 8.3), V(0.6, 0.75, -2.5)]);
    K.push([1.5, V(0.45, 1.6, 6.0), V(-0.45, 1.3, -6.0)]);
    ST.forEach((st, i) => {
      const a = dwellPose(st, false), b = dwellPose(st, true);
      K.push([st.dwell[0], a.p, a.l, true]);
      K.push([st.dwell[1], b.p, b.l]);
      const nx = ST[i + 1];
      if (nx) K.push([(st.dwell[1] + nx.dwell[0]) / 2, V(nx.side * -0.15, 1.72, nx.z + 9.5), V(nx.side * 0.9, 1.45, nx.z - 3.5)]);
    });
    // final: dolly por el pasillo detrás del cabezal; baja hasta quedar cerca del riel, en oblicuo, mirando el fondo.
    // Las placas quedan detrás de cámara (se apagan); el cabezal en el umbral del último vano es la única luz.
    K.push([9.55, V(0.55, 1.3, -50.5), V(-0.25, 0.42, -61.5)]);
    K.push([GAL_END, END_P.clone(), END_L.clone()]);
    KEYS = K;
    posCurve = new THREE.CatmullRomCurve3(K.map((k) => k[1]), false, 'centripetal');
    lookCurve = new THREE.CatmullRomCurve3(K.map((k) => k[2]), false, 'centripetal');
  }
  function keyParam(u) {
    u = Math.min(GAL_END, Math.max(0, u));
    let i = 0;
    while (i < KEYS.length - 2 && u >= KEYS[i + 1][0]) i++;
    const a = KEYS[i][0], b = KEYS[i + 1][0];
    const l = Math.min(1, Math.max(0, (u - a) / (b - a)));
    return (i + (KEYS[i][3] ? l : easeIO(l))) / (KEYS.length - 1);
  }

  /* ---------- colocación en el mundo (depende del layout del hero: la recta del About) ----------
     aboutPos/aboutLook: la pose final del About (mundo). El origen del pasillo cae sobre la recta, 9 m detrás
     de la cámara del About en el sentido del riel: así la cámara del About queda en (−7, 1,28, 9) del pasillo. */
  const tagAnchors = ST.map((st) => {
    const s = st.side;
    return st.far
      ? V(s * (WALL - 0.04), BOX_Y - BOX_H / 2 + 0.22, st.z - BOX_W * 0.56)      // LEEX: al costado, en la profundidad
      : V(s * (WALL - 0.04), BOX_Y - BOX_H / 2 - BOT - 0.12, st.z + BOX_W * 0.42);
  });
  const tagRef = ST.map((st, k) => (tagAnchors[k].distanceTo(dwellPose(st, false).p) + tagAnchors[k].distanceTo(dwellPose(st, true).p)) / 2);
  const tagW = ST.map(() => V(0, 0, 0));
  let railY = 0;
  function place({ yT, railZ, aboutPos, aboutLook }) {
    railY = yT;
    const ox = aboutPos.x - 9, oy = yT - 0.03, oz = -railZ;
    group.position.set(ox, oy, oz);
    group.rotation.set(0, Math.PI / 2, 0);
    group.updateMatrixWorld(true);
    offU.value.set(ox, oy, oz);
    const aP = group.worldToLocal(aboutPos.clone()), aL = group.worldToLocal(aboutLook.clone());
    buildKeys(aP, aL);
    tagAnchors.forEach((a, k) => { tagW[k].copy(a); group.localToWorld(tagW[k]); });
  }
  /** x de mundo del final del riel (la cinta de la señal termina ahí) */
  const railEndX = () => group.position.x + RAIL_STOP;

  /* ---------- estado por frame ---------- */
  const st8 = { nearK: 1, focus: 7, range: 4, bokeh: 12, farK: 50, mode: '', open: -1, openA: 0, lastOpen: 0, headZ: 7, endK: 0, liveDone: false };
  const P = new THREE.Vector3(), L = new THREE.Vector3(), tmp = new THREE.Vector3(), q = new THREE.Vector3(), fwd = new THREE.Vector3();
  const flicker = (t) => {
    if (t < 0) return 0;
    if (t < 0.05) return 1; if (t < 0.13) return 0.08; if (t < 0.17) return 0.85; if (t < 0.33) return 0.12;
    if (t < 0.38) return 1; if (t < 0.45) return 0.35; return Math.min(1, 0.6 + (t - 0.45) * 1.6);
  };
  const heartbeat = (t) => { const ph = t % 2.4; return Math.exp(-((ph - 0.05) ** 2) / 0.0016) + 0.6 * Math.exp(-((ph - 0.27) ** 2) / 0.0022); };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  /* Tomas que siguen después de Frame by Frame (Stack, Experience), en el orden del recorrido. Las engancha scene.js con
     setExt() y quedan ordenadas por U0 (u desde el que manda cada una: número o función). Cada una recibe la pose de
     la anterior (P/L) y sigue desde ahí; foco, calma y rótulos: manda la última activa. */
  const exts = [];
  const u0Of = (x) => (typeof x.U0 === 'function' ? x.U0() : x.U0);
  const extAt = (u) => { let e = null; for (const x of exts) if (u > u0Of(x)) e = x; return e; };

  /** Pose de cámara del pasillo para u (escribe camera.position/rotación). w: peso de la mezcla con la del About. */
  function camPose(u, t, dt, mouse, outPos, outLook) {
    const k01 = keyParam(u);
    posCurve.getPoint(k01, P); lookCurve.getPoint(k01, L);
    if (u > GAL_END) proj.pose(u, camera, P, L);          // Frame by Frame: la sala sigue la misma toma
    for (const x of exts) if (u > u0Of(x)) x.pose(u, camera, P, L);   // Stack, Experience: siguen desde la pose anterior
    // caso abierto: la cámara empuja hacia la placa (oblicua, nunca de frente) y la deja del lado opuesto al texto
    st8.openA = damp(st8.openA, S.neg.open >= 0 ? 1 : 0, 3.2, dt);
    if (S.neg.open >= 0) st8.lastOpen = S.neg.open;
    caseU.value = st8.openA;
    if (st8.openA > 0.001) {
      const so = stations[st8.lastOpen];
      const c = so.lightPos.clone(); c.x = so.st.side * (WALL - 0.12);
      const toCam = P.clone().sub(c).setY(0).normalize();
      const pOpen = c.clone().addScaledVector(toCam, 3.25); pOpen.y = 1.6;
      const right = new THREE.Vector3().crossVectors(c.clone().sub(pOpen).normalize(), V(0, 1, 0)).normalize();
      const lOpen = c.clone().addScaledVector(right, 0.95 * -so.st.side);
      P.lerp(pOpen, st8.openA); L.lerp(lOpen, st8.openA);
    }
    // cámara siempre viva: deriva lenta (dolly / orbit corto); al final, más calma (el cabezal manda)
    const xa = extAt(u);
    const calm = xa ? xa.calm(u) : u > GAL_END ? proj.calm(u) : 1 - 0.55 * smooth(LAST_OUT, GAL_END, u);
    P.x += Math.sin(t * 0.23) * 0.17 * calm; P.y += Math.sin(t * 0.31 + 1) * 0.04 * calm; P.z += Math.cos(t * 0.19) * 0.2 * calm;
    L.x += Math.sin(t * 0.17 + 2) * 0.1 * calm; L.y += Math.sin(t * 0.27) * 0.035 * calm;
    outPos.copy(P); group.localToWorld(outPos);
    outLook.copy(L); group.localToWorld(outLook);
  }

  /** Estado del pasillo para u: placas, cabezal, foco, rótulos, hover. Devuelve nada; escribe uniforms. */
  function update(u, t, dt, gw) {
    // señal: el cabezal va adelante de la cámara por el riel; al final llega al umbral y se queda
    const hb = heartbeat(t);
    headI.value = (0.75 + hb * 1.1) * (1 + 0.9 * smooth(LAST_OUT + 0.3, GAL_END, u));
    let hz = THREE.MathUtils.lerp(7.0, Math.max(Z_END + 3, P.z - 7.5), smooth(0.45, 1.45, u));
    hz = THREE.MathUtils.lerp(hz, RAIL_STOP + 0.15, smooth(LAST_OUT - 0.1, GAL_END - 0.15, u));
    st8.headZ = hz;
    headPos.value.set(0, 0.03, hz);
    // final: los negatoscopios se apagan de a uno (del primero al último) y el riel cae; queda el cabezal
    const endK = smooth(LAST_OUT, LAST_OUT + 0.7, u);
    st8.endK = endK;
    railI.value = 1 - 0.75 * endK;
    // umbral final (D-01): el rojo se recoge en el cabezal, el neutro sostiene el pasillo, la sala de proyección se
    // anuncia por el vano, la retícula cercana se apaga y el vacío deja de desenfocar lo que flota delante
    const thr = smooth(LAST_OUT + 0.1, LAST_OUT + 0.8, u);
    redFar.value = 1 - 0.85 * thr;
    redNear.value = 1 - 0.55 * thr;
    ambX.value = 0.034 * thr;
    roomI.value = 0.55 * smooth(LAST_OUT + 0.2, LAST_OUT + 1.0, u) * (1 - 0.5 * smooth(FBF_BEAM[0], FBF_BEAM[1] + 0.3, u));
    dotK.value = thr;
    // en las estadías y cruces de Frame by Frame el vacío vuelve a desenfocar (0,78 ≈ 70 % del bokeh):
    // con el vacío nítido, el borde del haz se leía como una columna recortada
    const fbfMid = smooth(FBF_INTRO[0], FBF_INTRO[1], u) * (1 - smooth(FBF_OFF - 0.2, FBF_OFF + 0.2, u));
    voidK.value = smooth(LAST_OUT + 0.15, LAST_OUT + 0.6, u) * (1 - 0.22 * fbfMid);
    // giro de entrada (D-02): el pasillo existe desde u 0,6, antes de que la señal encienda la primera placa
    const entryK = smooth(0.45, 0.75, u) * (1 - smooth(1.5, 2.1, u));
    entryI.value = 0.05 * entryK;
    grainK.value = Math.max(entryK, thr);
    // Frame by Frame: lámpara, haz, pantallas y foco (null antes de la sala)
    const fx = proj.update(u, t, dt, gw, P, L, S.inView);
    // Stack, Experience: su escena, foco y rótulos (null fuera de su tramo); manda la última que devuelve algo
    let ex = null;
    for (const x of exts) { const r = x.update(u, t, dt, gw, P, L); if (r) ex = r; }

    stations.forEach((s, k) => {
      const d0 = s.st.dwell[0];
      const pr = smooth(d0 - 1.1, d0 - 0.45, u);          // el ramal se dibuja a mitad del cruce: el próximo ya está encendido
      s.progU.value = pr;
      if (pr > 0.001 && pr < 0.999) { s.spark.visible = true; s.path.getPointAt(Math.min(1, pr), tmp); s.spark.position.copy(tmp); } else s.spark.visible = false;
      if (pr >= 0.999 && !s.igOn) { s.igOn = true; s.igT0 = t; }
      if (pr < 0.5 && s.igOn) s.igOn = false;
      const off = 1 - smooth(LAST_OUT + k * 0.1, LAST_OUT + 0.35 + k * 0.1, u);
      // en el giro de entrada los negatoscopios en espera dan un poco más (se leen como aparatos, no como huecos)
      const sb = STANDBY + 0.13 * entryK;
      const fl = s.igOn ? Math.max(sb, flicker(t - s.igT0)) : sb;
      boxU[k].ig.value = damp(boxU[k].ig.value, fl * (s.st.blur ? 0.72 : 1) * off, s.igOn && t - s.igT0 < 0.5 ? 60 : 6, dt);
      if (s.st.scan) s.scanU.value = smooth(d0 + 0.02, d0 + 0.75, u);
      s.hoverU.value = damp(s.hoverU.value, S.neg.hover === k ? 1 : 0, 8, dt);
      s.filmsG.forEach((f) => { f.fmesh.rotation.x = Math.sin(t * 0.7 + f.ph) * 0.05; f.fmesh.rotation.y = Math.sin(t * 0.43 + f.ph) * 0.07; });
    });

    // video demo: en la estadía (la misma ventana del foco en la placa); TraumaVision, con el barrido terminado
    pv.update(u, dt, gw, GAL_DWELLS, (k) => u >= ST[k].dwell[0] - 0.12 && u <= ST[k].dwell[1] + 0.05 && (!ST[k].scan || stations[k].scanU.value > 0.999));

    // foco: en qué capa está el plano de foco. Cada cambio de capa = rack focus (con su sonido, si está encendido).
    fwd.copy(L).sub(P).normalize();
    let mode, fT;
    const dIdx = ST.findIndex((s) => u >= s.dwell[0] - 0.12 && u <= s.dwell[1] + 0.05);
    if (ex) { mode = ex.mode; fT = ex.fT; }
    else if (fx && u > GAL_END) { mode = fx.mode; fT = fx.fT; }
    else if (S.neg.open >= 0) { mode = 'open' + S.neg.open; fT = q.copy(stations[S.neg.open].lightPos).sub(P).dot(fwd); }
    else if (u < 0.9) { mode = 'about'; fT = 7; }
    else if (u > LAST_OUT + 0.35) { mode = 'end'; fT = q.set(0, 0.03, st8.headZ).sub(P).dot(fwd); }   // el cabezal, nítido
    else if (dIdx >= 0) {
      const s = stations[dIdx];
      if (s.st.far) { mode = 'near' + dIdx; fT = s.filmsG[1].fg.position.clone().sub(P).dot(fwd) + 0.1; }   // LEEX: el foco se queda corto
      else { mode = 'plate' + dIdx; fT = q.copy(s.lightPos).sub(P).dot(fwd); }
    } else {
      const nx = ST.findIndex((s) => u < s.dwell[0]);
      mode = 'travel' + nx; fT = nx >= 0 ? q.copy(stations[nx].lightPos).sub(P).dot(fwd) : 14;
    }
    if (mode !== st8.mode) {
      if (st8.mode && st8.liveDone && gw > 0.5) playSound('focus', { rate: fT > st8.focus ? 0.92 : 1.1 });
      st8.mode = mode;
    }
    st8.liveDone = true;
    // en la estadía el riel cercano se ve (de él sale el ramal); viajando, su tramo bajo cámara se apaga
    st8.nearK = damp(st8.nearK, /^(plate|near|open)/.test(mode) ? 0 : 1, 2.5, dt);
    const fTarget = Math.max(0.6, fT);
    st8.focus = damp(st8.focus, fTarget, 2.4, dt);
    focusU.value = st8.focus;
    const rT = ex ? ex.rT : fx && u > GAL_END ? fx.rT : mode.startsWith('travel') ? 7.5 : mode === 'end' ? 5.5 : mode === 'about' ? 4 : THREE.MathUtils.lerp(2.0, 2.6, smooth(6, 12, st8.focus));
    st8.range = damp(st8.range, rT, 2.4, dt);
    // tamaño del bokeh: en los umbrales (plano final, el cabezal que sube, la salida en puntos) los discos se achican
    const fm = fx && u > GAL_END ? fx.mode : mode;
    const bT = fm === 'end' || fm === 'rise' || fm === 'fbf-end' ? 6 : fm === 'intro' ? 8 : 12;
    st8.bokeh = damp(st8.bokeh, bT, 2.4, dt);
    bokehU.value = st8.bokeh;
    st8.farK = damp(st8.farK, fm === 'fbf-end' ? 0.35 : 50, 2.4, dt);
    farK.value = st8.farK;
    // El DOF lee la profundidad de lo que hay DETRÁS de las cintas (transparentes, sin depthWrite). En el giro, detrás
    // de la recta está el vacío (plano lejano, ~120 m) y la recta se ablandaba en una banda gruesa. El DOF entra
    // recién cuando el pasillo llena el cuadro (u 0,8 → 1,6); antes el rango es enorme y no desenfoca nada.
    const dofIn = gw * smooth(0.8, 1.6, u);
    rangeU.value = st8.range + (1 - dofIn) * (1 - dofIn) * 1e5;
  }

  // borde izquierdo del interruptor de sonido (fijo abajo a la derecha); se mide una vez por ancho de ventana
  let sndW = -1, sndL = Infinity;
  const sndLeft = () => {
    if (sndW !== innerWidth) {
      const el = document.querySelector('.snd-toggle');
      const ow = el ? el.offsetWidth : 0;
      sndW = ow ? innerWidth : -1;
      sndL = ow ? innerWidth * (1 - 0.055) - ow - 12 : innerWidth * 0.8;
    }
    return sndL;
  };
  /** Rótulos HTML anclados a su punto 3D (mismo frame que el render). */
  function placeTags() {
    proj.placeTags(camera);
    const tags = S.neg.tags;
    for (let k = 0; k < tags.length && k < ST.length; k++) {
      const el = tags[k];
      if (!el || el.dataset.on === undefined) continue;
      tmp.copy(tagW[k]).project(camera);
      const dist = tagW[k].distanceTo(camera.position);
      const w = el.offsetWidth, h = el.offsetHeight;
      const x = (tmp.x * 0.5 + 0.5) * innerWidth;
      // margen de abajo: 80 px sólo si el rótulo cae sobre el interruptor de sonido (abajo a la derecha); si no,
      // alcanza con el aire de la página (32). Con el texto chico a 13 px (D-04) los rótulos quedaban en el piso de
      // 0,82 por esos 48 px aun lejos del interruptor: así recuperan escala.
      const yA = (-tmp.y * 0.5 + 0.5) * innerHeight;
      const pad = innerWidth * 0.055, r = ST[k].side > 0;
      const fit = (bot) => {
        // escala por profundidad; si el rótulo no entra debajo de su ancla, primero se achica (hasta 0,82) y recién
        // después sube: subir lo monta sobre la placa (Eleven a 1440: el eyebrow caía sobre el borde de la captura)
        const sc = Math.max(0.82, Math.min(Math.min(1.12, Math.max(0.88, tagRef[k] / dist)), (innerHeight - bot - yA) / h));
        const y = Math.min(yA, innerHeight - h * sc - bot);
        // el rótulo de la pared derecha escala desde su borde derecho (transform-origin 100% 0): su caja visible es
        // [xr + w·(1 − sc), xr + w]. El tope mide esa caja, no [xr, xr + w·sc]: al cerrar un caso, con la cámara
        // volviendo, el de Eleven quedaba 9 px fuera del cuadro (D-10).
        const lead = r ? w * (1 - sc) : 0;
        const xr = Math.min(Math.max((r ? x - w * sc : x) + lead, pad), innerWidth - pad - w * sc) - lead;
        return { sc, y, xr, R: xr + lead + w * sc };
      };
      let f = fit(32);
      if (f.R > sndLeft() && f.y + h * f.sc > innerHeight - 80) f = fit(80);
      const { sc, y, xr } = f;
      el.style.transform = `translate3d(${xr.toFixed(1)}px, ${Math.max(96, y).toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
    }
  }

  /** Placa bajo el puntero (sólo la del rótulo visible). */
  function pick(mx, my, active) {
    if (active < 0 || S.neg.open >= 0) return -1;
    ndc.set(mx, -my);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(stations[active].main.v, true).length ? active : -1;
  }

  /** Precalentado: compila los materiales del pasillo (sin dibujar) con todas las placas encendidas. */
  async function warm() {
    const prevVis = group.visible;
    group.visible = true;
    proj.warm(true);
    const culled = [];
    group.traverse((o) => { if (o.isMesh || o.isSprite) { culled.push([o, o.frustumCulled]); o.frustumCulled = false; } });
    const igs = boxU.map((b) => b.ig.value);
    boxU.forEach((b) => { b.ig.value = 1; });
    ctl.corrStage = 'compile';
    // compileAsync arma la lista y pide los pipelines en forma síncrona y recién después espera: todo lo que se
    // tocó (render target del pass, visibilidad, culling, placas encendidas) se restaura ANTES del await. Si no, un
    // frame del loop podía dibujar el post dentro de la textura que él mismo lee (error de WebGPU «output» usage).
    const prevRT = renderer.getRenderTarget();
    let pending = null;
    try {
      if (scenePass.renderTarget) renderer.setRenderTarget(scenePass.renderTarget);
      pending = renderer.compileAsync(scene, camera);
    } catch (e) { /* sin compileAsync: compila en el primer frame */ }
    finally {
      renderer.setRenderTarget(prevRT);
      culled.forEach(([o, f]) => { o.frustumCulled = f; });
      boxU.forEach((b, i) => { b.ig.value = igs[i]; });
      group.visible = prevVis;
      proj.warm(false);
    }
    // tope de 4 s: en WebGL 2 la compilación paralela se sondea con rAF y con la pestaña oculta no termina nunca;
    // pasado el tope, lo que falte compila en el primer frame (un tirón) en lugar de dejar el pasillo sin abrir
    try { await Promise.race([pending, new Promise((r) => setTimeout(r, 4000))]); } catch (e) { /* idem */ }
  }

  return {
    group, pipeline, bloom: bl, place, camPose, update, placeTags, pick, warm, railEndX,
    /** brillo de la cinta del riel en x de mundo (estela tenue, el cabezal brilla; nada después del final) */
    railBri(xw) {
      const zl = xw - group.position.x;
      if (zl < RAIL_STOP) return 0;
      const fade = Math.min(1, (zl - RAIL_STOP) / 0.25);
      const dz = Math.abs(zl - st8.headZ);
      const base = 0.34 * (1 - 0.6 * st8.endK);
      // cerca de cámara el riel se apaga: fuera de foco, una línea brillante a 1–3 m se lee como un haz grueso
      const c = camera.position, gx = xw - c.x, gy = railY - c.y, gz = group.position.z - c.z;
      const nk = st8.nearK, near = smooth(1.2 + 1.8 * nk, 3 + 6 * nk, Math.sqrt(gx * gx + gy * gy + gz * gz));
      // detrás de la entrada (el tramo del About y la bajada) la recta se disuelve: la señal ya está adentro
      const back = 1 - smooth(Z_IN + 5, Z_IN + 10, zl);
      return (base + 1.25 * Math.exp(-dz * 0.9) * headI.value / 1.85) * fade * near * back;
    },
    headWorldX: () => group.position.x + st8.headZ,
    /** cabezal en el mundo (en Frame by Frame sube y es la lámpara del proyector) */
    headWorld: (out) => group.localToWorld(out.copy(headPos.value)),
    fbf: proj,
    /** engancha una toma posterior (U0: u desde el que manda; pose, calm, update) */
    setExt: (e) => { exts.push(e); exts.sort((a, b) => u0Of(a) - u0Of(b)); },
    pickFbf: (mx, my) => proj.pick(mx, my, camera),
    railY: () => railY,
    info: () => ({ mode: st8.mode, focus: +st8.focus.toFixed(2), range: +st8.range.toFixed(2), headZ: +st8.headZ.toFixed(2), ig: boxU.map((b) => +b.ig.value.toFixed(2)), ...proj.info() }),
    activeTag: (u) => ST.findIndex((s) => u >= s.dwell[0] - 0.16 && u <= s.dwell[1] + 0.08),
    ABOUT_OUT: GAL_ABOUT_OUT,
  };
}
