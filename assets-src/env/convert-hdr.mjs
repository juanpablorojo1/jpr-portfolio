// Lee un .hdr (Radiance RGBE, con o sin RLE) como DATO, lo reduce 2× con promedio en float y lo escribe como RGBE
// plano (sin RLE, lo lee HDRLoader). Además un PNG de vista previa (Reinhard) para elegir la rotación.
// node convert-hdr.mjs <in.hdr> <out.hdr> <preview.png> <sharp-module-path>
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const [, , inP, outP, prevP, sharpPath] = process.argv;
const buf = readFileSync(inP);
let pos = 0;
const line = () => { let s = ''; while (buf[pos] !== 0x0a) s += String.fromCharCode(buf[pos++]); pos++; return s; };
let l; const header = [];
while ((l = line()) !== '') header.push(l);
const res = line(); const m = res.match(/-Y (\d+) \+X (\d+)/);
const H = +m[1], W = +m[2];
const px = new Float32Array(W * H * 3);
const scan = new Uint8Array(W * 4);
for (let y = 0; y < H; y++) {
  if (buf[pos] === 2 && buf[pos + 1] === 2 && ((buf[pos + 2] << 8) | buf[pos + 3]) === W) {
    pos += 4;
    for (let c = 0; c < 4; c++) {
      let x = 0;
      while (x < W) {
        let n = buf[pos++];
        if (n > 128) { n -= 128; const v = buf[pos++]; for (let i = 0; i < n; i++) scan[(x++) * 4 + c] = v; }
        else { for (let i = 0; i < n; i++) scan[(x++) * 4 + c] = buf[pos++]; }
      }
    }
  } else { for (let x = 0; x < W * 4; x++) scan[x] = buf[pos++]; }
  for (let x = 0; x < W; x++) {
    const e = scan[x * 4 + 3], f = e ? Math.pow(2, e - 136) : 0;
    const o = (y * W + x) * 3;
    px[o] = scan[x * 4] * f; px[o + 1] = scan[x * 4 + 1] * f; px[o + 2] = scan[x * 4 + 2] * f;
  }
}
const w = W / 2, h = H / 2;
const small = new Float32Array(w * h * 3);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
  small[(y * w + x) * 3 + c] = (px[((2 * y) * W + 2 * x) * 3 + c] + px[((2 * y) * W + 2 * x + 1) * 3 + c] + px[((2 * y + 1) * W + 2 * x) * 3 + c] + px[((2 * y + 1) * W + 2 * x + 1) * 3 + c]) / 4;
}
// RGBE plano
const head = Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${h} +X ${w}\n`, 'ascii');
const data = Buffer.alloc(w * h * 4);
let maxV = 0, sum = 0;
for (let i = 0; i < w * h; i++) {
  const r = small[i * 3], g = small[i * 3 + 1], b = small[i * 3 + 2];
  const v = Math.max(r, g, b); maxV = Math.max(maxV, v); sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (v < 1e-32) continue;
  const e = Math.ceil(Math.log2(v) + 1e-9), sc = 256 / Math.pow(2, e);
  data[i * 4] = Math.min(255, Math.floor(r * sc)); data[i * 4 + 1] = Math.min(255, Math.floor(g * sc)); data[i * 4 + 2] = Math.min(255, Math.floor(b * sc)); data[i * 4 + 3] = e + 128;
}
writeFileSync(outP, Buffer.concat([head, data]));
console.log('in', W, 'x', H, '→', w, 'x', h, 'max', maxV.toFixed(2), 'mean lum', (sum / (w * h)).toFixed(4), 'bytes', head.length + data.length);
// percentiles de luminancia (para calibrar la intensidad) y dónde están las fuentes (columnas brillantes)
const lums = []; for (let i = 0; i < w * h; i++) lums.push(0.2126 * small[i * 3] + 0.7152 * small[i * 3 + 1] + 0.0722 * small[i * 3 + 2]);
const sorted = [...lums].sort((a, b) => a - b); console.log('p50', sorted[Math.floor(lums.length * 0.5)].toFixed(4), 'p90', sorted[Math.floor(lums.length * 0.9)].toFixed(3), 'p99', sorted[Math.floor(lums.length * 0.99)].toFixed(2));
// vista previa
const req = createRequire(import.meta.url); const sharp = req(sharpPath);
const rgb = Buffer.alloc(w * h * 3);
for (let i = 0; i < w * h * 3; i++) { const v = small[i] * 0.6; rgb[i] = Math.round(255 * Math.pow(v / (1 + v), 1 / 2.2)); }
await sharp(rgb, { raw: { width: w, height: h, channels: 3 } }).png().toFile(prevP);
console.log('preview', prevP);
