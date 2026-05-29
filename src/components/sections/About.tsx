'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

export default function About() {
  const t = useTranslations('about');
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
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

      // Headline reveal — scrub-driven, animates in as section enters viewport
      if (headlineRef.current) {
        const lines = headlineRef.current.querySelectorAll('.headline-line');
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
      }

      // Paragraphs fade up — scrub-driven
      if (paragraphsRef.current) {
        const paras = paragraphsRef.current.querySelectorAll('p');
        gsap.fromTo(
          paras,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            ease: 'none',
            stagger: 0.1,
            scrollTrigger: {
              trigger: paragraphsRef.current,
              start: 'top bottom',
              end: 'top 20%',
              scrub: 1,
            },
          }
        );
      }

      // Sub-tagline — scrub-driven
      if (subTaglineRef.current) {
        gsap.fromTo(
          subTaglineRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: subTaglineRef.current,
              start: 'top bottom',
              end: 'top 30%',
              scrub: 1,
            },
          }
        );
      }

      // Photo entrance — scrub-driven
      if (photoRef.current) {
        gsap.fromTo(
          photoRef.current,
          { opacity: 0, x: 30 },
          {
            opacity: 1,
            x: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: photoRef.current,
              start: 'top bottom',
              end: 'top 20%',
              scrub: 1,
            },
          }
        );

        // Parallax — scrub already in place
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
      className="relative py-24 lg:py-32 bg-bg overflow-hidden"
    >

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section label */}
        <p className="font-mono text-xs text-accent tracking-widest uppercase mb-4">
          {t('label')}
        </p>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* Text side */}
          <div>
            {/* Headline — staggered line-by-line reveal */}
            <h2
              className="font-display uppercase leading-tight mb-8"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}
            >
              <div ref={headlineRef}>
                <div className="overflow-hidden">
                  <div
                    className="headline-line text-white"
                    style={{ clipPath: 'inset(100% 0 0 0)' }}
                  >
                    From Biology to Code,
                  </div>
                </div>
                <div className="overflow-hidden">
                  <div
                    className="headline-line"
                    style={{ clipPath: 'inset(100% 0 0 0)', color: '#E8272A' }}
                  >
                    From Lab to Product
                  </div>
                </div>
              </div>
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
              <p className="font-ui text-off-white text-body-lg leading-relaxed">
                {t('p4')}
              </p>
            </div>

            {/* Sub-tagline */}
            <p
              ref={subTaglineRef}
              className="mt-8 font-ui text-base text-accent italic"
            >
              — {t('sub_tagline')}
            </p>
          </div>

          {/* Photo side — sticky while text scrolls */}
          <div ref={photoRef} className="relative lg:sticky lg:top-24 lg:self-start">
            <div className="relative aspect-[4/5] max-w-md mx-auto lg:mx-0">
              <Image
                src="/images/portrait.jpg"
                alt="Juan Pablo Rojo"
                fill
                className="object-cover object-top grayscale"
                sizes="(max-width: 768px) 80vw, 40vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg/60 to-transparent" />
            </div>

            {/* Metadata bar */}
            <div className="mt-6 flex items-center gap-6 border-t border-border pt-4">
              <div>
                <span className="font-mono text-xs text-muted uppercase tracking-widest">Location </span>
                <span className="font-ui text-sm text-off-white">Córdoba, AR</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div>
                <span className="font-mono text-xs text-muted uppercase tracking-widest">Status </span>
                <span className="font-ui text-sm text-accent">Available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
