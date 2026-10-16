/* Sonido del sitio: un solo interruptor para todas las secciones (SoundToggle.tsx lo maneja).
   Apagado por defecto en cada visita; la elección dura la sesión (sessionStorage: sobrevive al cambio EN/ES).
   Silencio total con reduced motion, por debajo de 1024 px (allí no hay interruptor) y con la pestaña oculta.
   Howler 2.2.4 se importa recién la primera vez que se enciende: quien nunca lo enciende no baja ni un byte.
   Paleta «Señal» (2026-10-15, contenido/2026-10-15-sfx/paleta-sonora.md y mapa-gesto-sonido.md): 4 familias
   (ui- interfaz seca, air- aire, sig- señal eléctrica, mat- materia), cada archivo en .webm (Opus) y .m4a (respaldo).
   Uso desde cualquier sección: playSound('mat-focus', { rate }). Todo lo que suena pasa por acá. */

import type { Howl } from 'howler';

type Def = {
  vol: number;               // volume de Howler (el archivo ya viene normalizado a su familia)
  gap: number;               // ms mínimos entre dos disparos del mismo sonido
  prio: 1 | 2 | 3;           // regla de densidad: P1 calla todo 250 ms; P2 calla P2 y P3 150 ms; P3 sólo su gap
  scene?: boolean;           // lo dispara el scroll de la escena: se retiene durante un salto (holdScene)
  vary?: [number, number];   // variación por disparo: rate × [1−a, 1+a] y volumen × [1−b, 1+b]
  hold?: number;             // salto programático: retiene la escena hasta scrollend o estos ms
  loop?: boolean;            // lecho (zumbido): loopSound, no bloquea ni es bloqueado
};

/* Volúmenes: un solo número por id. ui-, air- y sig-: finales del director (volumenes-finales.md, 2026-10-15);
   mat-: los del mapa hasta que cierre D3. */
const SOUNDS = {
  // materia: lente, cenital, bisagra, tambor, zumbido
  'mat-focus': { vol: 0.35, gap: 280, prio: 2, scene: true, vary: [0.02, 0.1] },     // rack focus en cada cambio de modo
  'mat-spot': { vol: 0.55, gap: 400, prio: 1, scene: true, vary: [0.03, 0.08] },     // el cenital se enciende
  'mat-hinge': { vol: 0.4, gap: 300, prio: 2, scene: true, vary: [0.03, 0.08] },     // la tapa termina de cerrarse
  'mat-hum': { vol: 0.2, gap: 0, prio: 3, loop: true },                               // zumbido de la laptop encendida
  'mat-drum': { vol: 0.45, gap: 150, prio: 2, vary: [0.03, 0] },                      // el Tambor empieza a girar
  'mat-detent': { vol: 0.3, gap: 90, prio: 3, vary: [0.04, 0.1] },                    // una cara encastra al frente
  // aire: la cámara entre secciones
  'air-section': { vol: 0.45, gap: 1500, prio: 1, scene: true, vary: [0.02, 0] },    // entrada a Video, Stack, Experience
  'air-jump': { vol: 0.4, gap: 800, prio: 1, vary: [0.02, 0], hold: 1600 },           // salto del menú, logo, volver arriba
  // señal eléctrica: la línea roja
  'sig-ring': { vol: 0.6, gap: 1500, prio: 1, scene: true },                          // la señal abre el anillo del Tambor
  'sig-beat': { vol: 0.53, gap: 600, prio: 1, scene: true, vary: [0.02, 0.08] },     // latido-rol del ECG
  'sig-converge': { vol: 0.6, gap: 2000, prio: 1, scene: true },                      // todo converge en Contact
  'sig-dot': { vol: 0.55, gap: 400, prio: 1, vary: [0.02, 0] },                       // presionar el punto de Contact
  // interfaz seca: la mano sobre el equipo
  'ui-hover': { vol: 0.3, gap: 120, prio: 3, vary: [0.04, 0.1] },                     // puntero sobre un CTA primario
  'ui-click': { vol: 0.45, gap: 120, prio: 3, vary: [0.03, 0.08] },                   // pausa, sonido del video, copiar, CV
  'ui-open': { vol: 0.45, gap: 250, prio: 2, vary: [0.02, 0] },                       // abre un caso, un visor o el menú
  'ui-close': { vol: 0.45, gap: 250, prio: 2, vary: [0.02, 0] },                      // los cierra
  'ui-step': { vol: 0.45, gap: 90, prio: 3, vary: [0.03, 0.08] },                     // paso en un visor de screens
  'ui-on': { vol: 0.45, gap: 1000, prio: 2 },                                         // se enciende el interruptor
} satisfies Record<string, Def>;
export type SoundName = keyof typeof SOUNDS;
const def = (n: SoundName): Def => SOUNDS[n];

const KEY = 'jpr-sound';
let on = false;
let loaded: Partial<Record<SoundName, Howl>> = {};
let loading: Promise<void> | null = null;
const subs = new Set<(on: boolean) => void>();
const last: Partial<Record<SoundName, number>> = {};
const lastJit: Partial<Record<SoundName, number>> = {};
let lastP1 = -1e9, lastP2 = -1e9, holdUntil = 0;

const reduced = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide = () => typeof window !== 'undefined' && matchMedia('(min-width: 1024px)').matches;

function load() {
  if (loading) return loading;
  loading = import('howler').then(({ Howl }) => {
    (Object.keys(SOUNDS) as SoundName[]).forEach((n) => {
      const s = def(n);
      loaded[n] = new Howl({ src: [`/sounds/${n}.webm`, `/sounds/${n}.m4a`], volume: s.vol, loop: !!s.loop, preload: true });
    });
  }).catch(() => { loading = null; });
  return loading;
}

export function soundOn() { return on && !reduced() && wide(); }

/** chime: suena `ui-on` al terminar de cargar (sólo con el clic en el interruptor, no al restaurar la sesión). */
export function setSound(v: boolean, chime = true) {
  if (reduced()) v = false;
  if (v === on) return;
  on = v;
  try { sessionStorage.setItem(KEY, v ? '1' : '0'); } catch { /* modo privado */ }
  if (v) load().then(() => { if (chime && on) playSound('ui-on'); });
  subs.forEach((f) => f(v));
}

/** Estado guardado de la sesión (lo lee SoundToggle al montar). */
export function restoreSound() {
  try { if (sessionStorage.getItem(KEY) === '1') setSound(true, false); } catch { /* noop */ }
  return on;
}

export function onSound(f: (on: boolean) => void) {
  subs.add(f);
  return () => { subs.delete(f); };
}

/** Retiene los sonidos de escena mientras viaja un scroll suave (hasta scrollend o, como máximo, `ms`). */
export function holdScene(ms: number) {
  holdUntil = performance.now() + ms;
  addEventListener('scrollend', () => { holdUntil = 0; }, { once: true });
}

/** variación por disparo en [−1, 1], nunca pegada a la anterior: dos disparos seguidos nunca suenan idénticos */
function jitter(n: SoundName) {
  let j = Math.random() * 2 - 1;
  if (Math.abs(j - (lastJit[n] ?? 9)) < 0.3) j = j > 0 ? j - 0.6 : j + 0.6;
  lastJit[n] = j;
  return j;
}

/** Suena sólo con el interruptor encendido, respetando el gap del id y la regla de densidad (lo bloqueado se
    descarta, no se encola). rate: pitch base del gesto; gain: multiplicador (× 0,5 en el Tambor con su video sonando). */
export function playSound(name: SoundName, opts: { rate?: number; gain?: number } = {}) {
  if (!soundOn() || document.hidden) return;
  const s = def(name);
  if (s.loop) return;
  if (s.hold) holdScene(s.hold);
  const h = loaded[name];
  if (!h) { load(); return; }
  const now = performance.now();
  if (now - (last[name] ?? -1e9) < s.gap) return;
  if (s.scene && now < holdUntil) return;
  if (now - lastP1 < 250) return;
  if (s.prio > 1 && now - lastP2 < 150) return;
  last[name] = now;
  if (s.prio === 1) lastP1 = now; else if (s.prio === 2) lastP2 = now;
  const [a, b] = s.vary ?? [0, 0];
  const j = a || b ? jitter(name) : 0;
  const id = h.play();
  h.volume(s.vol * (opts.gain ?? 1) * (1 + b * j), id);
  const r = (opts.rate ?? 1) * (1 + a * j);
  if (r !== 1) h.rate(r, id);
}

/** Sonido en loop (zumbido): suena mientras `want` y el interruptor estén encendidos; entra y sale con fundido corto. */
const looping: Partial<Record<SoundName, number>> = {};
export function loopSound(name: SoundName, want: boolean) {
  const h = loaded[name];
  const id = looping[name];
  const v = def(name).vol;
  if (want && soundOn()) {
    if (!h) { load(); return; }
    if (id === undefined) { const nid = h.play(); h.volume(0, nid); h.fade(0, v, 600, nid); looping[name] = nid; }
  } else if (h && id !== undefined) {
    h.fade(v, 0, 400, id);
    const stopId = id;
    setTimeout(() => h.stop(stopId), 420);
    delete looping[name];
  }
}

/** Para los tests/QA: libera los Howl (no hace falta en uso normal). */
export function unloadSounds() {
  Object.values(loaded).forEach((h) => h?.unload());
  loaded = {};
  loading = null;
}
