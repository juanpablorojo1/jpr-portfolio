/* «Señal»: modelo compartido del latido (port de la maqueta a-senal/signal.js, sin cambios de números).
   Lo usan el intro en HTML/2D (hero-controller.ts, desde el primer frame) y la escena 3D (scene.js, cuando está lista).
   Un solo reloj, un solo buffer de muestras, funciones puras del tiempo → el crossfade 2D→3D no salta.
   Una instancia por montaje del hero (StrictMode monta dos veces en dev). */

export type SenalGeom = {
  m: boolean; fov: number; horizon: number; hT: number; h0: number;
  halfWFrac: number; amp: number; pxPerUnit: number; coreHalf: number;
};

/** cam: progreso de la cámara 3D (0 tope, 1 aterrizaje del About), con su damp; lo escribe scene.js en cada frame.
    −1 sin escena. El About dispara su texto con esto: la línea 3D depende de cam, no del scroll.
    gal: progreso de la galería de Projects (viewports desde el aterrizaje del About, con el mismo damp; gallery.ts).
    −1 sin escena. */
export type SenalState = { t: number; p: number; pTarget: number; vel: number; lastScroll: number; cam: number; gal: number };

export type Senal = {
  params: URLSearchParams;
  N: number; SPEED: number; PERIOD: number; T_START: number; FIRST_R_AT: number; T_R0: number;
  CAM_Z: number; TRACE_Z: number;
  geom: (w: number, h: number) => SenalGeom;
  t0: number;
  now: () => number;
  ecg: (t: number) => number;
  lastR: (t: number) => number;
  pulse: (t: number) => number;
  ign: (t: number) => number;
  dolly: (t: number) => number;
  headAlpha: (t: number) => number;
  smooth: (e0: number, e1: number, x: number) => number;
  damp: (a: number, b: number, l: number, dt: number) => number;
  val: Float32Array; wrote: Float32Array; headS: number;
  write: (t: number, vel?: number) => boolean;
  bright: (i: number, t: number) => number;
  state: SenalState;
  handoff: boolean;
  dead: boolean;
  goStatic: (reason?: string) => void;
  onLive: () => void;
  /** false cuando lo que sigue al hero lo tapa entero (hero-controller, IntersectionObserver): los loops se pausan. */
  inView: boolean;
  onView: (v: boolean) => void;
  watchdog?: { remaining: () => number; running: () => boolean };
  /** Projects «negatoscopio»: lo comparten el HTML (ProjectsGallery.tsx) y la escena (corridor.js).
      tags: los rótulos en el espacio (la escena les escribe el transform en el mismo frame del render).
      open: caso abierto (−1 ninguno; lo escribe el HTML, la cámara empuja hacia la placa).
      hover: placa bajo el puntero (−1 ninguna; lo escribe la escena). live: el pasillo está armado y se dibuja.
      paused: el usuario pausó el video demo de las placas (HTML; plate-video.js lo respeta, WCAG 2.2.2). */
  neg: { tags: HTMLElement[]; open: number; hover: number; live: boolean; paused: boolean };
  /** Frame by Frame «sala de proyección»: lo comparten el HTML (VideosStage.tsx) y la escena (projector.js).
      tags: los rótulos de cada pantalla (la escena les escribe un parallax leve en el mismo frame del render).
      active: pantalla con el haz encima (−1 ninguna; escena). hover: pantalla bajo el puntero (−1; escena).
      paused: el usuario pausó la vista previa muda (HTML). open: video abierto en el diálogo (−1; HTML): la vista
      previa se pausa. live: la sala está armada y se dibuja (escena). */
  fbf: { tags: HTMLElement[]; active: number; hover: number; paused: boolean; open: number; live: boolean };
  /** Stack «la red por capas»: lo comparten el HTML (StackStage.tsx) y la escena (network.js).
      items: los rótulos de cada capa (uno por nodo con nombre; la escena les escribe la posición y data-on en el
      mismo frame del render). active: capa en estadía (−1 ninguna; escena). live: la red está armada y se dibuja. */
  stk: { items: HTMLElement[][]; active: number; live: boolean };
  /** Experience «el electrocardiograma vertical»: lo comparten el HTML (ExperienceStage.tsx) y la escena (ecg.js).
      v0: u en que la sección entra por abajo (la mide el HTML; NaN sin sección). counts: roles, educación y
      reconocimientos (messages experience.*). tags: un ancla por latido con rótulo (roles, educación,
      reconocimientos, en ese orden): la escena le escribe la posición de su tick en el mismo frame del render.
      box: ancho y alto de cada rótulo en px (los mide el HTML), para que la escena no lo saque del cuadro. live: la
      traza está armada y se dibuja (escena). */
  exp: { v0: number; counts: [number, number, number]; tags: HTMLElement[]; box: Array<{ w: number; h: number }>; live: boolean };
};

export function createSignal(search: string): Senal {
  const q = new URLSearchParams(search);

  // ritmo
  const N = 900;            // muestras a lo largo de la línea
  const SPEED = 0.30;       // fracción de la línea por segundo
  const PERIOD = 2.1;       // s entre latidos (calmo, nocturno)
  const T_START = 0.2;      // aparece el punto (mismo timing que la versión aprobada)
  const FIRST_R_AT = 0.30;  // posición del cabezal en el primer pico R
  const T_R0 = T_START + FIRST_R_AT / SPEED;

  const CAM_Z = 10, TRACE_Z = 0.8;

  const c01 = (x: number) => Math.min(1, Math.max(0, x));
  const expoOut = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const g = (t: number, mu: number, s: number) => Math.exp(-((t - mu) * (t - mu)) / (2 * s * s));
  const smooth = (e0: number, e1: number, x: number) => { const k = c01((x - e0) / (e1 - e0)); return k * k * (3 - 2 * k); };

  const S: Senal = {
    params: q,
    N, SPEED, PERIOD, T_START, FIRST_R_AT, T_R0, CAM_Z, TRACE_Z,

    // cámara / composición (scene.js usa los mismos números; el 2D los proyecta)
    geom(w, h) {
      const m = w < 900;
      const fov = m ? 36 : 30;
      const t = Math.tan((fov / 2) * Math.PI / 180);
      const hT = 2 * (CAM_Z - TRACE_Z) * t;
      return {
        m, fov, horizon: m ? 0.55 : 0.64, hT, h0: 2 * CAM_Z * t,
        halfWFrac: 0.54,                 // la línea cubre el 108% del ancho
        amp: m ? 0.32 : 0.46,            // unidades de mundo
        pxPerUnit: h / hT, coreHalf: 0.0085,
      };
    },

    // reloj
    t0: performance.now(),
    now: () => (performance.now() - S.t0) / 1000,

    // ECG
    ecg(t) {
      if (t < T_R0 - 0.5) return 0;
      let r = (t - T_R0) % PERIOD; if (r < 0) r += PERIOD;
      if (r > PERIOD - 0.5) r -= PERIOD;
      return 0.10 * g(r, -0.17, 0.035) - 0.13 * g(r, -0.028, 0.011) + 1.0 * g(r, 0, 0.012)
           - 0.30 * g(r, 0.03, 0.013) + 0.22 * g(r, 0.29, 0.06);
    },
    lastR: (t) => (t < T_R0 ? -1e3 : T_R0 + Math.floor((t - T_R0) / PERIOD) * PERIOD),
    pulse: (t) => { const x = t - S.lastR(t); return x >= 0 && x < 3 ? (1 - Math.exp(-x / 0.02)) * Math.exp(-x / 0.38) : 0; },

    // curvas puras del encendido (idénticas en 2D y 3D)
    ign: (t) => expoOut(c01((t - T_R0) / 1.6)),
    dolly: (t) => 0.085 * (1 - Math.pow(1 - c01((t - T_R0) / 16), 2)),
    headAlpha: (t) => expoOut(c01((t - T_START) / 0.5)),
    smooth,
    damp: (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt)),

    // buffer de la traza
    val: new Float32Array(N),
    wrote: new Float32Array(N).fill(-1),
    headS: 0,
    write(t, vel) {           // devuelve true cuando el cabezal da la vuelta
      if (t < T_START) return false;
      const prev = S.headS;
      S.headS = ((t - T_START) * SPEED) % 1;
      const i0 = Math.floor(prev * N), i1 = Math.floor(S.headS * N);
      const span = (i1 - i0 + N) % N;
      const boost = 1 + Math.min((vel || 0) * 0.9, 1.4);
      for (let k = 1; k <= span; k++) {
        const i = (i0 + k) % N;
        const tw = t - (((S.headS - i / N) % 1 + 1) % 1) / SPEED;
        S.val[i] = S.ecg(tw) * boost + (Math.random() - 0.5) * 0.012;
        S.wrote[i] = tw;
      }
      return i1 < i0 && t > T_START + 0.5;
    },
    bright(i, t) {             // fósforo: lo fresco brilla, lo viejo queda tenue; un hueco borra delante del cabezal
      if (S.wrote[i] < 0) return 0;
      let br = 0.26 + 0.74 * Math.exp(-(t - S.wrote[i]) / 1.3);
      const ahead = ((i / N) - S.headS + 1) % 1;
      if (ahead < 0.05) br *= smooth(0.022, 0.05, ahead);
      return br;
    },

    // estado compartido (lo escribe hero-controller una vez por frame)
    state: { t: 0, p: 0, pTarget: 0, vel: 0, lastScroll: 0, cam: -1, gal: -1 },
    handoff: false,
    dead: false,
    goStatic: () => {},
    onLive: () => {},
    inView: true,
    onView: () => {},
    neg: { tags: [], open: -1, hover: -1, live: false, paused: false },
    fbf: { tags: [], active: -1, hover: -1, paused: false, open: -1, live: false },
    stk: { items: [], active: -1, live: false },
    exp: { v0: NaN, counts: [0, 0, 0], tags: [], box: [], live: false },
  };
  return S;
}

/* La señal viva, para quien está fuera del hero (el logo del menú, LogoMark animated): el hero la publica al montar
   y la retira al desmontar. Quien escucha recibe la actual en el acto y las siguientes (StrictMode monta dos veces).
   Así el logo late con el mismo reloj (S.now) y el mismo latido (S.T_R0, S.pulse) que la traza, sin timeouts. */
let published: Senal | null = null;
const listeners = new Set<(S: Senal) => void>();
export function publishSignal(S: Senal | null) {
  published = S;
  if (S) listeners.forEach((f) => f(S));
}
export function onSignal(f: (S: Senal) => void): () => void {
  listeners.add(f);
  if (published) f(published);
  return () => { listeners.delete(f); };
}
