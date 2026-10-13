/* Sonido del sitio: un solo interruptor para todas las secciones (SoundToggle.tsx lo maneja).
   Apagado por defecto en cada visita; la elección dura la sesión (sessionStorage: sobrevive al cambio EN/ES).
   Con prefers-reduced-motion no suena nada y el interruptor no se muestra.
   Howler 2.2.4 se importa recién la primera vez que se enciende: quien nunca lo enciende no baja ni un byte.
   Uso desde cualquier sección: playSound('focus', { rate }). Para sumar sonidos, agregalos a SOUNDS. */

import type { Howl } from 'howler';

const SOUNDS = {
  // motor de enfoque (rack focus): 0,26 s, sintetizado para la maqueta A (tools-focus-sound.mjs)
  focus: { src: '/sounds/focus.wav', volume: 0.55 },
  // vitrina de Projects (assets-src/sounds/gen-vitrina-sounds.mjs): golpe del cenital, clic de bisagra, zumbido
  spot: { src: '/sounds/spot.wav', volume: 0.5 },
  hinge: { src: '/sounds/hinge.wav', volume: 0.35 },
  hum: { src: '/sounds/hum.wav', volume: 0.07, loop: true },
} as const;
export type SoundName = keyof typeof SOUNDS;

const KEY = 'jpr-sound';
let on = false;
let loaded: Partial<Record<SoundName, Howl>> = {};
let loading: Promise<void> | null = null;
const subs = new Set<(on: boolean) => void>();
const last: Partial<Record<SoundName, number>> = {};

const reduced = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function load() {
  if (loading) return loading;
  loading = import('howler').then(({ Howl }) => {
    (Object.keys(SOUNDS) as SoundName[]).forEach((n) => {
      const s = SOUNDS[n] as { src: string; volume: number; loop?: boolean };
      loaded[n] = new Howl({ src: [s.src], volume: s.volume, loop: !!s.loop, preload: true });
    });
  }).catch(() => { loading = null; });
  return loading;
}

export function soundOn() { return on && !reduced(); }

export function setSound(v: boolean) {
  if (reduced()) v = false;
  if (v === on) return;
  on = v;
  try { sessionStorage.setItem(KEY, v ? '1' : '0'); } catch { /* modo privado */ }
  if (v) load();
  subs.forEach((f) => f(v));
}

/** Estado guardado de la sesión (lo lee SoundToggle al montar). */
export function restoreSound() {
  try { if (sessionStorage.getItem(KEY) === '1') setSound(true); } catch { /* noop */ }
  return on;
}

export function onSound(f: (on: boolean) => void) {
  subs.add(f);
  return () => { subs.delete(f); };
}

/** Suena sólo con el interruptor encendido. minGap: ms mínimos entre dos disparos del mismo sonido. */
export function playSound(name: SoundName, opts: { rate?: number; minGap?: number } = {}) {
  if (!soundOn()) return;
  const h = loaded[name];
  if (!h) { load(); return; }
  const now = performance.now();
  if (now - (last[name] ?? -1e9) < (opts.minGap ?? 280)) return;
  last[name] = now;
  const id = h.play();
  if (opts.rate) h.rate(opts.rate, id);
}

/** Sonido en loop (zumbido): suena mientras `want` y el interruptor estén encendidos; entra y sale con fundido corto. */
const looping: Partial<Record<SoundName, number>> = {};
export function loopSound(name: SoundName, want: boolean) {
  const h = loaded[name];
  const id = looping[name];
  const v = SOUNDS[name].volume;
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
