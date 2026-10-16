'use client';

/* About «Señal» (frame crudo del momento protagonista, escritorio).
   La traza del hero se dobla, se vuelve el riel y la cámara lo recorre hasta aterrizar con la recta del riel
   exactamente sobre [data-senal-rail] (scene.js). Mientras la escena 3D vive, el About entra transparente
   (data-see-through en su TransitionZone, lo pone hero-controller) y la cámara termina detrás del texto.
   Titular: se ensambla desde la profundidad (el mismo gesto que el tagline del hero) cuando el riel llega;
   sin máscaras ni scrub, así no puede quedar cortado arriba.
   Retrato editorial (2026-10-15, opción A; color natural desde 2026-10-16): la foto del escenario de Rocking the Industry
   leída como foto, nítida y a opacidad plena, en su propia columna a sangre a la derecha; el riel pasa por detrás y le enciende el filo izquierdo.
   Se abre desde la línea cuando llega la señal (clip-path, nunca opacidad: la recta 3D no se ve a través del pecho).
   Debajo de 1024 (2026-10-14, mobile-senal): diseño de teléfono en about-senal.css. La recta de la señal del hero sigue
   como horizonte del titular (SVG que se dibuja al entrar), cuerpo legible y la ficha como lectura de monitor. El retrato
   va como lámina a sangre antes del párrafo del hackatón y se pide recién después de `load` y a un viewport (AbPlate).
   Entradas por IntersectionObserver (phoneMotion). */

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { onSignal, type Senal } from '../hero/senal/signal';
import { GAL_ABOUT_OUT } from '../hero/senal/gallery';
import { setBatch } from '../../lib/idle';
import { phoneReveal } from '../../lib/phoneMotion';
import './about-senal.css';

gsap.registerPlugin(SplitText);

// Horizonte del celular: la recta a 30 de 44 y un solo latido (P, QRS, T) pasada la mitad, donde el pulgar no tapa.
const AB_HZ = 'M0 30 H232 q6 -6 12 0 h9 l3 4 l6 -27 l6 33 l4 -10 h13 q9 -10 18 0 H400';

// Retrato (2026-10-16, Juan: «no hace falta muchos filtros ni recortes»): la foto como foto, en su color natural, sin
// máscara, sin grade, sin ByN. Sólo encuadre. Escritorio: x 1860–3140 / y 0–1950 del original; teléfono 4:5: x 1860–3140 /
// y 0–1600. Fuera de cuadro siempre la otra persona (x < 1500), el público (y > 2540) y la figura de la pared (x > 3850):
// el archivo ya no las contiene, así que ningún object-position puede traerlas.
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const srcSet = (n: string, ws: number[], ext: string) => ws.map((w) => `/images/${n}-${w}.${ext} ${w}w`).join(', ');
const D_W = [640, 960, 1280], M_W = [480, 800, 1160];

/** Lámina del teléfono. El <img> no existe hasta que la página terminó de cargar y la lámina está a un viewport: en el
    teléfono el About cae dentro de la distancia de precarga lazy de Chrome y con loading=lazy competiría con el LCP del
    hero. En escritorio nunca se pide (display: none y sin <img>). */
function AbPlate({ alt }: { alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !matchMedia('(max-width: 1023px)').matches) return;
    let io: IntersectionObserver | null = null;
    const arm = () => {
      io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io?.disconnect(); } }, { rootMargin: '0px 0px 100% 0px' });
      io.observe(el);
    };
    if (document.readyState === 'complete') arm(); else addEventListener('load', arm, { once: true });
    return () => { removeEventListener('load', arm); io?.disconnect(); };
  }, []);
  return (
    <div ref={ref} className="ab-plate">
      <span className="pm-cut" aria-hidden="true"><b /><i /></span>
      <div className="ab-plate-img" data-pm="cut" data-shown={shown ? '' : undefined}>
        {on && (
          <picture>
            <source type="image/avif" srcSet={srcSet('about-foto-m', M_W, 'avif')} sizes="100vw" />
            <source type="image/webp" srcSet={srcSet('about-foto-m', M_W, 'webp')} sizes="100vw" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/about-foto-m-800.webp" alt={alt} width={800} height={1000} decoding="async" onLoad={() => setShown(true)} />
          </picture>
        )}
      </div>
    </div>
  );
}

export default function About() {
  const t = useTranslations('about');
  const sectionRef = useRef<HTMLElement>(null);

  // Celular (< 1024, sin reduced motion): entradas al llegar a la vista
  useEffect(() => (sectionRef.current ? phoneReveal(sectionRef.current) : undefined), []);

  // ≥1024: el retrato se ajusta a la grilla del texto. Arranca después del final del titular (--tr), su techo es el del
  // rótulo «Sobre mí» (--ft-m) y su piso, el filete de la ficha (--fb-m). Se mide porque cambia con el idioma y el ancho
  // (a 1536×730 ES «PRODUCTO» termina en x 1176 y el cuerpo en 1067). Con SplitText ya aplicado se miden las palabras,
  // que no llevan transform (las letras sí, mientras entran); antes, el texto de cada línea con un Range. offsetTop no
  // ve los transform de la entrada (rótulo y ficha suben 14 px).
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const mq = matchMedia('(min-width: 1024px)');
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const wrap = section.querySelector<HTMLElement>('.ab-wrap');
        const top = section.querySelector<HTMLElement>('.ab-top');
        const label = section.querySelector<HTMLElement>('.ab-label');
        const meta = section.querySelector<HTMLElement>('.ab-meta');
        if (!mq.matches || !wrap) { ['--tr', '--ft-m', '--fb-m'].forEach((k) => section.style.removeProperty(k)); return; }
        if (top && label) section.style.setProperty('--ft-m', `${top.offsetTop + label.offsetTop}px`);
        if (meta) section.style.setProperty('--fb-m', `${wrap.offsetHeight - meta.offsetTop}px`);
        let right = 0;
        section.querySelectorAll<HTMLElement>('.ab-title .ab-line').forEach((line) => {
          const words = line.querySelectorAll<HTMLElement>('.word');
          if (words.length) words.forEach((w) => { right = Math.max(right, w.getBoundingClientRect().right); });
          else { const r = document.createRange(); r.selectNodeContents(line); right = Math.max(right, r.getBoundingClientRect().right); }
        });
        if (right) section.style.setProperty('--tr', `${Math.ceil(right - wrap.getBoundingClientRect().left)}px`);
      });
    };
    document.fonts.ready.then(measure);
    addEventListener('resize', measure);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', measure); };
  }, []);

  // Llegada al riel (≥1024, sin reduced motion): titular desde la profundidad, después los datos y la foto.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const title = section.querySelector<HTMLElement>('.ab-title');
      const label = section.querySelector<HTMLElement>('.ab-label');
      const rest = Array.from(section.querySelectorAll<HTMLElement>('.ab-paras p, .ab-sub, .ab-meta'));
      const frame = section.querySelector<HTMLElement>('.ab-frame');
      const img = frame?.querySelector<HTMLElement>('.ab-img');
      const zone = section.closest<HTMLElement>('.transition-zone');
      if (!title || !label) return;
      let split: SplitText | null = null;
      let tlTitle: gsap.core.Timeline | null = null;
      let twRest: gsap.core.Tween | null = null;
      let titleOn = false, restOn = false, pinned = false, titleAt = 0, alive = true, galOut = false;
      let S: Senal | null = null;
      const offSignal = onSignal((s) => { S = s; });
      setBatch([[[label, ...rest], { opacity: 0, y: 14 }]]);
      // El retrato se abre y se cierra sobre la línea del riel (donde la cruza, en px desde su borde de arriba), siempre a
      // opacidad plena: con un fundido la recta 3D se vería a través del pecho mientras entra.
      const rail = section.querySelector<HTMLElement>('.ab-rail');
      const shut = () => {
        if (!frame) return 'none';
        const fh = frame.offsetHeight;
        const h = Math.min(fh, Math.max(0, (rail?.offsetTop ?? fh * 0.4) - frame.offsetTop));
        return `inset(${h}px 0px ${fh - h}px 0px)`;
      };
      let twFrame: gsap.core.Tween | null = null;
      if (frame) gsap.set(frame, { clipPath: shut() });
      gsap.set(title, { visibility: 'hidden' });

      // Aterrizaje (L): el borde superior del About llega al del viewport; el mismo `end` que la cámara en scene.js.
      let land = 1, zoneH = 0;
      const measure = () => {
        let y = zone?.parentElement?.offsetTop ?? 0;
        for (let el = zone?.previousElementSibling; el; el = el.previousElementSibling) y += (el as HTMLElement).offsetHeight;
        land = Math.max(1, y);
        zoneH = zone?.offsetHeight ?? innerHeight;
      };
      measure();
      addEventListener('resize', measure);

      // El texto sale con la cámara, no con el scroll del HTML. Con la escena viva detrás (data-see-through) el About
      // queda fijo en su pose de aterrizaje durante el último viewport de la bajada (is-pinned, about-senal.css): la
      // cámara termina de bajar y la recta se asienta debajo de un titular que ya está en su lugar, en vez de que el
      // HTML suba atravesando un horizonte quieto (design-critic D-01). En L el About ya está arriba y es sticky:
      // fijo y absoluto dan la misma posición, así que soltarlo no salta. Se suelta cuando Projects lo tapa entero.
      // Umbrales en progreso de cámara (S.state.cam, con el mismo damp que la línea), medidos con __senal.lineAt (?hud)
      // a 1024/1200/1440/1600/1920. La recta sube desde abajo y se asienta en el ancla; nunca pasa por encima del
      // titular (su punto más alto queda 11–13 px debajo del pie del titular). El titular sale en 0,80, con la recta
      // todavía viniendo. Los datos y la foto, en 0,92: la recta ya está 9–12 px arriba del borde de la foto y 20+ px
      // arriba del cuerpo; la foto la tocaría por debajo de ~0,85 y el cuerpo por debajo de ~0,8. Al volver se van en
      // 0,90 (histéresis) y el fijado no se suelta hasta que no queda nada a la vista.
      const T_IN = 0.8, T_OUT = 0.76, R_IN = 0.92, R_OUT = 0.9;
      const showTitle = () => {
        if (!split) return;
        titleOn = true; titleAt = performance.now();
        tlTitle?.kill();
        tlTitle = gsap.timeline()
          .to(split.chars, { z: 0, y: 0, rotationX: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: 0.012 }, 0)
          .to(label, { opacity: 1, y: 0, duration: 1.0, ease: 'expo.out' }, 0.1);
      };
      const hideTitle = () => {
        if (!split) return;
        titleOn = false;
        tlTitle?.kill();
        tlTitle = gsap.timeline()
          .to(split.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0, duration: 0.5, ease: 'expo.out', stagger: 0.004 }, 0)
          .to(label, { opacity: 0, y: 14, duration: 0.4, ease: 'expo.out' }, 0);
      };
      const showRest = () => {
        restOn = true;
        // 0,2 s detrás del titular (lo que falte), como antes
        const lag = titleAt ? Math.max(0, 0.2 - (performance.now() - titleAt) / 1000) : 0;
        twRest?.kill();
        twRest = gsap.to(rest, { opacity: 1, y: 0, duration: 1.0, ease: 'expo.out', stagger: 0.06, delay: lag });
        twFrame?.kill();
        if (frame) {
          twFrame = gsap.to(frame, { clipPath: 'inset(0px 0px 0px 0px)', duration: 1.1, ease: 'expo.out', delay: lag });
          // la foto se asienta mientras se abre (sólo transform): no se lee como un rectángulo rígido que se destapa
          if (img) gsap.fromTo(img, { scale: 1.05 }, { scale: 1, duration: 1.6, ease: 'expo.out', delay: lag, overwrite: true });
        }
      };
      const hideRest = () => {
        restOn = false;
        twRest?.kill();
        twRest = gsap.to(rest, { opacity: 0, y: 14, duration: 0.35, ease: 'expo.out' });
        twFrame?.kill();
        if (frame) twFrame = gsap.to(frame, { clipPath: shut(), duration: 0.4, ease: 'expo.out' });
      };
      const tick = () => {
        if (!split) return;
        const sy = scrollY;
        const live = !!zone?.hasAttribute('data-see-through');
        const cam = live && S && !S.dead ? S.state.cam : -1;
        // con la escena viva, la galería de Projects arranca en GAL_ABOUT_OUT: el About se despide con el mismo gesto
        // de salida y la cámara levanta la mirada (histéresis de 0,03 al volver)
        if (cam >= 0 && S) galOut = S.state.gal > (galOut ? GAL_ABOUT_OUT - 0.03 : GAL_ABOUT_OUT);
        else galOut = false;
        const p = galOut ? 0 : cam >= 0 ? cam : Math.min(1, Math.max(0, sy / land));   // sin escena: el scroll (el HTML se mueve con él)
        if (!titleOn && p >= T_IN) showTitle(); else if (titleOn && p < T_OUT) hideTitle();
        if (!restOn && p >= R_IN) showRest(); else if (restOn && p < R_OUT) hideRest();
        const leaving = !!(tlTitle?.isActive() && !titleOn) || !!((twRest?.isActive() || twFrame?.isActive()) && !restOn);
        const pin = live && sy < land + zoneH && (sy >= land - innerHeight || titleOn || restOn || leaving);
        if (pin !== pinned) { pinned = pin; section.classList.toggle('is-pinned', pin); }
      };
      document.fonts.ready.then(() => {
        if (!alive) return;
        split = SplitText.create(title.querySelectorAll('.ab-line'), { type: 'words,chars', wordsClass: 'word', charsClass: 'char', aria: 'none' });
        measure();
        setBatch([[split.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0 }]]);   // mismo estado, sin reflow por letra (D-01)
        gsap.set(title, { visibility: 'visible' });
        gsap.ticker.add(tick);
      });
      return () => {
        alive = false;
        gsap.ticker.remove(tick);
        removeEventListener('resize', measure);
        offSignal();
        section.classList.remove('is-pinned');
        tlTitle?.kill();
        twRest?.kill();
        twFrame?.kill();
        if (split) { gsap.killTweensOf(split.chars); split.revert(); }
        gsap.set([label, ...rest], { clearProps: 'opacity,transform' });
        if (frame) gsap.set(frame, { clearProps: 'clipPath' });
        if (img) { gsap.killTweensOf(img); gsap.set(img, { clearProps: 'transform' }); }
        gsap.set(title, { clearProps: 'visibility' });
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="ab relative py-10 bg-bg overflow-hidden"
    >
      <div className="ab-wrap max-w-7xl mx-auto px-6">
        <div className="ab-top">
          {/* Section label */}
          <p data-pm="rise" className="ab-label font-mono text-xs text-accent tracking-widest uppercase mb-4">
            <span className="ab-dot" aria-hidden="true" />
            {t('label')}
          </p>

          {/* aria-label en el h2: SplitText parte las líneas sin tocar ARIA (aria: 'none') y el nombre accesible queda entero */}
          <h2 data-pm="lines" data-pm-d="0.15" className="ab-title font-display uppercase mb-4" aria-label={`${t('headline_1')} ${t('headline_2')}`}>
            <span data-pm-lines className="ab-line text-white">{t('headline_1')}</span>
            <span data-pm-lines className="ab-line" style={{ color: '#E8272A' }}>{t('headline_2')}</span>
          </h2>

          {/* Celular: la recta de la señal del hero sigue como horizonte del titular, con un latido. pathLength 1: la
              traza se dibuja con dashoffset y el cabezal es un tramo corto que la recorre (phoneMotion «draw»). */}
          <svg className="ab-hz" data-pm="draw" data-pm-d="0.05" viewBox="0 0 400 44" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path className="pm-trace" pathLength={1} d={AB_HZ} />
            <path className="pm-head" pathLength={1} d={AB_HZ} />
          </svg>
        </div>

        {/* Ancla del riel: la recta de la traza 3D aterriza acá (scene.js) */}
        <span className="ab-rail" data-senal-rail aria-hidden="true" />

        <div className="ab-body">
          <div className="ab-paras flex flex-col gap-3">
            <p data-pm="rise" className="font-ui text-off-white text-body-lg leading-relaxed">{t('p1')}</p>
            <p data-pm="rise" className="font-ui text-off-white text-body-lg leading-relaxed">{t('p2')}</p>
            {/* teléfono: el retrato justo antes del párrafo del hackatón, que le hace de epígrafe */}
            <AbPlate alt={t('photo_alt')} />
            <p data-pm="rise" className="font-ui text-off-white text-body-lg leading-relaxed">{t('p3')}</p>
            <p data-pm="rise" className="font-ui text-off-white text-body-lg leading-relaxed">{t('p4')}</p>
          </div>

          {/* Sub-tagline */}
          <p data-pm="rise" data-pm-d="0.1" className="ab-sub mt-4 font-ui text-base text-accent italic">
            {t('sub_tagline')}
          </p>
        </div>

        {/* Retrato editorial (≥1024): columna propia a sangre a la derecha, al lado del texto y no detrás */}
        <div className="ab-photo relative mt-8">
          <div className="ab-frame">
            {/* < 1024 la fuente es un GIF de 1 px: el teléfono no pide esta versión (tiene la suya, AbPlate) */}
            <picture>
              <source media="(max-width: 1023px)" srcSet={BLANK} />
              <source type="image/avif" srcSet={srcSet('about-foto-d', D_W, 'avif')} sizes="34vw" />
              <source type="image/webp" srcSet={srcSet('about-foto-d', D_W, 'webp')} sizes="34vw" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ab-img" src="/images/about-foto-d-960.webp" alt={t('photo_alt')} width={960} height={1463} loading="lazy" decoding="async" />
            </picture>
          </div>

          {/* Metadata bar */}
          <div data-pm="group" className="ab-meta mt-6 flex items-center gap-6 border-t border-border pt-4">
            <div data-pm-i>
              <span className="font-mono text-xs text-muted uppercase tracking-widest">{t('meta_location')} </span>
              <span className="font-ui text-sm text-off-white">{t('meta_location_value')}</span>
            </div>
            <div className="ab-sep w-px h-4 bg-border" />
            <div data-pm-i>
              <span className="font-mono text-xs text-muted uppercase tracking-widest">{t('meta_status')} </span>
              <span className="font-ui text-sm text-accent flex items-center gap-2">
                <span className="ab-status-dot" aria-hidden="true" />
                {t('meta_status_value')}
              </span>
            </div>
            <div className="ab-sep w-px h-4 bg-border" />
            <div data-pm-i>
              <span className="font-mono text-xs text-muted uppercase tracking-widest">{t('meta_age')} </span>
              <span className="font-ui text-sm text-off-white">24</span>
            </div>
          </div>
        </div>

        {/* Primer plano (≥1024 con la escena viva): motas desenfocadas cerca de la lente. Las posiciona scene.js en
            cada frame (puntos del mundo proyectados con la cámara del About); van por encima de la foto, nunca de la cara */}
        <div className="ab-fg" data-ab-fg aria-hidden="true"><i /><i /><i /></div>
      </div>
    </section>
  );
}
