/* La notebook de la vitrina: ultrabook de 14" sin marca, hecha por código (geometría procedural de three).
   Juan (2026-10-12): «Hacer que la notebook se vea mas realista y que se vea mas cinematografico todo».
   Blender no está instalado en esta PC: el modelo se arma acá con el mismo nivel de detalle que pedía el brief
   (versionado por código, sin glTF ni texturas que bajar: 0 KB extra en la carga).
   Escala: 1 unidad ≈ 9,5 cm (la pantalla 2:1 de 3,2 u ≈ 30 cm, porque los homes de los cuatro productos son 2:1).
   - Base en cuña (≈ 11 → 15 mm), esquinas redondeadas y cantos achaflanados (bevel real de la extrusión) que atrapan
     la luz; patitas de goma; bisagra de barril; teclado de teclas individuales (InstancedMesh) hundido en su cama;
     trackpad de vidrio con coat.
   - Tapa de ~4 mm con chaflán; bisel negro de vidrio con coat y la cámara; la pantalla (el home) aparte, nítida.
   - Materiales PBR: aluminio anodizado grafito (metalness 0,9, roughness 0,4, anisotropía de cepillado 0,3), teclas
     de plástico mate, vidrio con clearcoat. Los reflejos salen de un estudio de softboxes filtrado con PMREM
     (studioEnv), con intensidad baja: el metal tiene qué reflejar sin levantar el negro.
   - La pantalla es la luz principal: `spill` suma su color promedio sobre teclado, deck y canto (Lambert con la
     caída de una luz de área: coseno en la superficie y en la pantalla, 1/(1+d²)). La AO es geométrica: la cama del
     teclado es negra y las teclas tapan; la sombra de contacto la pone vitrina.js.
   - El rojo #E8272A ya no es un marco: una línea fina en el canto de la tapa y otra en la bisagra (luz de borde). */
import * as THREE from 'three/webgpu';
import {
  uniform, texture, uv, vec3, float, smoothstep, exp, abs, mix, max, step, positionWorld, normalWorld, normalize, dot, length,
  normalLocal, positionLocal, mx_noise_float
} from 'three/tsl';

export const SW = 3.2, SH = 1.6;                               // pantalla (2:1)
const BZ_S = 0.05, BZ_T = 0.075, CHIN = 0.1;
export const LW = SW + 2 * BZ_S;                               // 3,30 u ≈ 31 cm
export const LIDH = SH + BZ_T + CHIN;                          // 1,775 u
const LID_T = 0.042;                                           // ≈ 4 mm
export const LD = 2.28;                                        // profundidad de la base
export const FRONT = -0.3;                                     // canto delantero, 30 cm detrás de la recta
const FEET = 0.018, T_FRONT = 0.115, T_BACK = 0.16;            // cuña ≈ 11 → 15 mm
const SLOPE = Math.atan((T_BACK - T_FRONT) / LD);
export const HINGE_Y = FEET + T_BACK + 0.004, HINGE_Z = FRONT - LD + 0.05;
export const OPEN = -0.2;                                      // tapa abierta ≈ 110°
export const CLOSED = Math.PI / 2 + SLOPE;                     // cerrada, apoyada sobre la cuña
// objetivo de la cámara: más alto que el centro del objeto, así la base asienta al ~68–70 % del cuadro (D-08)
export const CENTER = new THREE.Vector3(0, 0.9, FRONT - LD * 0.6);
export const SCREEN_Y = CHIN + SH / 2;                         // centro de la pantalla en la tapa (local de la bisagra)

function rrect(w, h, r, x0 = -w / 2, y0 = 0) {
  const s = new THREE.Shape();
  s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}

/* ---------- geometrías compartidas por las cuatro notebooks ---------- */
let GEO = null;
function geometries() {
  if (GEO) return GEO;
  const BV = 0.016;                                             // chaflán de 1,5 mm: la hairline que atrapa la luz
  // base: extrusión vertical de un rectángulo redondeado; la tapa superior baja hacia el frente (cuña) y el chaflán
  // queda con su medida real arriba y abajo
  const base = new THREE.ExtrudeGeometry(rrect(LW - 2 * BV, LD - 2 * BV, 0.15, -(LW - 2 * BV) / 2, BV), { depth: 1, bevelEnabled: true, bevelThickness: BV, bevelSize: BV, bevelSegments: 3, curveSegments: 12 });
  base.rotateX(-Math.PI / 2);                                   // extrusión → +y; forma y → −z
  {
    const p = base.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), z = p.getZ(i);
      const thick = T_FRONT + (T_BACK - T_FRONT) * Math.min(1, Math.max(0, -z / LD));
      const ny = y <= 0.5 ? FEET + (y + BV) : FEET + thick - (1 + BV - y);
      p.setY(i, ny); p.setZ(i, z + FRONT);
    }
    p.needsUpdate = true;
    base.computeBoundingSphere();
  }
  // tapa: placa de ~4 mm con chaflán; la cara de la pantalla queda en z = 0 (local de la bisagra), hacia +z
  const LB = 0.0075;
  const lid = new THREE.ExtrudeGeometry(rrect(LW - 2 * LB, LIDH - 2 * LB, 0.11, -(LW - 2 * LB) / 2, LB), { depth: LID_T - 2 * LB, bevelEnabled: true, bevelThickness: LB, bevelSize: LB, bevelSegments: 2, curveSegments: 10 });
  lid.translate(0, 0, -(LID_T - LB));
  const bezel = new THREE.ShapeGeometry(rrect(LW - 0.014, LIDH - 0.014, 0.104, -(LW - 0.014) / 2, 0.007), 10);
  const screen = new THREE.PlaneGeometry(SW, SH);
  const hinge = new THREE.CylinderGeometry(0.034, 0.034, LW * 0.74, 24, 1); hinge.rotateZ(Math.PI / 2);
  const foot = new THREE.CylinderGeometry(0.055, 0.06, FEET, 16);
  const key = new THREE.BoxGeometry(1, 1, 1);
  const well = new THREE.ShapeGeometry(rrect(2.9, 1.04, 0.05, -1.45, 0), 6); well.rotateX(-Math.PI / 2);
  const pad = new THREE.ShapeGeometry(rrect(1.34, 0.7, 0.06, -0.67, 0), 8); pad.rotateX(-Math.PI / 2);
  const cam = new THREE.CircleGeometry(0.013, 20);
  const line = new THREE.BoxGeometry(1, 1, 1);
  GEO = { base, lid, bezel, screen, hinge, foot, key, well, pad, cam, line };
  return GEO;
}

/* teclado: 6 filas de 14 u (1 u = 0,2), de atrás hacia adelante; [anchos] */
const ROWS = [
  { h: 0.085, w: Array(14).fill(1) },
  { h: 0.145, w: Array(14).fill(1) },
  { h: 0.145, w: [1.5, ...Array(11).fill(1), 1.5] },
  { h: 0.145, w: [1.75, ...Array(11).fill(1), 1.25] },
  { h: 0.145, w: [2.25, ...Array(10).fill(1), 1.75] },
  { h: 0.145, w: [1, 1, 1, 1.25, 5.5, 1.25, 1, 1, 1, 1] },
];
const PITCH = 0.2, GAP = 0.032, ROW_GAP = 0.03;

/** Estudio de reflejos: softboxes sobre negro, filtrado con PMREM. Devuelve la textura o null si falla. */
export async function studioEnv(renderer) {
  try {
    const sc = new THREE.Scene();
    const box = (w, h, k, pos, look) => {
      const m = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
      // softbox con borde suave (difusor), no un rectángulo duro
      const v = uv();
      const edge = smoothstep(0.0, 0.18, v.x).mul(smoothstep(0.0, 0.18, float(1).sub(v.x))).mul(smoothstep(0.0, 0.18, v.y)).mul(smoothstep(0.0, 0.18, float(1).sub(v.y)));
      m.colorNode = vec3(k, k * 0.985, k * 0.97).mul(edge);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      p.position.copy(pos); p.lookAt(look); sc.add(p);
    };
    // alto rango: negro puro y pocas fuentes MUY brillantes (×4–6). Con envMapIntensity bajo, el metal queda negro
    // salvo donde refleja una fuente: bandas que se deslizan al orbitar y chaflanes que se encienden (D-01)
    const O = new THREE.Vector3(0, 0, 0);
    box(9, 2.0, 16, new THREE.Vector3(0, 6, -3.2), O);         // softbox largo cenital-trasero: banda sobre deck y tapa
    box(1.0, 6.5, 10, new THREE.Vector3(-6.5, 1.8, 1.2), O);   // strip lateral izquierdo: el canto izquierdo
    box(0.8, 4.5, 3.5, new THREE.Vector3(6, 1.2, -2.2), O);    // strip derecho, bajo (relación de luz)
    box(6.5, 0.32, 7, new THREE.Vector3(0, 0.45, 7.5), O);     // tira baja de frente: la hairline del chaflán delantero
    {                                                          // tira diagonal detrás de cámara: el reflejo del bisel (D-05)
      const m = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide }); m.colorNode = vec3(1.2);   // ≤ ~5 % sobre el vidrio negro
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 6), m);
      p.position.set(2.8, 3.2, 7.5); p.lookAt(O); p.rotateZ(0.62); sc.add(p);
    }
    const pm = new THREE.PMREMGenerator(renderer);
    const rt = pm.fromScene(sc, 0.0);              // el renderer ya está inicializado (fromSceneAsync quedó deprecado en r181)
    sc.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    return rt.texture;
  } catch (e) {
    console.warn('[vitrina] studio env:', e && e.message);
    return null;
  }
}

/** Arma una notebook. u: uniforms propios (light = la luz real del cuadro, pw = encendido de la pantalla,
    rim = la línea roja, scrC/scrN = centro y normal de la pantalla en el mundo, scrCol = color promedio del home). */
export function buildNotebook({ screenTex, scrColor, env, appear, RED }) {
  const G = geometries();
  const u = {
    light: uniform(0), pw: uniform(0), rim: uniform(0), expo: uniform(0.9),
    scrC: uniform(new THREE.Vector3()), scrN: uniform(new THREE.Vector3(0, 0, 1)), scrCol: uniform(new THREE.Color(scrColor)),
    scrX: uniform(new THREE.Vector3(1, 0, 0)), scrY: uniform(new THREE.Vector3(0, 1, 0)),   // ejes de la pantalla (el reflejo del piso)
  };
  // luz de la pantalla sobre una superficie (luz de área aproximada): Lambert en la superficie y en la pantalla
  const spill = (k) => {
    const toS = u.scrC.sub(positionWorld);
    const d = length(toS);
    const L = toS.div(d);
    const cosS = max(dot(normalWorld, L), 0), cosE = max(dot(u.scrN, L.negate()), 0);
    return vec3(u.scrCol).mul(cosS.mul(cosE).mul(k).div(d.mul(d).mul(0.9).add(1))).mul(u.pw).mul(u.light);
  };
  const envI = 0.42;
  /* aluminio: arenado (roughness 0,42 con micro-rayado ±0,05) y chaflanes de corte diamante pulidos (0,15). El chaflán
     se detecta por la normal de la geometría: ni tapa (eje de las caras) ni costado, sino diagonal (D-01). */
  const aluFor = (axis) => {
    const m = new THREE.MeshPhysicalNodeMaterial({ color: 0x7d8086, metalness: 0.9, roughness: 0.42, anisotropy: 0.3, envMap: env, envMapIntensity: envI });
    const nA = abs(axis === 'y' ? normalLocal.y : normalLocal.z);
    const bevel = smoothstep(0.12, 0.35, nA).mul(float(1).sub(smoothstep(0.86, 0.97, nA)));
    const scratch = mx_noise_float(positionLocal.mul(vec3(3.0, 90.0, 3.0))).mul(0.035).add(mx_noise_float(positionLocal.mul(14.0)).mul(0.025));
    m.roughnessNode = mix(float(0.42).add(scratch), float(0.15), bevel);
    m.emissiveNode = spill(0.07).mul(appear);
    return m;
  };
  const alu = aluFor('y'), aluLid = aluFor('z');
  const aluDark = new THREE.MeshPhysicalNodeMaterial({ color: 0x55585e, metalness: 0.9, roughness: 0.5, envMap: env, envMapIntensity: envI * 0.8 });
  const keyM = new THREE.MeshStandardNodeMaterial({ color: 0x17181b, metalness: 0, roughness: 0.72, envMap: env, envMapIntensity: envI * 0.5 });
  keyM.emissiveNode = spill(0.2).mul(appear);                  // el resplandor de la pantalla sobre las teclas, neutro
  const wellM = new THREE.MeshBasicNodeMaterial();
  wellM.colorNode = vec3(0.0012, 0.0012, 0.0014).add(spill(0.01)).mul(appear);
  const padM = new THREE.MeshPhysicalNodeMaterial({ color: 0x1d1e22, metalness: 0, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, envMap: env, envMapIntensity: envI });
  padM.emissiveNode = spill(0.03).mul(appear);
  const glassM = new THREE.MeshPhysicalNodeMaterial({ color: 0x030304, metalness: 0, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, envMap: env, envMapIntensity: envI * 1.1 });
  const footM = new THREE.MeshStandardNodeMaterial({ color: 0x0a0a0b, roughness: 0.9 });
  const camM = new THREE.MeshBasicNodeMaterial();
  camM.colorNode = vec3(0.012, 0.013, 0.02).mul(appear);
  // rojo de borde: hilo nítido (D-04). La bisagra más baja (no tiñe el teclado); el canto de la tapa, hairline visible
  const lineM = new THREE.MeshBasicNodeMaterial();
  lineM.colorNode = RED.mul(u.rim.mul(0.8)).mul(appear);
  const lidLineM = new THREE.MeshBasicNodeMaterial();
  lidLineM.colorNode = RED.mul(u.rim.mul(2.2)).mul(appear);
  // pantalla: el home tal cual, con la exposición calibrada (el blanco de la UI no revienta sobre el negro);
  // enciende desde la línea roja de abajo hacia arriba. Sin post: corridor.js la saca con la máscara.
  const scrM = new THREE.MeshBasicNodeMaterial();
  {
    const v = uv();
    const tc = texture(screenTex, v).rgb;
    const pwv = u.pw.mul(u.light);
    const vis = float(1).sub(smoothstep(pwv.sub(0.008), pwv, v.y));
    const front = exp(abs(v.y.sub(pwv)).mul(-110)).mul(step(0.002, pwv)).mul(step(pwv, 0.998));
    scrM.colorNode = mix(vec3(0.0025, 0.0025, 0.003), tc.mul(u.expo), vis).add(RED.mul(front.mul(1.6))).mul(appear);
  }

  const root = new THREE.Group();
  const base = new THREE.Mesh(G.base, alu); root.add(base);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const f = new THREE.Mesh(G.foot, footM);
    f.position.set(sx * (LW / 2 - 0.32), FEET / 2, FRONT - LD / 2 + sz * (LD / 2 - 0.3));
    root.add(f);
  });
  // deck: cama del teclado, teclas y trackpad sobre la cara de arriba (inclinada por la cuña)
  const deck = new THREE.Group();
  deck.position.set(0, FEET + T_FRONT, FRONT); deck.rotation.x = SLOPE;
  root.add(deck);
  const zK0 = -LD + 0.3;                                         // borde trasero del teclado
  const well = new THREE.Mesh(G.well, wellM); well.position.set(0, 0.0007, zK0 - 0.06 + 1.04); deck.add(well);
  {
    const keys = [];
    let z = zK0;
    ROWS.forEach((r) => {
      let x = -1.4;
      r.w.forEach((w) => { keys.push([x + (w * PITCH) / 2, z + r.h / 2, w * PITCH - GAP, r.h]); x += w * PITCH; });
      z += r.h + ROW_GAP;
    });
    const im = new THREE.InstancedMesh(G.key, keyM, keys.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    keys.forEach(([x, zz, w, d], i) => { p.set(x, 0.008, zz); s.set(w, 0.016, d); m.compose(p, q, s); im.setMatrixAt(i, m); });
    im.instanceMatrix.needsUpdate = true;
    deck.add(im);
  }
  const pad = new THREE.Mesh(G.pad, padM); pad.position.set(0, 0.0009, -0.13); deck.add(pad);
  // bisagra de barril y su línea roja
  const barrel = new THREE.Mesh(G.hinge, aluDark); barrel.position.set(0, FEET + T_BACK - 0.012, HINGE_Z - 0.012); root.add(barrel);
  const hLine = new THREE.Mesh(G.line, lineM); hLine.scale.set(LW * 0.72, 0.0016, 0.0016); hLine.position.set(0, FEET + T_BACK + 0.012, HINGE_Z + 0.03); root.add(hLine);
  // tapa
  const hinge = new THREE.Group(); hinge.position.set(0, HINGE_Y, HINGE_Z); hinge.rotation.x = CLOSED; root.add(hinge);
  const lid = new THREE.Mesh(G.lid, aluLid); hinge.add(lid);
  const bezel = new THREE.Mesh(G.bezel, glassM); bezel.position.z = 0.0006; hinge.add(bezel);
  const camDot = new THREE.Mesh(G.cam, camM); camDot.position.set(0, LIDH - BZ_T / 2, 0.0011); hinge.add(camDot);
  const screen = new THREE.Mesh(G.screen, scrM); screen.position.set(0, SCREEN_Y, 0.0014); screen.renderOrder = 2; hinge.add(screen);
  const rimLine = new THREE.Mesh(G.line, lidLineM); rimLine.scale.set(LW - 0.26, 0.0045, LID_T * 0.62); rimLine.position.set(0, LIDH + 0.0018, -LID_T / 2); hinge.add(rimLine);

  const mats = [alu, aluLid, aluDark, keyM, padM, glassM];
  const baseI = new Map([[alu, envI], [aluLid, envI], [aluDark, envI * 0.8], [keyM, envI * 0.5], [padM, envI], [glassM, envI * 1.1]]);
  /** luz real (0..1): los reflejos del estudio caen con la luz del cuadro (apagón = negro) */
  function setLight(v) { u.light.value = v; mats.forEach((m) => { m.envMapIntensity = baseI.get(m) * v; }); }
  const tmpC = new THREE.Vector3(), tmpN = new THREE.Vector3();
  /** centro y normal de la pantalla en el mundo (para la luz que derrama) */
  function syncScreen() {
    screen.updateWorldMatrix(true, false);
    tmpC.setFromMatrixPosition(screen.matrixWorld);
    tmpN.set(0, 0, 1).transformDirection(screen.matrixWorld);
    u.scrC.value.copy(tmpC); u.scrN.value.copy(tmpN);
    u.scrX.value.set(1, 0, 0).transformDirection(screen.matrixWorld);
    u.scrY.value.set(0, 1, 0).transformDirection(screen.matrixWorld);
  }
  return { root, hinge, screen, u, setLight, syncScreen };
}

/** color promedio del home (la luz que derrama la pantalla), en sRGB */
export function averageColor(img) {
  const c = document.createElement('canvas'); c.width = 8; c.height = 4;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, 8, 4);
  const d = g.getImageData(0, 0, 8, 4).data;
  let r = 0, gg = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  return new THREE.Color().setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace);
}
