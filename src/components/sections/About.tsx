'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

export default function About() {
  const t = useTranslations('about');
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const paragraphsRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const subTaglineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let cleanup = false;

    const animate = async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      if (cleanup) return;

      // Headline reveal
      if (headlineRef.current) {
        gsap.fromTo(
          headlineRef.current,
          { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
          {
            clipPath: 'inset(0 0% 0 0)',
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: headlineRef.current,
              start: 'top 85%',
            },
          }
        );
      }

      // Paragraphs fade up
      if (paragraphsRef.current) {
        const paras = paragraphsRef.current.querySelectorAll('p');
        gsap.fromTo(
          paras,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            stagger: 0.15,
            scrollTrigger: {
              trigger: paragraphsRef.current,
              start: 'top 80%',
            },
          }
        );
      }

      // Sub-tagline
      if (subTaglineRef.current) {
        gsap.fromTo(
          subTaglineRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: subTaglineRef.current,
              start: 'top 85%',
            },
          }
        );
      }

      // Photo parallax
      if (photoRef.current) {
        gsap.fromTo(
          photoRef.current,
          { opacity: 0, x: 30 },
          {
            opacity: 1,
            x: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: photoRef.current,
              start: 'top 80%',
            },
          }
        );

        gsap.to(photoRef.current, {
          y: -30,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        });
      }
    };

    animate();
    return () => { cleanup = true; };
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-bg border-t border-border overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section label */}
        <p className="font-mono text-xs text-accent tracking-widest uppercase mb-4">
          {t('label')}
        </p>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* Text side */}
          <div>
            {/* Headline */}
            <h2
              ref={headlineRef}
              className="font-display text-white uppercase leading-tight mb-8"
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                clipPath: 'inset(0 100% 0 0)',
              }}
            >
              {t('headline')}
            </h2>

            {/* Paragraphs */}
            <div ref={paragraphsRef} className="flex flex-col gap-5">
              <p className="font-ui text-off-white text-body-lg leading-relaxed">
                {t('p1')}
              </p>
              <p className="font-ui text-off-white text-body-lg leading-relaxed">
                {t('p2')}
              </p>
              <p className="font-ui text-off-white text-body-lg leading-relaxed">
                {t('p3')}
              </p>
              <p
                className="font-display text-white uppercase leading-tight"
                style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}
              >
                {t('p4')}
              </p>
            </div>

            {/* Sub-tagline */}
            <p
              ref={subTaglineRef}
              className="mt-8 font-mono text-sm text-accent tracking-wide italic"
            >
              — {t('sub_tagline')}
            </p>
          </div>

          {/* Photo side */}
          <div ref={photoRef} className="relative">
            <div className="relative aspect-[3/4] max-w-sm mx-auto lg:mx-0">
              {/* Corner bracket effect */}
              <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-accent z-10" />
              <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-accent z-10" />

              <Image
                src="/images/portrait.jpg"
                alt="Juan Pablo Rojo"
                fill
                className="object-cover object-top grayscale hover:grayscale-0 transition-all duration-700"
                sizes="(max-width: 768px) 80vw, 40vw"
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-bg/60 to-transparent" />
            </div>

            {/* Decorative info card */}
            <div className="mt-6 p-4 bg-surface border border-border">
              <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">Location</p>
              <p className="font-ui font-bold text-white">Córdoba, Argentina</p>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <p className="font-ui font-bold text-accent text-sm">Open to opportunities</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
