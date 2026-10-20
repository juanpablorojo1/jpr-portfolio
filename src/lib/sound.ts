/* Sonido del sitio: un solo interruptor para todas las secciones (SoundToggle.tsx lo maneja).
   Apagado por defecto en cada visita; la elección dura la sesión (sessionStorage: sobrevive al cambio EN/ES).
   Silencio total con reduced motion, por debajo de 1024 px (allí no hay interruptor) y con la pestaña oculta.
   Howler 2.2.4 se importa recién la primera vez que se enciende: quien nunca lo enciende no baja ni un byte.
   Paleta «Señal» (2026-10-15, contenido/2026-10-15-sfx/paleta-sonora.md y mapa-gesto-sonido.md): 4 familias
   (ui- interfaz seca, air- aire, sig- señal eléctrica, mat- materia), cada archivo en .webm (Opus) y .m4a (respaldo).
   Uso desde cualquier sección: playSound('mat-focus', { rate }). Todo lo que suena pasa por acá. */

import type { Howl, Howler as HowlerGlobal } from 'howler';

type Def = {
  vol: number;               // volume de Howler (el archivo ya viene normalizado a su familia)
  gap: number;               // ms mínimos entre dos disparos del mismo sonido
  prio: 1 | 2 | 3;           // regla de densidad: P1 calla todo 250 ms; P2 calla P2 y P3 150 ms; P3 sólo su gap
  scene?: boolean;           // lo dispara el scroll de la escena: se retiene durante un salto (holdScene)
  vary?: [number, number];   // variación por disparo: rate × [1−a, 1+a] y volumen × [1−b, 1+b]
  hold?: number;             // salto programático: retiene la escena hasta scrollend + 0,9 s (o estos ms sin scrollend)
  loop?: boolean;            // lecho (zumbido): loopSound, no bloquea ni es bloqueado
};

/* Volúmenes: un solo número por id; los 16 son los finales del director (volumenes-finales.md, 2026-10-15).
   Sin mat-spot: «No me gustan los golpes al llegar a las laptop, sacalos» (Juan, 2026-10-15).
   Sin air-section: la entrada a Video, Stack y Experience no suena («air-section: sin sonido», Juan, 2026-10-15). */
const SOUNDS = {
  // materia: lente, cenital, bisagra, tambor, zumbido
  'mat-focus': { vol: 0.35, gap: 280, prio: 2, scene: true, vary: [0.02, 0.1] },     // rack focus en cada cambio de modo
  'mat-hinge': { vol: 0.5, gap: 300, prio: 2, scene: true, vary: [0.03, 0.08] },     // la tapa termina de cerrarse
  'mat-hum': { vol: 0.2, gap: 0, prio: 3, loop: true },                               // zumbido de la laptop encendida
  'mat-drum': { vol: 0.45, gap: 150, prio: 2, vary: [0.03, 0] },                      // el Tambor empieza a girar
  'mat-detent': { vol: 0.55, gap: 90, prio: 3, vary: [0.04, 0.1] },                    // una cara encastra al frente
  // aire: la cámara entre secciones
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

/** Volumen general del sitio, sobre la mezcla del director (Juan, 2026-10-17: «Necesito reducir el volumen de los sfx»). 0,25 = −12 dB (2026-10-17: «mas»). */
const MASTER = 0.25;

const KEY = 'jpr-sound';
let on = false;
let loaded: Partial<Record<SoundName, Howl>> = {};
let loading: Promise<void> | null = null;
const subs = new Set<(on: boolean) => void>();
const last: Partial<Record<SoundName, number>> = {};
const lastJit: Partial<Record<SoundName, number>> = {};
let lastP1 = -1e9, lastP2 = -1e9, holdUntil = 0;
let H: typeof HowlerGlobal | null = null;
let visArmed = false, resumeAsked = false;
/** E (auditoría 2026-10-20): con el clic de encendido, ningún loop arranca antes de que suene ui-on */
let loopGate = true;

const reduced = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide = () => typeof window !== 'undefined' && matchMedia('(min-width: 1024px)').matches;

/** A (T-01): AudioContext suspendido y sin gesto todavía en este documento (recarga o cambio EN/ES con el sonido
    encendido). Howler encolaría cada play() hasta el primer clic y los soltaría todos juntos: lo bloqueado se descarta
    (paleta-sonora.md:19) y se pide resume una vez. Con gesto previo, el contexto lo suspendió Howler tras 30 s de
    silencio (autoSuspend) y lo reanuda él mismo en play(): ese disparo no se descarta. */
function blocked() {
  const c = H?.ctx;
  if (!c || c.state === 'running') return false;
  if (navigator.userActivation?.hasBeenActive) return false;
  if (!resumeAsked) { resumeAsked = true; c.resume().catch(() => { /* lo desbloquea Howler con el primer gesto */ }); }
  return true;
}

function load() {
  if (loading) return loading;
  loading = import('howler').then(({ Howl, Howler }) => {
    H = Howler;
    Howler.volume(MASTER);
    if (!visArmed) { visArmed = true; document.addEventListener('visibilitychange', onVisibility); }
    // L (T-06): los errores de carga y de reproducción se avisan en consola, por id
    const make = (n: SoundName, onload?: () => void) => {
      const s = def(n);
      loaded[n] = new Howl({
        src: [`/sounds/${n}.webm`, `/sounds/${n}.m4a`], volume: s.vol, loop: !!s.loop, preload: true, onload,
        onloaderror: (_id, e) => { console.warn(`[sound] ${n}: no cargó`, e); if (n === 'ui-on') { loopGate = true; onload?.(); } },
        onplayerror: (_id, e) => { console.warn(`[sound] ${n}: no sonó`, e); if (n === 'ui-on') loopGate = true; },
      });
    };
    // E: ui-on primero y solo; el resto, cuando ui-on terminó de cargar (o falló)
    let rest = false;
    make('ui-on', () => {
      if (rest) return;
      rest = true;
      (Object.keys(SOUNDS) as SoundName[]).forEach((n) => { if (n !== 'ui-on') make(n); });
    });
  }).catch(() => { loading = null; });
  return loading;
}

/** E: suena ui-on y abre los loops recién cuando arrancó (si no llega a sonar, los abre igual) */
function chime() {
  const h = loaded['ui-on'];
  if (h && playSound('ui-on')) h.once('play', () => { loopGate = true; });
  else loopGate = true;
}

export function soundOn() { return on && !reduced() && wide(); }

/** withChime: suena `ui-on` al terminar de cargar (sólo con el clic en el interruptor, no al restaurar la sesión). */
export function setSound(v: boolean, withChime = true) {
  if (reduced()) v = false;
  if (v === on) return;
  on = v;
  try { sessionStorage.setItem(KEY, v ? '1' : '0'); } catch { /* modo privado */ }
  if (v && wide()) {                                    // angosto: carga recién al ensanchar (playSound)
    if (withChime) loopGate = false;
    load().then(() => { if (withChime && on) chime(); else loopGate = true; });
  }
  // R (I-12): apagar corta lo que está sonando (air-jump, sig-converge, el zumbido); los loops se sueltan
  if (!v && H) { H.stop(); (Object.keys(looping) as SoundName[]).forEach((n) => { delete looping[n]; }); }
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

/** Retiene los sonidos de escena mientras viaja un scroll suave: hasta scrollend más 0,9 s, lo que tarda en llegar la
    cámara amortiguada (CAM_LAMBDA 4 en scene.js, ~0,25 s de constante: sin esa cola, al llegar sonaban los cambios de
    modo que la cámara cruzaba detrás del scroll). Sin scrollend (no hubo scroll, o Safari viejo), `ms`. Durante 4 s,
    cada scroll también la empuja: un scroll suave que arranca tarde no queda sin retención (design-critic S-03). */
export function holdScene(ms: number) {
  const t0 = performance.now();
  holdUntil = t0 + ms;
  const push = () => { const t = performance.now(); if (t - t0 < 4000) holdUntil = Math.max(holdUntil, t + 900); };
  addEventListener('scroll', push, { passive: true });
  setTimeout(() => removeEventListener('scroll', push), 4000);
  // un salto que no scrolleó deja el listener armado: el scrollend de un scroll propio, más tarde, no retiene nada
  addEventListener('scrollend', () => { const t = performance.now(); if (t - t0 < 4000) holdUntil = t + 900; }, { once: true });
}

/** variación por disparo en [−1, 1], nunca pegada a la anterior: dos disparos seguidos nunca suenan idénticos */
function jitter(n: SoundName) {
  let j = Math.random() * 2 - 1;
  if (Math.abs(j - (lastJit[n] ?? 9)) < 0.3) j = j > 0 ? j - 0.6 : j + 0.6;
  lastJit[n] = j;
  return j;
}

/** Suena sólo con el interruptor encendido, respetando el gap del id y la regla de densidad (lo bloqueado se
    descarta, no se encola). rate: pitch base del gesto; gain: multiplicador (× 0,5 en el Tambor con su video sonando).
    Devuelve si sonó. */
export function playSound(name: SoundName, opts: { rate?: number; gain?: number } = {}) {
  if (!soundOn() || document.hidden) return false;
  const s = def(name);
  if (s.loop) return false;
  if (s.hold) holdScene(s.hold);
  const h = loaded[name];
  if (!h) { load(); return false; }
  const now = performance.now();
  if (now - (last[name] ?? -1e9) < s.gap) return false;
  if (s.scene && now < holdUntil) return false;
  if (now - lastP1 < 250) return false;
  if (s.prio > 1 && now - lastP2 < 150) return false;
  if (blocked()) return false;
  last[name] = now;
  if (s.prio === 1) lastP1 = now; else if (s.prio === 2) lastP2 = now;
  const [a, b] = s.vary ?? [0, 0];
  const j = a || b ? jitter(name) : 0;
  const id = h.play();
  h.volume(s.vol * (opts.gain ?? 1) * (1 + b * j), id);
  const r = (opts.rate ?? 1) * (1 + a * j);
  if (r !== 1) h.rate(r, id);
  return true;
}

/** Sonido en loop (zumbido): suena mientras `want` y el interruptor estén encendidos; entra y sale con fundido corto.
    No arranca durante la retención de un salto (la cámara cruza estadías de paso: arrancaba y cortaba ~6 veces en
    0,5 s, functional-tester F-01) y sale del volumen que tenga, no del pleno. Tampoco arranca con la pestaña oculta,
    con el contexto bloqueado (A) ni antes de que suene ui-on (E). `wanted` guarda lo último que pidió su dueño. */
const looping: Partial<Record<SoundName, number>> = {};
const wanted: Partial<Record<SoundName, boolean>> = {};
export function loopSound(name: SoundName, want: boolean) {
  wanted[name] = want;
  const h = loaded[name];
  const id = looping[name];
  const v = def(name).vol;
  if (want && soundOn() && !document.hidden) {
    if (!h) { load(); return; }
    if (id !== undefined || !loopGate || performance.now() < holdUntil || blocked()) return;
    const nid = h.play(); h.volume(0, nid); h.fade(0, v, 600, nid); looping[name] = nid;
  } else if (h && id !== undefined) {
    h.fade(h.volume(id) as number, 0, 400, id);
    const stopId = id;
    setTimeout(() => h.stop(stopId), 420);
    delete looping[name];
  }
}

/** B (V-01, T-03): con la pestaña oculta, silencio total. Fundido y stop de los loops; al volver, se retoman los que su
    dueño sigue pidiendo (si los soltó mientras tanto, no). */
function onVisibility() {
  (Object.keys(wanted) as SoundName[]).forEach((n) => { if (wanted[n]) loopSound(n, true); });
}

/** Para los tests/QA: libera los Howl (no hace falta en uso normal). */
export function unloadSounds() {
  Object.values(loaded).forEach((h) => h?.unload());
  loaded = {};
  loading = null;
}
