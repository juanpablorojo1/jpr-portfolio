/* Hidratación diferida de las secciones bajo el pliegue en el teléfono (U6b, 2026-10-14, rama mobile-senal).
   page.tsx carga About, Projects, Video, Stack, Experience y Contact con next/dynamic (ssr: true): el HTML llega
   entero del servidor (se ve y se lee igual, SEO intacto) y el JS de cada sección es un chunk aparte. Mientras el
   chunk no llegó, React deja ese HTML deshidratado dentro de su Suspense (sin fallback, sin salto de layout).
   - Escritorio (>= 1024): la puerta abre en el acto; los chunks se piden al hidratar, como antes (la escena los
     necesita todos para armar la galería).
   - Teléfono (< 1024): la puerta abre después del evento load, en un rato ocioso (tope 1,5 s), o antes si la persona
     toca o scrollea. Así la evaluación del JS de esas secciones no compite con el primer pintado del hero (el LCP). */

let gate: Promise<void> | null = null;

export function phoneGate(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (gate) return gate;
  if (!window.matchMedia('(max-width: 1023px)').matches) return (gate = Promise.resolve());
  gate = new Promise<void>((resolve) => {
    let done = false;
    const evs = ['scroll', 'touchstart', 'pointerdown', 'keydown'] as const;
    const open = () => {
      if (done) return;
      done = true;
      evs.forEach((e) => removeEventListener(e, open));
      resolve();
    };
    evs.forEach((e) => addEventListener(e, open, { once: true, passive: true }));
    const onLoad = () => {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(open, { timeout: 1500 });
      else setTimeout(open, 300);
    };
    if (document.readyState === 'complete') onLoad();
    else addEventListener('load', onLoad, { once: true });
  });
  return gate;
}
