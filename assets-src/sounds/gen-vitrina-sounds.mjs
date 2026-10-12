// Sonidos de la vitrina (Projects), sintetizados: no hay muestras de terceros.
// node assets-src/sounds/gen-vitrina-sounds.mjs  →  public/sounds/{spot,hinge,hum}.wav (mono, 44,1 kHz, 16 bit)
// - spot: golpe seco del cenital al encenderse (thump grave + chasquido del relé), 0,32 s
// - hinge: clic de la bisagra al cerrarse la tapa (dos chasquidos metálicos cortos), 0,14 s
// - hum: zumbido grave del estudio en la estadía, 4 s en loop sin costura (55 y 110 Hz con ciclos enteros)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../public/sounds');
mkdirSync(out, { recursive: true });
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

function wav(name, data) {
  const n = data.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i])) * 32000), 44 + i * 2);
  writeFileSync(resolve(out, name), buf);
  console.log(name, (buf.length / 1024).toFixed(1), 'KB');
}

{ // spot
  const n = Math.round(SR * 0.32), d = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const thump = Math.sin(2 * Math.PI * (52 + 40 * Math.exp(-t * 30)) * t) * Math.exp(-t * 16);
    lp += (rnd() - lp) * 0.35;
    const click = (rnd() - lp) * Math.exp(-t * 180);
    d[i] = thump * 0.8 + click * 0.45;
  }
  wav('spot.wav', d);
}
{ // hinge
  const n = Math.round(SR * 0.14), d = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const c1 = (rnd() * 0.6 + Math.sin(2 * Math.PI * 2300 * t) * 0.6) * Math.exp(-t * 260);
    const t2 = t - 0.045;
    const c2 = t2 > 0 ? (rnd() * 0.4 + Math.sin(2 * Math.PI * 1750 * t2) * 0.5) * Math.exp(-t2 * 300) : 0;
    d[i] = (c1 + c2 * 0.7) * 0.6;
  }
  wav('hinge.wav', d);
}
{ // hum (loop)
  const n = SR * 4, d = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    lp += (rnd() - lp) * 0.002;
    d[i] = Math.sin(2 * Math.PI * 55 * t) * 0.32 + Math.sin(2 * Math.PI * 110 * t) * 0.12 + Math.sin(2 * Math.PI * 165 * t) * 0.03 + lp * 0.5;
  }
  // cola y cabeza iguales: fundido cruzado de 0,2 s para que el ruido no corte en el loop
  const f = Math.round(SR * 0.2);
  for (let i = 0; i < f; i++) { const a = i / f; d[i] = d[i] * a + d[n - f + i] * (1 - a); }
  wav('hum.wav', d.slice(0, n - f));
}
