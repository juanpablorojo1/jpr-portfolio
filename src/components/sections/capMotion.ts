/* Capacitaciones C1 (2026-11-23): la recta de lectura, el titular y el retrato del About (sections/Capacitaciones.tsx).
   - railY(): a qué altura del viewport queda la recta de la señal. Con la escena 3D viva es la recta del riel en la
     pose del About (la escena se sostiene ahí mientras pasa Capacitaciones, capShift.ts): el ancla [data-senal-rail]
     medida dentro del About, que aterriza con su borde superior en el del viewport (scene.js). Sin escena, 46 %.
   - riseTitle(): el gesto de entrada de los titulares del sitio (tagline del hero, titular del About, títulos de
     Projects): las letras llegan desde la profundidad. Una vez, al entrar en vista. Sin él con reduced motion. */
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

export const reduced = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function railY(live: boolean): number {
  if (live) {
    const a = document.querySelector<HTMLElement>('[data-senal-rail]');
    const sec = a?.closest('section');
    if (a && sec) {
      const y = a.getBoundingClientRect().top - sec.getBoundingClientRect().top;
      if (y > innerHeight * 0.2 && y < innerHeight * 0.8) return y;
    }
  }
  return Math.round(innerHeight * 0.46);
}

/** la sección está sobre la escena viva (hero-controller le pone data-see-through) */
export const isLive = (el: Element | null) => !!el?.hasAttribute('data-see-through');

export function riseTitle(title: HTMLElement): () => void {
  if (reduced()) return () => {};
  let split: SplitText | null = null;
  let io: IntersectionObserver | null = null;
  let alive = true;
  document.fonts.ready.then(() => {
    if (!alive) return;
    split = SplitText.create(title.querySelectorAll('[data-split]'), { type: 'words,chars', wordsClass: 'word', charsClass: 'char', aria: 'none' });
    gsap.set(split.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0 });
    io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || !split) return;
      io?.disconnect();
      gsap.to(split.chars, { z: 0, y: 0, rotationX: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: 0.012 });
    }, { rootMargin: '0px 0px -18% 0px' });
    io.observe(title);
  });
  return () => {
    alive = false;
    io?.disconnect();
    if (split) { gsap.killTweensOf(split.chars); split.revert(); }
  };
}

/* Con la escena sostenida en la pose del About, el retrato del About queda cerrado en una línea (clip-path a alto 0) y
   su fila de píxeles antialiaseada se veía como guiones blancos sobre la recta durante toda la sección. Mientras la
   sección pasa por encima (su borde superior por arriba del 62 % del viewport: el About ya se despidió en u 0,35),
   html[data-cap-over] apaga el retrato después de su cierre (cap.css). */
export function watchAboutFrame(sec: HTMLElement): () => void {
  const html = document.documentElement;
  let raf = 0, on = false;
  const apply = () => {
    raf = 0;
    const r = sec.getBoundingClientRect();
    // también después: con la galería el About sigue pegado debajo de todo y la línea volvía junto a la laptop
    const v = isLive(sec) && r.top < innerHeight * 0.62;
    if (v !== on) { on = v; html.toggleAttribute('data-cap-over', v); }
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
  addEventListener('scroll', onScroll, { passive: true });
  apply();
  return () => { removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); html.removeAttribute('data-cap-over'); };
}
