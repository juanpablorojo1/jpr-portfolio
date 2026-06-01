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
  const ageDisplayRef = useRef<HTMLSpanElement>(null);
  const ageAnimatedRef = useRef(false);

  useEffect(() => {
    let cleanup = false;

    const animate = async () => {
      // Skip GSAP scrub animations on mobile — elements render visible via CSS
      if (typeof window !== 'undefined' && window.innerWidth < 1024) return;
      // Respect prefers-reduced-motion — elements render fully visible via CSS fallback
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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
      className="relative py-10 lg:py-32 bg-bg overflow-hidden"
    >

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section label */}
        <p className="font-mono text-xs text-accent tracking-widest uppercase mb-4">
          {t('label')}
        </p>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-24 items-start">
          {/* Text side */}
          <div>
            {/* Headline — staggered line-by-line reveal */}
            <h2
              className="font-display uppercase leading-tight mb-4 lg:mb-8"
              style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}
            >
              <div ref={headlineRef}>
                <div className="overflow-hidden">
                  <div
                    className="headline-line text-white"
                  >
                    From Biology to Code,
                  </div>
                </div>
                <div className="overflow-hidden">
                  <div
                    className="headline-line"
                    style={{ color: '#E8272A' }}
                  >
                    From Lab to Product
                  </div>
                </div>
              </div>
            </h2>

            {/* Paragraphs */}
            <div ref={paragraphsRef} className="flex flex-col gap-3 lg:gap-5">
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
              className="mt-4 lg:mt-8 font-ui text-base text-accent italic"
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
                <span className="font-ui text-sm text-accent flex items-center gap-2">
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  Available
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div>
                <span className="font-mono text-xs text-muted uppercase tracking-widest">Age </span>
                <span ref={ageDisplayRef} className="font-ui text-sm text-off-white">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
