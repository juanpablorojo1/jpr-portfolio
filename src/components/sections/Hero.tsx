'use client';

/* Hero «Señal» (rediseño 2026, golden section). Port fiel de la maqueta aprobada
   clients/jpr-portfolio/maquetas/2026-10-09-redesign/a-senal/ (repo de la agencia, commit da8ae1b).
   - El HTML (nombre, tagline, CTAs, foto estática, traza 2D) se ve desde el primer frame.
   - La escena 3D (three r186, WebGPU con fallback a WebGL2) se importa dinámicamente y se funde encima en 0,6 s.
   - Reduced motion y ?static van por el mismo camino estático, decidido antes del primer pintado. */

import { useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { createSignal } from '../hero/senal/signal';
import { initHero } from '../hero/senal/hero-controller';
import '../hero/senal/senal.css';

// Corre mientras se parsea el HTML, antes de pintar el hero: elige el camino estático.
const STATIC_SCRIPT = `(function(){var r=document.getElementById('senal');if(!r)return;var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(rm||/[?&]static\\b/.test(location.search))r.classList.add('is-static');})();`;

export default function Hero() {
  const t = useTranslations('hero');
  const locale = useLocale();
  const cvHref = locale === 'es' ? '/CV_Juan_Pablo_Rojo_ES.pdf' : '/CV_Juan_Pablo_Rojo_EN.pdf';
  const rootRef = useRef<HTMLDivElement>(null);
  const channels = t.raw('marquee') as string[];
  const fullName = `${t('title')} ${t('surname')}`;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (/[?&]static\b/.test(location.search) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('is-static');
    }
    const S = createSignal(location.search);
    (window as unknown as { SENAL: unknown }).SENAL = S;
    const stopHero = initHero(root, S, { channels });

    let cancelled = false;
    let disposeScene: (() => void) | null = null;
    if (!root.classList.contains('is-static')) {
      const intro = root.querySelector<HTMLCanvasElement>('.senal-intro');
      import('../hero/senal/scene')
        .then(({ bootScene }) => {
          if (cancelled || !intro) return;
          const scene = bootScene({ S, root, after: intro, assetBase: '/senal/' });
          disposeScene = scene.dispose;
        })
        .catch((e: unknown) => {
          if (!cancelled) S.goStatic('scene import: ' + (e instanceof Error ? e.message : String(e)));
        });
    }

    return () => {
      cancelled = true;
      stopHero();
      if (disposeScene) disposeScene();
      const w = window as unknown as { SENAL?: unknown };
      if (w.SENAL === S) delete w.SENAL;
    };
    // channels sale de messages y no cambia durante la vida de la página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewWork = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div id="senal" ref={rootRef} className="senal is-loading" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: STATIC_SCRIPT }} />

      {/* HTML/2D desde el primer frame: figura estática + intro de la traza en 2D.
          Es también el fallback de reduced motion y de "sin GPU". El canvas 3D se inserta después del intro y se funde encima. */}
      <div className="static-stage" aria-hidden="true">
        <div className="static-fig">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/senal/juan-2d-static.webp" alt="" decoding="async" width={1166} height={1708} />
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

            <p className="channel" aria-hidden="true">
              <span className="ch-dot" />
              <span className="ch-text">{channels[0]}</span>
            </p>

            <div className="below">
              <p className="tagline">{t('tagline')}</p>
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

            <div className="scroll-cue" data-reveal aria-hidden="true"><span>scroll</span><i /></div>
          </div>
        </section>

        {/* ~2 viewports: "la señal toma el control" — scroll nativo, cámara con damping */}
        <div className="transit" aria-hidden="true" />
      </div>

      <div className="senal-hud" hidden />
    </div>
  );
}
