'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { SOCIAL_LINKS } from '../../lib/content';

export default function Contact() {
  const t = useTranslations('contact');
  const headlineRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cleanup = false;

    const animate = async () => {
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

        // Pin del headline — momento dramático de cierre (independiente del scrub)
        ScrollTrigger.create({
          trigger: headlineRef.current,
          start: 'top 40%',
          end: '+=150',
          pin: true,
          pinSpacing: true,
        });
      }

      if (contentRef.current) {
        // Content fade — scrub-driven
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            ease: 'none',
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
      className="py-24 lg:py-32 bg-bg"
    >
      {/* Full-bleed headline */}
      <div className="w-full px-6 lg:px-16 mb-10 overflow-hidden">
        <p className="max-w-7xl mx-auto font-mono text-xs text-accent tracking-widest uppercase mb-6">
          {t('label')}
        </p>
        <div ref={headlineRef} className="overflow-hidden">
          <div className="overflow-hidden">
            <div
              className="headline-line font-display text-white uppercase leading-none"
              style={{
                fontSize: 'clamp(4.5rem, 13vw, 11rem)',
                clipPath: 'inset(100% 0 0 0)',
              }}
            >
              {t('headline_1')}
            </div>
          </div>
          <div className="overflow-hidden">
            <div
              className="headline-line font-display uppercase leading-none"
              style={{
                fontSize: 'clamp(4.5rem, 13vw, 11rem)',
                color: '#E8272A',
                clipPath: 'inset(100% 0 0 0)',
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
          <p className="font-ui text-off-white text-lg mb-10 max-w-xl">
            {t('subtitle')}
          </p>

          {/* Email — CTA primario */}
          <div className="mb-12">
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
          <div className="flex gap-8 mb-8">
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
          </div>

          {/* Secondary CTAs */}
          <div className="flex flex-wrap gap-4 mb-16">
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
              href="/CV_Juan_Pablo_Rojo_EN.pdf"
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
        <div className="flex justify-center py-16">
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
