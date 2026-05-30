'use client';

import { useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { SOCIAL_LINKS } from '../../lib/content';

export default function Contact() {
  const t = useTranslations('contact');
  const locale = useLocale();
  const cvHref = locale === 'es' ? '/CV_Juan_Pablo_Rojo_ES.pdf' : '/CV_Juan_Pablo_Rojo_EN.pdf';
  const headlineRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cleanup = false;

    const animate = async () => {
      // Skip GSAP scrub animations on mobile — elements render visible
      if (typeof window !== 'undefined' && window.innerWidth < 1024) return;

      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      if (cleanup) return;

      if (headlineRef.current) {
        const lines = headlineRef.current.querySelectorAll('.headline-line');

        // Headline reveal — scrub-driven
        gsap.fromTo(
          lines,
          { clipPath: 'inset(100% 0 0 0)', opacity: 1 },
          {
            clipPath: 'inset(0% 0 0 0)',
            ease: 'none',
            stagger: 0.08,
            scrollTrigger: {
              trigger: headlineRef.current,
              start: 'top bottom',
              end: 'top 30%',
              scrub: 1.5,
            },
          }
        );

        // Pin removido — el card stack (TransitionZone) ya es sticky con overflow:hidden,
        // GSAP pin inserta un .pin-spacer que queda clippeado y hace invisible el headline.
      }

      if (contentRef.current) {
        // Content fade — scrub-driven.
        // immediateRender: false previene que GSAP aplique opacity:0 antes de que
        // el ScrollTrigger calcule si el trigger ya paso (evita flash invisible en reload).
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            ease: 'none',
            immediateRender: false,
            scrollTrigger: {
              trigger: contentRef.current,
              start: 'top bottom',
              end: 'top 40%',
              scrub: 1,
            },
          }
        );
      }
    };

    animate();
    return () => { cleanup = true; };
  }, []);

  return (
    <section
      id="contact"
      className="py-10 lg:py-32 bg-bg"
    >
      {/* Headline — alineado con el contenido */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-6 lg:mb-10 overflow-hidden">
        <p className="font-mono text-xs text-accent tracking-widest uppercase mb-6">
          {t('label')}
        </p>
        <div ref={headlineRef} className="overflow-hidden">
          <div className="overflow-hidden">
            <div
              className="headline-line font-display text-white uppercase leading-none"
              style={{
                fontSize: 'clamp(2.8rem, 13vw, 11rem)',
              }}
            >
              {t('headline_1')}
            </div>
          </div>
          <div className="overflow-hidden">
            <div
              className="headline-line font-display uppercase leading-none"
              style={{
                fontSize: 'clamp(2.8rem, 13vw, 11rem)',
                color: '#E8272A',
              }}
            >
              {t('headline_2')}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Content */}
        <div ref={contentRef}>
          <p className="font-ui text-off-white text-base lg:text-lg mb-6 lg:mb-10 max-w-xl">
            {t('subtitle')}
          </p>

          {/* Email — CTA primario */}
          <div className="mb-6 lg:mb-12">
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">
              {t('email_label')}
            </p>
            <a
              href={`mailto:${SOCIAL_LINKS.email}`}
              className="group flex items-center justify-between border-b border-border pb-4 hover:border-accent transition-colors duration-300"
            >
              <span
                className="font-display text-white uppercase"
                style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)' }}
              >
                {SOCIAL_LINKS.email}
              </span>
              <span className="font-mono text-2xl text-muted group-hover:text-accent group-hover:translate-x-2 transition-all duration-300">
                →
              </span>
            </a>
          </div>

          {/* Numbered links — formato editorial */}
          <div className="flex flex-wrap gap-4 lg:gap-6 mb-4 lg:mb-8">
            <a
              href={`mailto:${SOCIAL_LINKS.email}`}
              className="group flex items-center gap-2 font-mono text-xs text-muted hover:text-accent transition-colors duration-150 tracking-widest uppercase"
            >
              <span className="text-accent">01</span>
              <span className="group-hover:text-accent">/ Email</span>
            </a>
            <a
              href={SOCIAL_LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 font-mono text-xs text-muted hover:text-accent transition-colors duration-150 tracking-widest uppercase"
            >
              <span className="text-accent">02</span>
              <span>/ LinkedIn</span>
            </a>
            <a
              href={SOCIAL_LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 font-mono text-xs text-muted hover:text-accent transition-colors duration-150 tracking-widest uppercase"
            >
              <span className="text-accent">03</span>
              <span>/ GitHub</span>
            </a>
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 font-mono text-xs text-muted hover:text-accent transition-colors duration-150 tracking-widest uppercase"
            >
              <span className="text-accent">04</span>
              <span>/ Instagram</span>
            </a>
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 font-mono text-xs text-muted hover:text-accent transition-colors duration-150 tracking-widest uppercase"
            >
              <span className="text-accent">05</span>
              <span>/ WhatsApp {SOCIAL_LINKS.phone}</span>
            </a>
          </div>

          {/* Secondary CTAs */}
          <div className="flex flex-wrap gap-4 mb-8 lg:mb-16">
            <a
              href={SOCIAL_LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="
                font-ui font-bold text-sm text-white
                border border-border px-6 py-3
                tracking-widest uppercase
                transition-all duration-200
                hover:border-accent hover:text-accent
              "
            >
              {t('linkedin_label')} ↗
            </a>
            <a
              href={SOCIAL_LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="
                font-ui font-bold text-sm text-white
                border border-border px-6 py-3
                tracking-widest uppercase
                transition-all duration-200
                hover:border-accent hover:text-accent
              "
            >
              {t('github_label')} ↗
            </a>
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="
                font-ui font-bold text-sm text-white
                border border-border px-6 py-3
                tracking-widest uppercase
                transition-all duration-200
                hover:border-accent hover:text-accent
              "
            >
              {t('instagram_label')} ↗
            </a>
            <a
              href={cvHref}
              target="_blank"
              rel="noopener noreferrer"
              className="
                font-ui font-bold text-sm text-white
                bg-accent px-6 py-3
                tracking-widest uppercase
                transition-all duration-200
                hover:bg-accent-dark hover:shadow-btn-hover
              "
            >
              Download CV ↓
            </a>
          </div>
        </div>

        {/* Logo-symbol ECG — bookend narrativo */}
        <div className="flex justify-center py-8 lg:py-16">
          <div
            style={{
              width: 80,
              height: 80,
              opacity: 0.25,
              filter: 'brightness(0) invert(1)',
            }}
          >
            <img
              src="/logos/logo-symbol.svg"
              alt=""
              aria-hidden="true"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>

        {/* Footer bottom */}
        <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Image
            src="/logos/logo-jpr-monogram.svg"
            alt="JPR"
            width={40}
            height={28}
            className="h-7 w-auto opacity-60"
          />
          <p className="font-mono text-xs text-border hidden sm:block">
            Built with Next.js · GSAP · Tailwind
          </p>
          <p className="font-mono text-xs text-border">
            {t('copyright')}
          </p>
        </div>
      </div>
    </section>
  );
}
