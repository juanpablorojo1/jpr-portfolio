// Prepara el HDRI de estudio para los reflejos de la vitrina: estudio negro con las fuentes reales.
// - Las fuentes (octaboxes, lámparas) quedan con su forma y su estructura (la rejilla del difusor); el ciclorama blanco,
//   el piso y el cuarto bajan al 3 % (si no, levantan el negro del metal: el brief pide «estudio negro»).
// - Escala: el octabox principal queda con radiancia media ~5 (calibrado contra el softbox procedural de la ronda 4).
// - Rotación (columnas): el octabox principal queda detrás de la notebook (−z, u = 0,25 en el mapeo equirect de three)
//   y el segundo a la derecha, un poco adelante.
// node grade-hdr.mjs <in-512.hdr> <out.hdr> <preview.png> <sharp>
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const [, , inP, outP, prevP, sharpPath] = process.argv;
const buf = readFileSync(inP);
const txt = buf.subarray(0, 200).toString('ascii');
const m = txt.match(/-Y (\d+) \+X (\d+)\n/); const H = +m[1], W = +m[2];
const off = txt.indexOf(m[0]) + m[0].length;
const px = new Float32Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  const e = buf[off + i * 4 + 3], f = e ? Math.pow(2, e - 136) : 0;
  for (let c = 0; c < 3; c++) px[i * 3 + c] = buf[off + i * 4 + c] * f;
}
const lum = (i) => 0.2126 * px[i * 3] + 0.7152 * px[i * 3 + 1] + 0.0722 * px[i * 3 + 2];
// octabox principal: región u 0,52–0,68, v 0,25–0,5
let sL = 0, n = 0, cx = 0;
for (let y = Math.floor(H * 0.25); y < H * 0.5; y++) for (let x = Math.floor(W * 0.52); x < W * 0.68; x++) {
  const L = lum(y * W + x); if (L > 2) { sL += L; n++; cx += x; }
}
const meanOcta = sL / n, colOcta = cx / n;
const scale = 5 / meanOcta;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const out = new Float32Array(W * H * 3);
const shift = Math.round(W * 0.25 - colOcta);          // columnas: el octabox a u = 0,25 (−z)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, L = lum(i);
  const w = sm(1.8, 7, L);                              // fuentes
  const below = y > H * 0.52 ? 0.3 : 1;                 // piso del estudio
  const k = scale * (w + (1 - w) * 0.03) * below;
  const xo = ((x + shift) % W + W) % W, o = (y * W + xo) * 3;
  // R56-01: tope de radiancia (lámparas desnudas y núcleo de los octaboxes, hasta 123): con Fresnel rasante el metal
  // las devolvía a 255 en la bisagra durante la órbita. Tope = 1,6 × la media del octabox (~8), conservando el tono.
  const Lk = L * k, cap = 8, f = Lk > cap ? cap / Lk : 1;
  for (let c = 0; c < 3; c++) out[o + c] = px[i * 3 + c] * k * f;
}
const head = Buffer.from(`#?RADIANCE\n# Poly Haven "Studio Small 09" (CC0), 1K -> 512x256, graded for the jpr-web vitrina\nFORMAT=32-bit_rle_rgbe\n\n-Y ${H} +X ${W}\n`, 'ascii');
const data = Buffer.alloc(W * H * 4);
let maxV = 0;
for (let i = 0; i < W * H; i++) {
  const r = out[i * 3], g = out[i * 3 + 1], b = out[i * 3 + 2], v = Math.max(r, g, b); maxV = Math.max(maxV, v);
  if (v < 1e-32) continue;
  const e = Math.ceil(Math.log2(v) + 1e-9), s = 256 / Math.pow(2, e);
  data[i * 4] = Math.min(255, Math.floor(r * s)); data[i * 4 + 1] = Math.min(255, Math.floor(g * s)); data[i * 4 + 2] = Math.min(255, Math.floor(b * s)); data[i * 4 + 3] = e + 128;
}
writeFileSync(outP, Buffer.concat([head, data]));
console.log('octabox mean', meanOcta.toFixed(2), 'at col', colOcta.toFixed(0), 'scale', scale.toFixed(3), 'shift', shift, 'max', maxV.toFixed(1), 'bytes', head.length + data.length);
const req = createRequire(import.meta.url); const sharp = req(sharpPath);
const rgb = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H * 3; i++) { const v = out[i] * 0.5; rgb[i] = Math.round(255 * Math.pow(v / (1 + v), 1 / 2.2)); }
await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).png().toFile(prevP);
