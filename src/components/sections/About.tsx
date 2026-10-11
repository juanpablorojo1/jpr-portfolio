'use client';

/* About «Señal» (frame crudo del momento protagonista, escritorio).
   La traza del hero se dobla, se vuelve el riel y la cámara lo recorre hasta aterrizar con la recta del riel
   exactamente sobre [data-senal-rail] (scene.js). Mientras la escena 3D vive, el About entra transparente
   (data-see-through en su TransitionZone, lo pone hero-controller) y la cámara termina detrás del texto.
   Titular: se ensambla desde la profundidad (el mismo gesto que el tagline del hero) cuando el riel llega;
   sin máscaras ni scrub, así no puede quedar cortado arriba. La foto real va en 2D plana, con la cara visible.
   Debajo de 1024 queda el layout de siempre, visible sin animación (el celular tendrá diseño propio). */

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { onSignal, type Senal } from '../hero/senal/signal';
import { GAL_ABOUT_OUT } from '../hero/senal/gallery';
import './about-senal.css';

gsap.registerPlugin(SplitText);

export default function About() {
  const t = useTranslations('about');
  const sectionRef = useRef<HTMLElement>(null);

  // Llegada al riel (≥1024, sin reduced motion): titular desde la profundidad, después los datos y la foto.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const title = section.querySelector<HTMLElement>('.ab-title');
      const label = section.querySelector<HTMLElement>('.ab-label');
      const rest = Array.from(section.querySelectorAll<HTMLElement>('.ab-paras p, .ab-sub, .ab-frame, .ab-meta'));
      const zone = section.closest<HTMLElement>('.transition-zone');
      if (!title || !label) return;
      let split: SplitText | null = null;
      let tlTitle: gsap.core.Timeline | null = null;
      let twRest: gsap.core.Tween | null = null;
      let titleOn = false, restOn = false, pinned = false, titleAt = 0, alive = true, galOut = false;
      let S: Senal | null = null;
      const offSignal = onSignal((s) => { S = s; });
      gsap.set([label, ...rest], { opacity: 0, y: 14 });
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
      };
      const hideRest = () => {
        restOn = false;
        twRest?.kill();
        twRest = gsap.to(rest, { opacity: 0, y: 14, duration: 0.35, ease: 'expo.out' });
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
        const leaving = !!(tlTitle?.isActive() && !titleOn) || !!(twRest?.isActive() && !restOn);
        const pin = live && sy < land + zoneH && (sy >= land - innerHeight || titleOn || restOn || leaving);
        if (pin !== pinned) { pinned = pin; section.classList.toggle('is-pinned', pin); }
      };
      document.fonts.ready.then(() => {
        if (!alive) return;
        split = SplitText.create(title.querySelectorAll('.ab-line'), { type: 'words,chars', wordsClass: 'word', charsClass: 'char', aria: 'none' });
        gsap.set(split.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0 });
        gsap.set(title, { visibility: 'visible' });
        measure();
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
        if (split) { gsap.killTweensOf(split.chars); split.revert(); }
        gsap.set([label, ...rest], { clearProps: 'opacity,transform' });
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
          <p className="ab-label font-mono text-xs text-accent tracking-widest uppercase mb-4">
            <span className="ab-dot" aria-hidden="true" />
            {t('label')}
          </p>

          {/* aria-label en el h2: SplitText parte las líneas sin tocar ARIA (aria: 'none') y el nombre accesible queda entero */}
          <h2 className="ab-title font-display uppercase mb-4" aria-label={`${t('headline_1')} ${t('headline_2')}`}>
            <span className="ab-line text-white">{t('headline_1')}</span>
            <span className="ab-line" style={{ color: '#E8272A' }}>{t('headline_2')}</span>
          </h2>
        </div>

        {/* Ancla del riel: la recta de la traza 3D aterriza acá (scene.js) */}
        <span className="ab-rail" data-senal-rail aria-hidden="true" />

        <div className="ab-body">
          <div className="ab-paras flex flex-col gap-3">
            <p className="font-ui text-off-white text-body-lg leading-relaxed">{t('p1')}</p>
            <p className="font-ui text-off-white text-body-lg leading-relaxed">{t('p2')}</p>
            <p className="font-ui text-off-white text-body-lg leading-relaxed">{t('p3')}</p>
            <p className="font-ui text-off-white text-body-lg leading-relaxed">{t('p4')}</p>
          </div>

          {/* Sub-tagline */}
          <p className="ab-sub mt-4 font-ui text-base text-accent italic">
            {t('sub_tagline')}
          </p>
        </div>

        {/* Foto real, 2D plana, cara visible */}
        <div className="ab-photo relative mt-8">
          <div className="ab-frame relative aspect-[4/5] max-w-md mx-auto">
            <Image
              src="/images/portrait.jpg"
              alt={t('photo_alt')}
              fill
              className="ab-img object-cover object-top"
              sizes="(max-width: 1023px) 80vw, 30vw"
            />
            {/* ≥1024: la pared clara de la toma cae a la oscuridad (recorte del hero como máscara) y la escena
                ilumina la foto (viñeta, resto rojo del riel, filo); about-senal.css */}
            <div className="ab-matte" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg/60 to-transparent" />
            <div className="ab-light" aria-hidden="true" />
          </div>

          {/* Metadata bar */}
          <div className="ab-meta mt-6 flex items-center gap-6 border-t border-border pt-4">
            <div>
              <span className="font-mono text-xs text-muted uppercase tracking-widest">{t('meta_location')} </span>
              <span className="font-ui text-sm text-off-white">{t('meta_location_value')}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div>
              <span className="font-mono text-xs text-muted uppercase tracking-widest">{t('meta_status')} </span>
              <span className="font-ui text-sm text-accent flex items-center gap-2">
                <span className="ab-status-dot" aria-hidden="true" />
                {t('meta_status_value')}
              </span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div>
              <span className="font-mono text-xs text-muted uppercase tracking-widest">{t('meta_age')} </span>
              <span className="font-ui text-sm text-off-white">24</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
