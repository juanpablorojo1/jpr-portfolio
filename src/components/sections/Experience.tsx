'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

type ExperienceItem = {
  year: string;
  company: string;
  role: string;
  description: string;
};

type EducationItem = {
  year: string;
  institution: string;
  degree: string;
  detail: string;
};

export default function Experience() {
  const t = useTranslations('experience');
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);

  const experienceItems: ExperienceItem[] = [
    {
      year: t('items.0.year'),
      company: t('items.0.company'),
      role: t('items.0.role'),
      description: t('items.0.description'),
    },
    {
      year: t('items.1.year'),
      company: t('items.1.company'),
      role: t('items.1.role'),
      description: t('items.1.description'),
    },
    {
      year: t('items.2.year'),
      company: t('items.2.company'),
      role: t('items.2.role'),
      description: t('items.2.description'),
    },
    {
      year: t('items.3.year'),
      company: t('items.3.company'),
      role: t('items.3.role'),
      description: t('items.3.description'),
    },
  ];

  const educationItems: EducationItem[] = [
    {
      year: t('education.0.year'),
      institution: t('education.0.institution'),
      degree: t('education.0.degree'),
      detail: t('education.0.detail'),
    },
    {
      year: t('education.1.year'),
      institution: t('education.1.institution'),
      degree: t('education.1.degree'),
      detail: t('education.1.detail'),
    },
  ];

  useEffect(() => {
    let cleanup = false;

    const animate = async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      if (cleanup) return;

      // Timeline line draw
      if (lineRef.current) {
        gsap.fromTo(
          lineRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            transformOrigin: 'top center',
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 70%',
              end: 'bottom 80%',
              scrub: 1,
            },
          }
        );
      }

      // Timeline items — scrub-driven
      if (itemsRef.current) {
        const items = itemsRef.current.querySelectorAll('.timeline-item');
        const dots = itemsRef.current.querySelectorAll('.timeline-dot');

        gsap.fromTo(
          items,
          { opacity: 0, x: -20 },
          {
            opacity: 1,
            x: 0,
            ease: 'none',
            stagger: 0.08,
            scrollTrigger: {
              trigger: itemsRef.current,
              start: 'top bottom',
              end: 'top 20%',
              scrub: 1.5,
            },
          }
        );

        // elastic.out is incompatible with scrub — use back.out instead
        gsap.fromTo(
          dots,
          { scale: 0 },
          {
            scale: 1,
            ease: 'back.out(1.7)',
            stagger: 0.08,
            scrollTrigger: {
              trigger: itemsRef.current,
              start: 'top bottom',
              end: 'top 30%',
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
      id="experience"
      ref={sectionRef}
      className="relative pt-8 pb-6 lg:pt-10 lg:pb-8 bg-bg"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <p className="font-mono text-xs text-accent tracking-widest uppercase mb-4">
          {t('label')}
        </p>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Work experience */}
          <div>
            <div className="flex items-baseline gap-4 mb-4">
              <span className="font-mono text-xs text-accent tracking-widest uppercase">Work</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="relative" ref={itemsRef}>
              {/* Vertical line */}
              <div
                ref={lineRef}
                className="absolute left-0 top-0 bottom-0 w-0.5 bg-border"
                style={{ transformOrigin: 'top center' }}
              />

              <div className="flex flex-col gap-5 pl-6">
                {experienceItems.map((item, i) => (
                  <div key={i} className="timeline-item relative">
                    {/* Dot — rombo */}
                    <div
                      className="timeline-dot absolute -left-[1.75rem] top-2 w-3 h-3 bg-accent"
                      style={{ transform: 'rotate(45deg)' }}
                    />

                    <p className="font-mono text-sm text-accent tracking-widest uppercase mb-2">
                      {item.year}
                    </p>
                    <p
                      className="font-display text-white uppercase leading-none mb-1"
                      style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)' }}
                    >
                      {item.company}
                    </p>
                    <p className="font-ui text-off-white text-base font-bold tracking-wide uppercase mb-1">
                      {item.role}
                    </p>
                    <p className="font-ui text-muted text-sm leading-snug">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Education */}
          <div>
            <div className="flex items-baseline gap-4 mb-5">
              <span className="font-mono text-xs text-accent tracking-widest uppercase">Education</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="flex flex-col gap-6">
              {educationItems.map((item, i) => (
                <div
                  key={i}
                  className="pl-6 border-l-2 border-border py-2"
                >
                  <p className="font-mono text-xs text-accent tracking-widest uppercase mb-1">
                    {item.year}
                  </p>
                  <p className="font-ui font-bold text-white text-2xl leading-tight">
                    {item.institution}
                  </p>
                  <p className="font-ui text-off-white text-base font-bold tracking-wide uppercase mb-1">
                    {item.degree}
                  </p>
                  {item.detail && (
                    <p className="font-mono text-sm text-muted mt-2">
                      {item.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
