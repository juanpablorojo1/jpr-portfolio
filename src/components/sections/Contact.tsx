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
        gsap.fromTo(
          lines,
          { clipPath: 'inset(100% 0 0 0)', opacity: 1 },
          {
            clipPath: 'inset(0% 0 0 0)',
            duration: 0.8,
            ease: 'expo.out',
            stagger: 0.1,
            scrollTrigger: {
              trigger: headlineRef.current,
              start: 'top 85%',
            },
          }
        );
      }

      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: contentRef.current,
              start: 'top 85%',
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
      className="py-24 lg:py-32 bg-bg border-t border-border"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section label */}
        <p className="font-mono text-xs text-accent tracking-widest uppercase mb-6">
          {t('label')}
        </p>

        {/* Headline */}
        <div ref={headlineRef} className="mb-10 overflow-hidden">
          <div className="overflow-hidden">
            <div
              className="headline-line font-display text-white uppercase leading-none"
              style={{
                fontSize: 'clamp(3rem, 8vw, 7rem)',
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
                fontSize: 'clamp(3rem, 8vw, 7rem)',
                color: '#E8272A',
                clipPath: 'inset(100% 0 0 0)',
              }}
            >
              {t('headline_2')}
            </div>
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef}>
          <p className="font-ui text-off-white text-lg mb-10 max-w-xl">
            {t('subtitle')}
          </p>

          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-6 mb-16">
            <a
              href={`mailto:${SOCIAL_LINKS.email}`}
              className="
                group flex items-center gap-3
                font-ui font-bold text-white text-lg
                border-b border-border pb-2
                hover:border-accent hover:text-accent
                transition-all duration-200
              "
            >
              <span className="font-mono text-xs text-muted uppercase tracking-widest w-20">
                {t('email_label')}
              </span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">
                {SOCIAL_LINKS.email}
              </span>
            </a>
          </div>

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

        {/* Footer bottom */}
        <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Image
            src="/logos/logo-jpr-monogram.svg"
            alt="JPR"
            width={40}
            height={28}
            className="h-7 w-auto opacity-60"
          />
          <p className="font-mono text-xs text-border">
            {t('copyright')}
          </p>
        </div>
      </div>
    </section>
  );
}
