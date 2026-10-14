'use client';

/* Hero «Señal» (rediseño 2026, golden section). Port fiel de la maqueta aprobada
   clients/jpr-portfolio/maquetas/2026-10-09-redesign/a-senal/ (repo de la agencia, commit da8ae1b).
   - El HTML (nombre, tagline, CTAs, foto estática, traza 2D) se ve desde el primer frame.
   - La escena 3D (three r186, WebGPU con fallback a WebGL2) se importa con la página cargada y el hilo libre
     (afterLoadIdle) y se funde encima en 0,6 s.
   - Reduced motion y ?static van por el mismo camino estático, decidido antes del primer pintado. */

import { useEffect, useRef, useState } from 'react';
import { getImageProps } from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { createSignal, publishSignal } from '../hero/senal/signal';
import { initHero } from '../hero/senal/hero-controller';
import '../hero/senal/senal.css';

// Corre mientras se parsea el HTML, antes de pintar el hero: elige el camino estático.
/* Celular (< 1024): la figura es el LCP. Fuente propia con srcset de next/image (AVIF/WebP al ancho del teléfono) y
   preload solo para ese rango (media). En >= 1024 queda el <img> de siempre, mismo archivo y mismos píxeles. */
const PHONE_MQ = '(max-width: 1023px)';
const FIG_SIZES = '(max-width: 1023px) 108vw, 40vw';
const { props: figPhone } = getImageProps({
  src: '/senal/juan-2d-static.webp', alt: '', width: 1166, height: 1708, sizes: FIG_SIZES, quality: 80,
});

// Celular: la figura es el LCP y llega antes del primer pintado; con decoding="async" se pintaba un frame tarde, detrás de
// la evaluación del JS (LCP observado 160 ms después del FCP). En el teléfono se decodifica en el mismo pintado.
// Escritorio conserva el async (su figura arranca invisible). Corre mientras se parsea, justo después del <img>.
const FIG_DECODE_SCRIPT = `(function(){if(!matchMedia('${PHONE_MQ}').matches)return;var i=document.querySelector('#senal .static-fig img');if(i)i.decoding='sync';})();`;

const STATIC_SCRIPT = `(function(){var r=document.getElementById('senal');if(!r)return;var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(rm||/[?&]static\\b/.test(location.search))r.classList.add('is-static');})();`;

/** Corre `fn` con el evento load ya disparado y el hilo principal libre (requestIdleCallback, tope 1,2 s).
    Devuelve la cancelación. */
function afterLoadIdle(fn: () => void): () => void {
  let idleId = 0, timer = 0, done = false;
  const hasRic = typeof window.requestIdleCallback === 'function';
  const run = () => { if (!done) { done = true; fn(); } };
  const schedule = () => {
    if (hasRic) idleId = window.requestIdleCallback(run, { timeout: 1200 });
    // red de seguridad: Chrome no entrega idle callbacks (ni su timeout) con la pestaña oculta
    timer = window.setTimeout(run, hasRic ? 1500 : 1);
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
  return () => {
    done = true;
    window.removeEventListener('load', schedule);
    if (idleId) window.cancelIdleCallback(idleId);
    clearTimeout(timer);
  };
}

export default function Hero() {
  const t = useTranslations('hero');
  const locale = useLocale();
  const cvHref = locale === 'es' ? '/CV_Juan_Pablo_Rojo_ES.pdf' : '/CV_Juan_Pablo_Rojo_EN.pdf';
  const rootRef = useRef<HTMLDivElement>(null);
  const channels = t.raw('marquee') as string[];
  const fullName = `${t('title')} ${t('surname')}`;
  /* Modo del hero (< 1024 teléfono 2D / ≥ 1024 escritorio). No se renderiza: sólo decide el efecto de abajo. Si la
     ventana cruza 1024 (iPad que gira, ventana que se maximiza), el efecto se rehace en el otro modo (stopHero +
     initHero): antes el modo quedaba fijo al montar y el hero de escritorio quedaba sin texto (code-reviewer C-01). */
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && matchMedia(PHONE_MQ).matches);
  useEffect(() => {
    const mq = matchMedia(PHONE_MQ);
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (/[?&]static\b/.test(location.search) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('is-static');
    }
    const S = createSignal(location.search);
    // Celular: la entrada del hero corre por CSS desde el primer pintado (no espera la hidratación). El reloj de la señal
    // arranca en ese mismo instante (FCP), así la traza que dibuja el JS cae a tiempo con el nombre y la cara.
    if (phone) {
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcp && fcp.startTime < performance.now()) S.t0 = fcp.startTime;
    }
    (window as unknown as { SENAL: unknown }).SENAL = S;
    const stopHero = initHero(root, S, { channels, phone });
    publishSignal(S);   // después de initHero: en el camino estático S.dead ya es true y el logo queda entero

    let cancelled = false;
    let disposeScene: (() => void) | null = null;
    let cancelDefer = () => {};
    if (!root.classList.contains('is-static')) {
      const intro = root.querySelector<HTMLCanvasElement>('.senal-intro');
      // El chunk 3D (three/webgpu, ~680 KB sin comprimir) se pide recién con la página cargada y el hilo libre:
      // no compite con la hidratación ni con el texto del hero (TBT, delivery-auditor D-01). Mientras tanto el hero
      // ya está entero en HTML/2D con la traza en canvas 2D; la escena se funde encima igual que antes, cuando llega.
      // La escena 3D (~680 KB) es de escritorio: en celular el hero es 2D (figura + traza en canvas 2D) y ninguna
      // sección la usa debajo de 1024. Si la ventana crece a >= 1024, se arranca entonces.
      const wide = matchMedia('(min-width: 1024px)');
      const boot = () => afterLoadIdle(() => {
        import('../hero/senal/scene')
          .then(({ bootScene }) => {
            if (cancelled || !intro) return;
            const scene = bootScene({ S, root, after: intro, assetBase: '/senal/' });
            disposeScene = scene.dispose;
          })
          .catch((e: unknown) => {
            if (!cancelled) S.goStatic('scene import: ' + (e instanceof Error ? e.message : String(e)));
          });
      });
      if (wide.matches) cancelDefer = boot();
      else {
        const onWide = () => {
          if (!wide.matches) return;
          wide.removeEventListener('change', onWide);
          cancelDefer = boot();
        };
        wide.addEventListener('change', onWide);
        cancelDefer = () => wide.removeEventListener('change', onWide);
      }
    }

    return () => {
      cancelled = true;
      cancelDefer();
      stopHero();
      if (disposeScene) disposeScene();
      const w = window as unknown as { SENAL?: unknown };
      if (w.SENAL === S) delete w.SENAL;
      publishSignal(null);
    };
    // channels sale de messages y no cambia durante la vida de la página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  const handleViewWork = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('projects')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <div id="senal" ref={rootRef} className="senal is-loading" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: STATIC_SCRIPT }} />

      {/* HTML/2D desde el primer frame: figura estática + intro de la traza en 2D.
          Es también el fallback de reduced motion y de "sin GPU". El canvas 3D se inserta después del intro y se funde encima. */}
      {/* Preload solo del LCP del celular (la figura): media lo deja fuera del escritorio. */}
      <link rel="preload" as="image" media={PHONE_MQ} imageSrcSet={figPhone.srcSet} imageSizes={FIG_SIZES} fetchPriority="high" />
      <div className="static-stage" aria-hidden="true">
        <div className="static-fig">
          <picture>
            <source media={PHONE_MQ} srcSet={figPhone.srcSet} sizes={FIG_SIZES} />
            {/* suppressHydrationWarning: FIG_DECODE_SCRIPT cambia decoding en el teléfono antes de hidratar, a propósito */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/senal/juan-2d-static.webp" alt="" decoding="async" width={1166} height={1708} suppressHydrationWarning />
          </picture>
          <script dangerouslySetInnerHTML={{ __html: FIG_DECODE_SCRIPT }} />
        </div>
        <svg className="static-trace" viewBox="0 0 1000 120" preserveAspectRatio="none">
          <path d="M0 90 H340 l10 -6 l8 6 H372 l5 5 l9 -86 l9 96 l6 -15 H470 q22 -18 44 0 H1000" />
        </svg>
      </div>
      <canvas className="senal-intro" aria-hidden="true" />

      {/* Film grain + scanlines (fixed, pointer-events none) */}
      <div className="grain" aria-hidden="true" />

      <div className="senal-main">
        <section className="hero" id="hero">
          <div className="hero-inner">
            <h1 className="name" aria-label={fullName}>
              <span className="name-line" data-split>{t('title')}</span>
              <span className="name-line name-red">
                <span className="rojo" data-split>{t('surname')}</span>
                <span className="rojo-glow" aria-hidden="true">{t('surname')}</span>
              </span>
            </h1>

            {/* Celular: la línea de la señal vive en el flujo, debajo del nombre (la traza en vivo la dibuja el canvas a
                esta altura; con reduced motion se ve este SVG quieto). Oculto en >= 1024. */}
            <div className="m-horizon" aria-hidden="true">
              <svg viewBox="0 0 1000 120" preserveAspectRatio="none" focusable="false">
                <path d="M0 90 H340 l10 -6 l8 6 H372 l5 5 l9 -86 l9 96 l6 -15 H470 q22 -18 44 0 H1000" />
              </svg>
            </div>

            <p className="channel" aria-hidden="true">
              <span className="ch-dot" />
              <span className="ch-text">{channels[0]}</span>
            </p>

            <div className="below">
              {/* el tagline se parte por letras (hero-controller): la frase entera para lectores de pantalla va aparte */}
              <span className="sr-only">{t('tagline')}</span>
              <p className="tagline" aria-hidden="true">{t('tagline')}</p>
              <p className="role" data-reveal>{t('role')}</p>
              <div className="ctas" data-reveal>
                <a className="btn btn-solid" href="#projects" onClick={handleViewWork} data-magnetic>
                  <span>{t('cta1')}</span>
                </a>
                <a className="btn btn-ghost" href={cvHref} target="_blank" rel="noopener noreferrer" data-magnetic>
                  <span>{t('cta2')}</span>
                </a>
              </div>
            </div>

            <div className="scroll-cue" data-reveal aria-hidden="true"><span>{t('scroll_cue')}</span><i /></div>
          </div>
        </section>

        {/* ~2 viewports: "la señal toma el control" — scroll nativo, cámara con damping */}
        <div className="transit" aria-hidden="true" />
      </div>

      <div className="senal-hud" hidden />
    </div>
  );
}
