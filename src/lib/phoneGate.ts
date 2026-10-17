/* Hidratación diferida de las secciones bajo el pliegue en el teléfono (U6b, 2026-10-14, rama mobile-senal).
   page.tsx carga About, Projects, Video, Stack, Experience y Contact con next/dynamic (ssr: true): el HTML llega
   entero del servidor (se ve y se lee igual, SEO intacto) y el JS de cada sección es un chunk aparte. Mientras el
   chunk no llegó, React deja ese HTML deshidratado dentro de su Suspense (sin fallback, sin salto de layout).
   - Escritorio (>= 1024): carga en el acto; los chunks se piden al hidratar, como antes (la escena los necesita todos
     para armar la galería).
   - Teléfono (< 1024): la puerta abre después del evento load, en un rato ocioso, o antes si la persona toca o
     scrollea. Así la evaluación del JS de esas secciones no compite con el primer pintado del hero (el LCP).
   - Perf 2026-10-17 (Lighthouse móvil, TBT): si la puerta abre por ocio (nadie tocó nada), las secciones hidratan DE
     A UNA, en orden, cada una en su propio rato ocioso, en vez de las seis juntas en una tarea larga (≈ 300 ms con la
     CPU del teléfono). Todas están bajo el pliegue y sin tocar: no cambia nada visible. Si la persona toca o scrollea
     (antes o durante), lo que falta se pide en el acto, todo junto, como siempre (las entradas de phoneMotion quedan
     armadas igual que antes). */

const queue: Array<() => Promise<unknown>> = [];
let mode = 0;                                   // 0 cerrada · 1 de a una, en ratos ociosos · 2 abierta (todo junto)
let busy = 0;

const idle = (fn: () => void) =>
  typeof requestIdleCallback == 'function' ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 300);

function step() {
  while (mode > 1 && queue.length) queue.shift()!();
  if (mode == 1 && !busy && queue.length) {
    busy = 1;
    // la siguiente, cuando React terminó de hidratar esta (el primer rato ocioso después)
    const next = () => idle(() => { busy = 0; step(); });
    queue.shift()!().then(next, next);
  }
}

/** Carga el chunk de una sección: en escritorio en el acto; en el teléfono, cuando le toca (ver arriba). */
export function phoneLoad<T>(load: () => Promise<T>): Promise<T> {
  if (typeof window == 'undefined' || !matchMedia('(max-width: 1023px)').matches) return load();
  if (!mode && !queue.length) {
    // la primera sección arma la puerta (una sola vez: después la cola nunca vuelve a estar vacía con la puerta cerrada).
    // Tocar o scrollear abre todo; repetirlo no hace nada (open es idempotente).
    const open = () => { mode = 2; step(); };
    ['scroll', 'touchstart', 'pointerdown', 'keydown'].forEach((e) => addEventListener(e, open, { once: true, passive: true }));
    const onLoad = () => idle(() => { mode ||= 1; step(); });
    if (document.readyState == 'complete') onLoad();
    else addEventListener('load', onLoad, { once: true });
  }
  return new Promise<T>((resolve, reject) => {
    queue.push(() => load().then(resolve, reject));
    step();
  });
}
