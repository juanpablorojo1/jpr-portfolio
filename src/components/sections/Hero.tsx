'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

const HeroCanvas = dynamic(() => import('../canvas/HeroCanvas'), { ssr: false });

export default function Hero() {
  const t = useTranslations('hero');
  const titleRef = useRef<HTMLDivElement>(null);
  const surnameRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const ctasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cleanup = false;

    const animate = async () => {
      const { default: gsap } = await import('gsap');
      if (cleanup) return;

      const tl = gsap.timeline({ delay: 0.1 });

      // Name reveal — clip path from bottom
      tl.fromTo(
        titleRef.current,
        { clipPath: 'inset(100% 0 0 0)', opacity: 1 },
        { clipPath: 'inset(0% 0 0 0)', duration: 0.8, ease: 'expo.out' }
      );
      tl.fromTo(
        surnameRef.current,
        { clipPath: 'inset(100% 0 0 0)', opacity: 1 },
        { clipPath: 'inset(0% 0 0 0)', duration: 0.8, ease: 'expo.out' },
        '-=0.6'
      );

      // Role + tagline fade up
      tl.fromTo(
        roleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
        '-=0.3'
      );
      tl.fromTo(
        taglineRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
        '-=0.4'
      );

      // CTAs
      tl.fromTo(
        ctasRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
        '-=0.3'
      );
    };

    animate();
    return () => { cleanup = true; };
  }, []);

  const handleViewWork = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-bg bg-tech-grid"
    >
      {/* Particle canvas */}
      <HeroCanvas />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-24 pb-16">
        <div className="max-w-4xl">
          {/* Name */}
          <div className="overflow-hidden mb-0">
            <div
              ref={titleRef}
              className="font-display text-white leading-none tracking-widest uppercase"
              style={{
                fontSize: 'clamp(4rem, 10vw, 8rem)',
                clipPath: 'inset(100% 0 0 0)',
              }}
            >
              {t('title')}
            </div>
          </div>
          <div className="overflow-hidden mb-4">
            <div
              ref={surnameRef}
              className="font-display leading-none tracking-widest uppercase"
              style={{
                fontSize: 'clamp(4rem, 10vw, 8rem)',
                color: '#E8272A',
                clipPath: 'inset(100% 0 0 0)',
              }}
            >
              {t('surname')}
            </div>
          </div>

          {/* Role */}
          <div
            ref={roleRef}
            className="font-ui font-bold text-off-white tracking-widest uppercase text-sm md:text-base mb-4 opacity-0"
          >
            {t('role')}
          </div>

          {/* Tagline */}
          <div
            ref={taglineRef}
            className="font-ui text-off-white text-lg md:text-2xl leading-relaxed mb-10 max-w-2xl opacity-0"
          >
            {t('tagline')}
          </div>

          {/* CTAs */}
          <div ref={ctasRef} className="flex flex-wrap gap-4 opacity-0">
            <a
              href="#projects"
              onClick={handleViewWork}
              className="
                inline-block font-ui font-bold text-sm text-white
                border border-accent px-8 py-3
                tracking-widest uppercase
                transition-all duration-200
                hover:bg-accent
                hover:shadow-btn-hover
              "
            >
              {t('cta1')}
            </a>
            <a
              href="/CV_Juan_Pablo_Rojo_EN.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-block font-ui font-bold text-sm text-accent
                border border-border px-8 py-3
                tracking-widest uppercase
                transition-all duration-200
                hover:border-accent hover:text-white hover:bg-accent/10
              "
            >
              {t('cta2')}
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
        <span className="font-mono text-xs text-muted tracking-widest uppercase">scroll</span>
        <div className="w-px h-12 bg-gradient-to-b from-border to-transparent" />
      </div>
    </section>
  );
}
