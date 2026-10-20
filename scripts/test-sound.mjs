// Prueba de la lógica de src/lib/sound.ts en Node, con Howler simulado (node --test, corre en `npm test`):
// interruptor, carga (ui-on primero), densidad (P1/P2), gaps, variación, retención de los saltos (holdScene, S-03),
// el zumbido durante un salto (F-01), los silencios, y la tanda 1 de la auditoría de sonido (2026-10-20):
// A contexto suspendido sin gesto, B pestaña oculta, E ui-on antes que los loops, R apagado inmediato, L avisos.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(repo, 'package.json'));
const ts = require('typescript');
const src = fs.readFileSync(path.join(repo, 'src/lib/sound.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sound-test-'));

// Howler simulado: cada Howl registra disparos, volúmenes, fundidos y stops; emit() simula sus eventos (load, play…)
const MOCK = `
export const created = [];
export const plays = [];
export const fades = [];
export const stops = [];
export const instances = {};
export const Howler = {
  ctx: { state: 'running', resumes: 0, resume() { this.resumes++; return new Promise(() => {}); } },
  master: null, stopped: 0,
  volume(v) { this.master = v; },
  stop() { this.stopped++; },
};
export class Howl {
  constructor(o) { this.o = o; created.push(o.src[0]); this.n = 0; this.ev = {}; instances[o.src[0]] = this; }
  play() { const id = ++this.n; plays.push({ src: this.o.src[0], id, vol: null, rate: 1 }); return id; }
  volume(v, id) { this.vols ||= {}; if (id === undefined) return this.vols[v] ?? this.o.volume; this.vols[id] = v; const p = plays.findLast((x) => x.src === this.o.src[0] && x.id === id); if (p) p.vol = v; }
  rate(r, id) { const p = plays.findLast((x) => x.src === this.o.src[0] && x.id === id); if (p) p.rate = r; }
  fade(from, to, ms, id) { fades.push({ src: this.o.src[0], from, to, id }); this.vols ||= {}; this.vols[id] = from; }
  stop(id) { stops.push({ src: this.o.src[0], id }); }
  unload() {}
  once(ev, f) { (this.ev[ev] ||= []).push(f); return this; }
  emit(ev, ...a) { const o = this.o['on' + ev]; if (o) o(...a); const l = this.ev[ev] || []; this.ev[ev] = []; l.forEach((f) => f(...a)); }
}
export const inst = (n) => instances['/sounds/' + n + '.webm'];
`;

// entorno de navegador mínimo
let now = 0, width = 1440, reducedMQ = false;
const listeners = {};
const docListeners = {};
globalThis.window = globalThis;
globalThis.performance = { now: () => now };
globalThis.matchMedia = (q) => ({ matches: q.includes('reduced') ? reducedMQ : q.includes('min-width: 1024px') ? width >= 1024 : false });
globalThis.document = {
  hidden: false,
  addEventListener: (t, f) => { (docListeners[t] ||= []).push(f); },
  removeEventListener: (t, f) => { docListeners[t] = (docListeners[t] || []).filter((g) => g !== f); },
};
globalThis.sessionStorage = { s: {}, getItem(k) { return this.s[k] ?? null; }, setItem(k, v) { this.s[k] = v; } };
globalThis.addEventListener = (t, f) => { (listeners[t] ||= []).push(f); };
globalThis.removeEventListener = (t, f) => { listeners[t] = (listeners[t] || []).filter((g) => g !== f); };
const nav = { userActivation: { hasBeenActive: true } };
Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true, writable: true });

const fire = (t) => (listeners[t] || []).slice().forEach((f) => f());
const fireDoc = (t) => (docListeners[t] || []).slice().forEach((f) => f());
const tick = () => new Promise((r) => setImmediate(r));
const ticks = async (n = 4) => { for (let i = 0; i < n; i++) await tick(); };

/** sound.ts y Howler nuevos (estado de módulo limpio) */
let seq = 0;
async function fresh() {
  const k = ++seq;
  fs.writeFileSync(path.join(dir, `howler-mock-${k}.mjs`), MOCK);
  fs.writeFileSync(path.join(dir, `sound-${k}.mjs`), js.replace("import('howler')", `import('./howler-mock-${k}.mjs')`));
  for (const t of Object.keys(listeners)) delete listeners[t];
  for (const t of Object.keys(docListeners)) delete docListeners[t];
  sessionStorage.s = {}; document.hidden = false; width = 1440; reducedMQ = false; nav.userActivation = { hasBeenActive: true };

  const H = await import(pathToFileURL(path.join(dir, `howler-mock-${k}.mjs`)).href);
  const S = await import(pathToFileURL(path.join(dir, `sound-${k}.mjs`)).href);
  const count = (id) => H.plays.filter((p) => p.src === `/sounds/${id}.webm`).length;
  return { H, S, count };
}
/** encendido completo con clic: ui-on carga, suena, y el resto carga */
async function turnOn(H, S) {
  S.setSound(true); await ticks();
  H.inst('ui-on').emit('load'); await ticks();
  H.inst('ui-on').emit('play'); await ticks();
}

// ---------------------------------------------------------------------------------------------------------------
// Comportamiento base (las pruebas del set aprobado), en orden y sobre el mismo módulo
const base = await fresh();
const { H, S, count } = base;

test('apagado: 0 Howl creados, 0 disparos', () => {
  S.playSound('mat-focus'); S.loopSound('mat-hum', true);
  assert.equal(H.created.length, 0);
  assert.equal(H.plays.length, 0);
});

test('restaurar por debajo de 1024: 0 Howl creados', async () => {
  width = 800; sessionStorage.s['jpr-sound'] = '1'; S.restoreSound(); await ticks();
  assert.equal(H.created.length, 0);
  S.setSound(false); width = 1440;
});

test('E: encender carga ui-on primero, solo; el resto (15) cuando ui-on terminó de cargar', async () => {
  S.setSound(true); await ticks();
  assert.deepEqual(H.created, ['/sounds/ui-on.webm']);
  assert.deepEqual(H.inst('ui-on').o.src, ['/sounds/ui-on.webm', '/sounds/ui-on.m4a']);
  assert.equal(H.Howler.master, 0.25, 'MASTER 0,25 sin cambios');
  H.inst('ui-on').emit('load'); await ticks();
  assert.equal(H.created.length, 16);
  assert.equal(H.created[0], '/sounds/ui-on.webm');
  assert.equal(count('ui-on'), 1, 'ui-on suena una vez');
  H.inst('ui-on').emit('play');
});

test('P1 calla todo 250 ms', () => {
  now = 10000; S.playSound('sig-converge'); now += 100; S.playSound('ui-hover'); S.playSound('mat-focus');
  assert.ok(count('sig-converge') === 1 && count('ui-hover') === 0 && count('mat-focus') === 0);
  now += 200; S.playSound('ui-hover');
  assert.equal(count('ui-hover'), 1, 'pasados 250 ms, un P3 suena');
});

test('P2 calla P2 y P3 150 ms, pero no P1', () => {
  now = 20000; S.playSound('ui-open'); now += 50; S.playSound('ui-step'); S.playSound('mat-drum'); S.playSound('sig-dot');
  assert.ok(count('ui-step') === 0 && count('mat-drum') === 0 && count('sig-dot') === 1);
});

test('gap propio: mat-detent 90 ms (3 intentos en 100 ms → 2 disparos)', () => {
  now = 30000; S.playSound('mat-detent'); now += 50; S.playSound('mat-detent'); now += 50; S.playSound('mat-detent');
  assert.equal(count('mat-detent'), 2);
});

test('variación: rate/vol en rango, nunca idénticos seguidos; gain × 0,5; sig-ring sin variación', () => {
  const hv = []; for (let i = 0; i < 40; i++) { now += 500; S.playSound('ui-hover'); hv.push(H.plays.at(-1)); }
  assert.ok(hv.every((p) => p.rate >= 0.96 - 1e-9 && p.rate <= 1.04 + 1e-9 && p.vol >= 0.27 - 1e-9 && p.vol <= 0.33 + 1e-9), 'ui-hover: rate ±4 %, vol ±10 % de 0,30');
  assert.ok(hv.every((p, i) => i === 0 || p.rate !== hv[i - 1].rate), 'dos disparos seguidos nunca idénticos');
  now += 1000; S.playSound('mat-drum', { gain: 0.5 });
  assert.ok(Math.abs(H.plays.at(-1).vol - 0.225) < 1e-9, 'mat-drum con gain 0,5');
  now += 3000; S.playSound('sig-ring'); const r = H.plays.at(-1);
  assert.ok(r.vol === 0.6 && r.rate === 1);
});

test('salto: air-jump retiene la escena hasta scrollend + 0,9 s o 1,6 s; la interfaz sigue', () => {
  now = 100000; S.playSound('air-jump'); now += 300; S.playSound('mat-focus'); S.playSound('ui-click');
  assert.ok(count('mat-focus') === 0 && count('ui-click') > 0, 'escena retenida, la interfaz no');
  now += 1400; S.playSound('mat-focus'); assert.equal(count('mat-focus'), 1, 'la escena vuelve a 1,6 s');
  now += 2000; S.playSound('air-jump'); now += 300; fire('scrollend'); listeners.scrollend = []; S.playSound('sig-beat');
  assert.equal(count('sig-beat'), 0, 'recién terminado el scroll, escena retenida');
  now += 950; S.playSound('sig-beat');
  assert.equal(count('sig-beat'), 1, 'la escena vuelve a scrollend + 0,9 s');
  now += 3000; S.playSound('air-jump'); now += 1000; fire('scrollend'); listeners.scrollend = []; now += 800; S.playSound('mat-hinge');
  assert.equal(count('mat-hinge'), 0, 'salto largo: scrollend a 1 s + 0,8 s sigue retenido');
  now += 3000; S.playSound('air-jump'); now += 6000; fire('scrollend'); listeners.scrollend = []; now += 300; S.playSound('mat-focus');
  assert.equal(count('mat-focus'), 2, 'listener viejo de un salto sin scroll: no retiene 6 s después');
});

test('S-03: el scroll suave que arranca tarde sigue retenido; cada scroll empuja 0,9 s', () => {
  listeners.scroll = []; listeners.scrollend = [];
  now += 10000; S.playSound('air-jump'); const fb = count('mat-focus');
  now += 2200; fire('scroll'); now += 100; S.playSound('mat-focus');
  assert.equal(count('mat-focus'), fb);
  now += 300; fire('scroll'); now += 700; S.playSound('mat-focus');
  assert.equal(count('mat-focus'), fb);
  now += 300; S.playSound('mat-focus');
  assert.equal(count('mat-focus'), fb + 1);
  now += 2000; fire('scroll'); now += 100; S.playSound('mat-hinge');
  assert.equal(count('mat-hinge'), 1, 'un scroll después de los 4 s del salto no retiene');
  listeners.scroll = []; listeners.scrollend = [];
});

test('F-01: el zumbido no arranca durante un salto y el fundido de salida parte del volumen actual', () => {
  const hum = () => count('mat-hum');
  now += 10000; S.playSound('air-jump'); const h0 = hum();
  for (let k = 0; k < 6; k++) { now += 90; S.loopSound('mat-hum', k % 2 === 0); }
  assert.equal(hum(), h0, 'durante el salto el hum no arranca');
  now += 2000; listeners.scroll = []; listeners.scrollend = []; S.loopSound('mat-hum', true);
  assert.equal(hum(), h0 + 1, 'terminada la retención, arranca una vez');
  const hp = H.plays.findLast((x) => x.src === '/sounds/mat-hum.webm');
  const hh = H.fades.length;
  H.inst('mat-hum').vols[hp.id] = 0.05;
  S.loopSound('mat-hum', false);
  const fo = H.fades.slice(hh).find((f) => f.src === '/sounds/mat-hum.webm' && f.to === 0);
  assert.ok(fo && Math.abs(fo.from - 0.05) < 1e-9, 'from=' + (fo && fo.from));
});

test('pestaña oculta, angosto y reduced motion: 0 disparos', () => {
  const n0 = H.plays.length;
  now += 5000; document.hidden = true; S.playSound('ui-click'); document.hidden = false;
  now += 5000; width = 900; S.playSound('ui-click'); width = 1440;
  now += 5000; reducedMQ = true; S.playSound('ui-click'); reducedMQ = false;
  assert.equal(H.plays.length, n0);
});

test('restaurar la sesión no hace sonar ui-on', async () => {
  S.setSound(false); const on0 = count('ui-on'); S.restoreSound(); await ticks();
  assert.equal(count('ui-on'), on0);
  S.setSound(false);
});

// ---------------------------------------------------------------------------------------------------------------
// A (T-01, I-01): con el AudioContext suspendido y sin gesto todavía (recarga o cambio EN/ES con el sonido
// encendido), lo que llega se descarta: no se encola para soltarse junto en el primer clic.

test('A: contexto suspendido sin gesto: los disparos y el loop se descartan (no llegan a Howler) y se pide resume', async () => {
  const { H, S, count } = await fresh();
  nav.userActivation = { hasBeenActive: false };
  H.Howler.ctx.state = 'suspended';
  sessionStorage.s['jpr-sound'] = '1'; S.restoreSound(); await ticks();
  H.inst('ui-on').emit('load'); await ticks();
  assert.equal(H.created.length, 16);
  for (const n of ['mat-focus', 'sig-beat', 'mat-hinge', 'sig-ring', 'ui-hover']) { now += 3000; S.playSound(n); }
  now += 3000; S.loopSound('mat-hum', true); now += 16; S.loopSound('mat-hum', true);
  assert.equal(H.plays.length, 0, 'ningún play() en Howler: nada queda encolado');
  assert.ok(H.Howler.ctx.resumes >= 1, 'pidió ctx.resume()');
  // primer gesto: Howler desbloquea el contexto. Suena sólo lo que llega desde ahí, de a uno
  nav.userActivation = { hasBeenActive: true }; H.Howler.ctx.state = 'running';
  now += 3000; S.playSound('mat-focus');
  assert.equal(H.plays.length, 1);
  assert.equal(count('mat-focus'), 1);
  now += 16; S.loopSound('mat-hum', true);
  assert.equal(count('mat-hum'), 1, 'el zumbido arranca recién con el contexto corriendo');
});

test('A: contexto suspendido por Howler tras 30 s de silencio (con gesto previo): el disparo no se descarta', async () => {
  const { H, S, count } = await fresh();
  await turnOn(H, S);
  H.Howler.ctx.state = 'suspended';   // autoSuspend de Howler: lo reanuda él mismo en play()
  now += 3000; S.playSound('ui-click');
  assert.equal(count('ui-click'), 1);
});

// ---------------------------------------------------------------------------------------------------------------
// B (V-01, T-03, I-07): con la pestaña oculta, silencio total. sound.ts funde y corta los loops en
// visibilitychange y, al volver, retoma los que su dueño sigue pidiendo.

test('B: pestaña oculta: fundido y stop del zumbido; oculta no arranca; al volver se retoma', async () => {
  const { H, S, count } = await fresh();
  await turnOn(H, S);
  now += 3000; S.loopSound('mat-hum', true);
  assert.equal(count('mat-hum'), 1);
  const id = H.plays.findLast((p) => p.src === '/sounds/mat-hum.webm').id;
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    document.hidden = true; fireDoc('visibilitychange');
    assert.ok(H.fades.some((f) => f.src === '/sounds/mat-hum.webm' && f.id === id && f.to === 0), 'fundido a 0');
    mock.timers.tick(500);
    assert.ok(H.stops.some((s) => s.src === '/sounds/mat-hum.webm' && s.id === id), 'stop del loop');
    now += 16; S.loopSound('mat-hum', true);
    assert.equal(count('mat-hum'), 1, 'con la pestaña oculta el loop no arranca');
    document.hidden = false; fireDoc('visibilitychange');
    assert.equal(count('mat-hum'), 2, 'al volver se retoma');
    const back = H.fades.findLast((f) => f.src === '/sounds/mat-hum.webm');
    assert.ok(back.from === 0 && Math.abs(back.to - 0.2) < 1e-9, 'vuelve con fundido de entrada al volumen del set (0,2)');
  } finally { mock.timers.reset(); }
});

test('B: si el dueño suelta el loop con la pestaña oculta, al volver no se retoma', async () => {
  const { H, S, count } = await fresh();
  await turnOn(H, S);
  now += 3000; S.loopSound('mat-hum', true);
  document.hidden = true; fireDoc('visibilitychange');
  S.loopSound('mat-hum', false);
  document.hidden = false; fireDoc('visibilitychange');
  assert.equal(count('mat-hum'), 1);
});

// ---------------------------------------------------------------------------------------------------------------
// E (V-03, I-10, T-04): la confirmación de encendido va primero; ningún loop antes de que suene ui-on.

test('E: con el clic de encendido, el zumbido no arranca hasta que ui-on suena', async () => {
  const { H, S, count } = await fresh();
  S.setSound(true); await ticks();
  H.inst('ui-on').emit('load'); await ticks();
  assert.equal(count('ui-on'), 1, 'ui-on pedido');
  now += 3000; S.loopSound('mat-hum', true); now += 16; S.loopSound('mat-hum', true);
  assert.equal(count('mat-hum'), 0, 'antes del play de ui-on: sin zumbido');
  H.inst('ui-on').emit('play');
  now += 16; S.loopSound('mat-hum', true);
  assert.equal(count('mat-hum'), 1, 'después de ui-on: el zumbido arranca');
});

test('E: al restaurar la sesión (sin ui-on) los loops no esperan', async () => {
  const { H, S, count } = await fresh();
  sessionStorage.s['jpr-sound'] = '1'; S.restoreSound(); await ticks();
  H.inst('ui-on').emit('load'); await ticks();
  now += 3000; S.loopSound('mat-hum', true);
  assert.equal(count('ui-on'), 0);
  assert.equal(count('mat-hum'), 1);
});

test('E + L: si ui-on no carga, avisa en consola, el resto se crea igual y los loops no quedan trabados', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const { H, S, count } = await fresh();
  S.setSound(true); await ticks();
  H.inst('ui-on').emit('loaderror', 1, 'Decoding audio data failed.');
  await ticks();
  assert.equal(H.created.length, 16);
  assert.ok(warn.mock.calls.some((c) => String(c.arguments[0]).includes('ui-on')), 'console.warn con el id');
  now += 3000; S.loopSound('mat-hum', true);
  assert.equal(count('mat-hum'), 1);
});

// ---------------------------------------------------------------------------------------------------------------
// R (I-12): apagar corta lo que está sonando. L (T-06): errores avisados por id.

test('R: apagar el interruptor llama a Howler.stop() y suelta los loops; al reencender, el zumbido vuelve', async () => {
  const { H, S, count } = await fresh();
  await turnOn(H, S);
  now += 3000; S.loopSound('mat-hum', true);
  S.setSound(false);
  assert.equal(H.Howler.stopped, 1);
  S.setSound(true); await ticks(); H.inst('ui-on').emit('play');
  now += 3000; S.loopSound('mat-hum', true);
  assert.equal(count('mat-hum'), 2);
});

test('L: onloaderror y onplayerror de cualquier sonido avisan en consola con su id', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const { H, S } = await fresh();
  await turnOn(H, S);
  H.inst('mat-hinge').emit('loaderror', 1, 'x');
  H.inst('sig-dot').emit('playerror', 2, 'y');
  const msgs = warn.mock.calls.map((c) => c.arguments.join(' '));
  assert.ok(msgs.some((m) => m.includes('mat-hinge')));
  assert.ok(msgs.some((m) => m.includes('sig-dot')));
});
