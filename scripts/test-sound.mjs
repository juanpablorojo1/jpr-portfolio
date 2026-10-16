// Prueba de la lógica de src/lib/sound.ts en Node, con Howler simulado: interruptor, carga, densidad (P1/P2), gaps,
// variación, retención de los saltos (holdScene, S-03), el zumbido durante un salto (F-01) y los silencios.
// Uso: node scripts/test-sound.mjs [repo]   (sale con código 1 si algo falla)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const repo = process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(repo, 'package.json'));
const ts = require('typescript');
const src = fs.readFileSync(path.join(repo, 'src/lib/sound.ts'), 'utf8');
let js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sound-test-'));
fs.writeFileSync(path.join(dir, 'howler-mock.mjs'), `
export const created = [];
export const plays = [];
export const fades = [];
export const instances = {};
export class Howl {
  constructor(o) { this.o = o; created.push(o.src[0]); this.n = 0; instances[o.src[0]] = this; }
  play() { const id = ++this.n; plays.push({ src: this.o.src[0], id, vol: null, rate: 1 }); return id; }
  volume(v, id) { this.vols ||= {}; if (id === undefined) return this.vols[v] ?? this.o.volume; this.vols[id] = v; const p = plays.findLast((x) => x.src === this.o.src[0] && x.id === id); if (p) p.vol = v; }
  rate(r, id) { const p = plays.findLast((x) => x.src === this.o.src[0] && x.id === id); if (p) p.rate = r; }
  fade(from, to, ms, id) { fades.push({ src: this.o.src[0], from, to }); this.vols ||= {}; this.vols[id] = from; }
  stop() {} unload() {}
}`);
js = js.replace("import('howler')", "import('./howler-mock.mjs')");
fs.writeFileSync(path.join(dir, 'sound-under-test.mjs'), js);

let now = 0, width = 1440, reducedMQ = false;
const listeners = {};
globalThis.window = globalThis;
globalThis.performance = { now: () => now };
globalThis.matchMedia = (q) => ({ matches: q.includes('reduced') ? reducedMQ : q.includes('min-width: 1024px') ? width >= 1024 : false });
globalThis.document = { hidden: false };
globalThis.sessionStorage = { s: {}, getItem(k) { return this.s[k] ?? null; }, setItem(k, v) { this.s[k] = v; } };
globalThis.addEventListener = (t, f) => { (listeners[t] ||= []).push(f); };
globalThis.removeEventListener = (t, f) => { listeners[t] = (listeners[t] || []).filter((g) => g !== f); };

const H = await import(pathToFileURL(path.join(dir, 'howler-mock.mjs')).href);
const S = await import(pathToFileURL(path.join(dir, 'sound-under-test.mjs')).href);
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const tick = () => new Promise((r) => setTimeout(r, 0));
const count = (id) => H.plays.filter((p) => p.src === `/sounds/${id}.webm`).length;

// 1. apagado: nada suena y nada se carga
S.playSound('mat-focus'); S.loopSound('mat-hum', true);
ok(H.created.length === 0 && H.plays.length === 0, 'apagado: 0 Howl creados, 0 disparos');

// 2. angosto + restaurar sesión: no carga
width = 800; sessionStorage.s['jpr-sound'] = '1'; S.restoreSound(); await tick(); await tick();
ok(H.created.length === 0, 'restaurar por debajo de 1024: 0 Howl creados');
S.setSound(false); width = 1440;

// 3. encender con clic: carga 16 ids con [webm, m4a] y suena ui-on una vez
S.setSound(true); await tick(); await tick(); await tick();
ok(H.created.length === 16, `encendido: ${H.created.length} Howl creados`);
ok(count('ui-on') === 1, 'ui-on suena una vez al terminar la carga');

// 4. P1 calla todo 250 ms
now = 10000; S.playSound('sig-converge'); now += 100; S.playSound('ui-hover'); S.playSound('mat-focus');
ok(count('sig-converge') === 1 && count('ui-hover') === 0 && count('mat-focus') === 0, 'P1: dentro de 250 ms no suena nada más');
now += 200; S.playSound('ui-hover');
ok(count('ui-hover') === 1, 'P1: pasados 250 ms, un P3 suena');

// 5. P2 calla P2 y P3 150 ms, pero no P1
now = 20000; S.playSound('ui-open'); now += 50; S.playSound('ui-step'); S.playSound('mat-drum'); S.playSound('sig-dot');
ok(count('ui-step') === 0 && count('mat-drum') === 0 && count('sig-dot') === 1, 'P2: calla P2/P3 150 ms; un P1 pasa');

// 6. gap propio
now = 30000; S.playSound('mat-detent'); now += 50; S.playSound('mat-detent'); now += 50; S.playSound('mat-detent');
ok(count('mat-detent') === 2, 'gap: mat-detent 90 ms (3 intentos en 100 ms → 2 disparos)');

// 7. variación: rate/vol dentro de rango, nunca idénticos seguidos; gain × 0,5
const hv = []; for (let i = 0; i < 40; i++) { now += 500; S.playSound('ui-hover'); hv.push(H.plays.at(-1)); }
const inRange = hv.every((p) => p.rate >= 0.96 - 1e-9 && p.rate <= 1.04 + 1e-9 && p.vol >= 0.27 - 1e-9 && p.vol <= 0.33 + 1e-9);
const neverSame = hv.every((p, i) => i === 0 || p.rate !== hv[i - 1].rate);
ok(inRange, 'ui-hover: rate en ±4 %, vol en ±10 % de 0,30');
ok(neverSame, 'ui-hover: dos disparos seguidos nunca idénticos');
now += 1000; S.playSound('mat-drum', { gain: 0.5 }); const d = H.plays.at(-1);
ok(Math.abs(d.vol - 0.225) < 1e-9, `mat-drum con gain 0,5: vol ${d.vol}`);
now += 3000; S.playSound('sig-ring'); const r = H.plays.at(-1);
ok(r.vol === 0.6 && r.rate === 1, 'sig-ring sin variación (0,60 y rate 1)');

// 8. salto: air-jump retiene la escena hasta scrollend o 1,6 s; lo que no es escena sigue
now = 100000; S.playSound('air-jump'); now += 300; S.playSound('mat-focus'); S.playSound('ui-click');
ok(count('mat-focus') === 0 && count('ui-click') > 0, 'salto: escena retenida, la interfaz no');
now += 1400; S.playSound('mat-focus'); ok(count('mat-focus') === 1, 'salto: la escena vuelve a 1,6 s');
now += 2000; S.playSound('air-jump'); now += 300; (listeners.scrollend || []).forEach((f) => f()); listeners.scrollend = []; S.playSound('sig-beat');
ok(count('sig-beat') === 0, 'salto: recién terminado el scroll, la cámara todavía llega (escena retenida)');
now += 950; S.playSound('sig-beat');
ok(count('sig-beat') === 1, 'salto: la escena vuelve a scrollend + 0,9 s');
now += 3000; S.playSound('air-jump'); now += 1000; (listeners.scrollend || []).forEach((f) => f()); listeners.scrollend = []; now += 800; S.playSound('mat-hinge');
ok(count('mat-hinge') === 0, 'salto largo: scrollend a 1 s + 0,8 s sigue retenido (pasado el 1,6 s)');

now += 3000; S.playSound('air-jump'); now += 6000; (listeners.scrollend || []).forEach((f) => f()); listeners.scrollend = []; now += 300; S.playSound('mat-focus'); const fc = count('mat-focus');
ok(fc === 2, 'listener viejo de un salto sin scroll: un scroll propio 6 s después no retiene');

// S-03: el scroll suave arranca tarde (después de 1,6 s): cada scroll dentro de los 4 s empuja la retención
const fire = (t) => (listeners[t] || []).slice().forEach((f) => f());
listeners.scroll = []; listeners.scrollend = [];
now += 10000; S.playSound('air-jump'); const fb = count('mat-focus');
now += 2200; fire('scroll'); now += 100; S.playSound('mat-focus');
ok(count('mat-focus') === fb, 'S-03: scroll que arranca a 2,2 s: escena retenida');
now += 300; fire('scroll'); now += 700; S.playSound('mat-focus');
ok(count('mat-focus') === fb, 'S-03: cada scroll empuja 0,9 s (scroll a 2,5 s, intento a 3,2 s: retenida)');
now += 300; S.playSound('mat-focus');
ok(count('mat-focus') === fb + 1, 'S-03: 0,9 s después del último scroll, la escena vuelve');
now += 2000; fire('scroll'); now += 100; S.playSound('mat-hinge'); const hb = count('mat-hinge');
ok(hb === 1, 'S-03: un scroll después de los 4 s del salto no retiene');
listeners.scroll = []; listeners.scrollend = [];

// F-01: el zumbido no arranca durante la retención de un salto, y el fundido de salida parte del volumen actual
const hum = () => count('mat-hum');
now += 10000; S.playSound('air-jump'); const h0 = hum();
for (let k = 0; k < 6; k++) { now += 90; S.loopSound('mat-hum', k % 2 === 0); }
ok(hum() === h0, 'F-01: durante el salto el hum no arranca (6 alternancias want → 0 arranques)');
now += 2000; listeners.scroll = []; listeners.scrollend = []; S.loopSound('mat-hum', true);
ok(hum() === h0 + 1, 'F-01: terminada la retención, el hum arranca una vez');
const hp = H.plays.findLast((x) => x.src === '/sounds/mat-hum.webm');
const hh = H.fades.length; // simular 150 ms del fundido de entrada: el hum va por 0,05
H.instances['/sounds/mat-hum.webm'].vols[hp.id] = 0.05;
S.loopSound('mat-hum', false);
const fo = H.fades.slice(hh).find((f) => f.src === '/sounds/mat-hum.webm' && f.to === 0);
ok(fo && Math.abs(fo.from - 0.05) < 1e-9, 'F-01: el fundido de salida parte del volumen actual (0,05), no de 0,2: from=' + (fo && fo.from));

// 9. pestaña oculta, angosto y reduced motion: silencio
const n0 = H.plays.length;
now += 5000; document.hidden = true; S.playSound('ui-click'); document.hidden = false;
now += 5000; width = 900; S.playSound('ui-click'); width = 1440;
now += 5000; reducedMQ = true; S.playSound('ui-click'); reducedMQ = false;
ok(H.plays.length === n0, 'oculta / < 1024 / reduced motion: 0 disparos');

// 10. restaurar la sesión no hace sonar ui-on
S.setSound(false); const on0 = count('ui-on'); S.restoreSound(); await tick(); await tick();
ok(count('ui-on') === on0, 'restaurar la sesión: ui-on no suena');
