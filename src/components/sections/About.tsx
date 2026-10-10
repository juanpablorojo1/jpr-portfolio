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
import './about-senal.css';

gsap.registerPlugin(SplitText);

export default function About() {
  const t = useTranslations('about');
  const sectionRef = useRef<HTMLElement>(null);
  const ageDisplayRef = useRef<HTMLSpanElement>(null);
  const ageAnimatedRef = useRef(false);

  // Llegada al riel (≥1024, sin reduced motion): titular desde la profundidad, después los datos y la foto.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const title = section.querySelector<HTMLElement>('.ab-title');
      const rail = section.querySelector<HTMLElement>('[data-senal-rail]');
      const rest = section.querySelectorAll<HTMLElement>('.ab-label, .ab-paras p, .ab-sub, .ab-photo');
      if (!title || !rail) return;
      let split: SplitText | null = null;
      let io: IntersectionObserver | null = null;
      let tl: gsap.core.Timeline | null = null;
      let dead = false;
      gsap.set(rest, { opacity: 0, y: 14 });
      gsap.set(title, { visibility: 'hidden' });
      document.fonts.ready.then(() => {
        if (dead) return;
        split = SplitText.create(title.querySelectorAll('.ab-line'), { type: 'words,chars', wordsClass: 'word', charsClass: 'char', aria: 'none' });
        gsap.set(split.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0 });
        gsap.set(title, { visibility: 'visible' });
        // el riel del About entra en el 80 % superior del viewport: la cámara está terminando de llegar
        io = new IntersectionObserver((entries) => {
          if (!entries.some((e) => e.isIntersecting) || !split) return;
          io?.disconnect();
          tl = gsap.timeline()
            .to(split.chars, { z: 0, y: 0, rotationX: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: 0.012 }, 0)
            .to(rest, { opacity: 1, y: 0, duration: 1.0, ease: 'expo.out', stagger: 0.07 }, 0.35);
        }, { rootMargin: '0px 0px -20% 0px', threshold: 0 });
        io.observe(rail);
      });
      return () => {
        dead = true;
        io?.disconnect();
        tl?.kill();
        if (split) { gsap.killTweensOf(split.chars); split.revert(); }
        gsap.set(rest, { clearProps: 'opacity,transform' });
        gsap.set(title, { clearProps: 'visibility' });
      };
    });
    return () => mm.revert();
  }, []);

  // Age counter — fires once when the metadata bar enters the viewport
  useEffect(() => {
    const el = ageDisplayRef.current;
    if (!el) return;

    const target = 24;
    const durationMs = 1200;

    const run = () => {
      if (ageAnimatedRef.current) return;
      ageAnimatedRef.current = true;
      const startTime = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = String(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = String(target);
      };
      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            run();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
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
            — {t('sub_tagline')}
          </p>
        </div>

        {/* Foto real, 2D plana, cara visible */}
        <div className="ab-photo relative mt-8">
          <div className="ab-frame relative aspect-[4/5] max-w-md mx-auto">
            <Image
              src="/images/portrait.jpg"
              alt="Juan Pablo Rojo"
              fill
              className="object-cover object-top"
              style={{ filter: 'grayscale(85%) contrast(1.05)' }}
              sizes="(max-width: 1023px) 80vw, 30vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg/60 to-transparent" />
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
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                {t('meta_status_value')}
              </span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div>
              <span className="font-mono text-xs text-muted uppercase tracking-widest">{t('meta_age')} </span>
              <span ref={ageDisplayRef} className="font-ui text-sm text-off-white">0</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
