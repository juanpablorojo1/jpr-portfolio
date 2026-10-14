/* Entradas del celular (< 1024, 2026-10-14, rama mobile-senal): el mismo lenguaje que el escritorio (señal roja,
   cortes precisos, expo.out) pensado para el scroll vertical nativo. Sin scrub ni pin: cada pieza entra una sola vez
   cuando llega a la vista (IntersectionObserver) y lo que ya pasó queda quieto.
   Todo vive dentro de gsap.matchMedia: en >= 1024 o con prefers-reduced-motion no se toca nada (el contenido queda
   visible tal cual), y si la ventana cruza el corte el contexto se revierte solo.

   Marcado: data-pm en el elemento (data-pm-d: retardo en s).
   - rise   sube 18 px y aparece.
   - group  sus hijos [data-pm-i] suben escalonados.
   - lines  titular por líneas con máscara (el gesto del nombre del hero): cada línea sube desde su propio borde.
            Parte los [data-pm-lines] de adentro cuando la fuente final está lista.
   - draw   la traza SVG se dibuja de izquierda a derecha (.pm-trace) y el cabezal la recorre (.pm-head).
   - cut    el corte de señal entre proyectos: la recta roja (hermano .pjm-cut > b) barre el ancho y destapa la
            cabecera (clip-path) en el mismo tiempo, 0,55 s; el cabezal (.pjm-cut > i) viaja con el borde y se apaga.
   - on     una pantalla que se enciende: parpadeo de lámpara corto (sólo opacidad), como las notebooks del escritorio. */
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

export const PHONE_MOTION_MQ = '(max-width: 1023px) and (prefers-reduced-motion: no-preference)';
const EASE = 'expo.out';
const CUT = 0.55;

export function phoneReveal(root: HTMLElement): () => void {
  const mm = gsap.matchMedia();
  mm.add(PHONE_MOTION_MQ, (ctx) => {
    let alive = true;
    const splits: SplitText[] = [];
    const plays = new Map<Element, () => void>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          plays.get(e.target)?.();
        }
      },
      // un poco antes del borde de abajo: la pieza termina de entrar cuando ya se lee
      { rootMargin: '0px 0px -10% 0px' },
    );
    // ctx.add(nombre, fn) devuelve fn envuelta sin correrla: lo que cree al correr (en el callback del IO) queda en el
    // contexto y se revierte con él
    let n = 0;
    const arm = (el: Element, play: () => void) => {
      plays.set(el, ctx.add(`pm${n++}`, play) as () => void);
      io.observe(el);
    };

    root.querySelectorAll<HTMLElement>('[data-pm]').forEach((el) => {
      const d = parseFloat(el.dataset.pmD || '0') || 0;
      switch (el.dataset.pm) {
        case 'rise':
          gsap.set(el, { y: 18, opacity: 0 });
          arm(el, () => gsap.to(el, { y: 0, opacity: 1, duration: 0.9, ease: EASE, delay: d }));
          break;
        case 'group': {
          const kids = el.querySelectorAll<HTMLElement>('[data-pm-i]');
          gsap.set(kids, { y: 16, opacity: 0 });
          arm(el, () => gsap.to(kids, { y: 0, opacity: 1, duration: 0.85, ease: EASE, stagger: 0.07, delay: d }));
          break;
        }
        case 'draw': {
          const trace = el.querySelectorAll<SVGPathElement>('.pm-trace');
          const head = el.querySelectorAll<SVGPathElement>('.pm-head');
          gsap.set(trace, { strokeDashoffset: 1 });
          gsap.set(head, { strokeDashoffset: 0.1, opacity: 1 });
          arm(el, () => {
            gsap.to(trace, { strokeDashoffset: 0, duration: 1.25, ease: 'power3.out', delay: d });
            // el cabezal corre en el frente de la traza y se apaga al llegar al borde
            gsap.timeline({ delay: d })
              .to(head, { strokeDashoffset: -0.98, duration: 1.25, ease: 'power3.out' }, 0)
              .to(head, { opacity: 0, duration: 0.4, ease: 'power1.out' }, 0.9);
          });
          break;
        }
        case 'cut': {
          const cut = el.parentElement?.querySelector<HTMLElement>(':scope > .pjm-cut');
          const line = cut?.querySelector<HTMLElement>('b');
          const glow = cut?.querySelector<HTMLElement>('i');
          gsap.set(el, { clipPath: 'inset(0% 100% 0% 0%)' });
          if (line) gsap.set(line, { scaleX: 0, transformOrigin: '0% 50%' });
          if (glow) gsap.set(glow, { x: 0, opacity: 0 });
          arm(el, () => {
            const tl = gsap.timeline({ delay: d });
            tl.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: CUT, ease: EASE }, 0);
            if (line) tl.to(line, { scaleX: 1, duration: CUT, ease: EASE }, 0);
            if (glow && cut) {
              tl.fromTo(glow, { x: 0, opacity: 1 }, { x: () => cut.offsetWidth, duration: CUT, ease: EASE }, 0)
                .to(glow, { opacity: 0, duration: 0.3, ease: 'power1.out' }, CUT * 0.6);
            }
            // al terminar se suelta el clip: la cabecera no queda recortada (sombras, foco)
            tl.set(el, { clearProps: 'clipPath' });
          });
          break;
        }
        case 'on':
          gsap.set(el, { opacity: 0 });
          arm(el, () => gsap.timeline({ delay: d })
            .to(el, { opacity: 1, duration: 0.05, ease: 'none' })
            .to(el, { opacity: 0.28, duration: 0.06, ease: 'none' })
            .to(el, { opacity: 1, duration: 0.05, ease: 'none' })
            .to(el, { opacity: 0.7, duration: 0.07, ease: 'none' })
            .to(el, { opacity: 1, duration: 0.22, ease: 'power1.out' }));
          break;
        case 'lines':
          gsap.set(el, { visibility: 'hidden' });
          document.fonts.ready.then(() => {
            if (!alive) return;
            ctx.add(() => {
              // las líneas reales con la fuente final; aria: 'none' (el titular lleva su aria-label)
              const s = SplitText.create(el.querySelectorAll('[data-pm-lines]'), { type: 'lines', mask: 'lines', linesClass: 'pm-line', aria: 'none' });
              splits.push(s);
              gsap.set(s.lines, { yPercent: 118 });
              gsap.set(el, { visibility: 'visible' });
              arm(el, () => gsap.to(s.lines, { yPercent: 0, duration: 1.1, ease: EASE, stagger: 0.08, delay: d }));
            });
          });
          break;
      }
    });

    return () => {
      alive = false;
      io.disconnect();
      splits.forEach((s) => s.revert());
    };
  });
  return () => mm.revert();
}
