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

      // Timeline items
      if (itemsRef.current) {
        const items = itemsRef.current.querySelectorAll('.timeline-item');
        const dots = itemsRef.current.querySelectorAll('.timeline-dot');

        gsap.fromTo(
          items,
          { opacity: 0, x: -20 },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            ease: 'power2.out',
            stagger: 0.1,
            scrollTrigger: {
              trigger: itemsRef.current,
              start: 'top 80%',
            },
          }
        );

        gsap.fromTo(
          dots,
          { scale: 0 },
          {
            scale: 1,
            duration: 0.4,
            ease: 'elastic.out(1, 0.3)',
            stagger: 0.1,
            scrollTrigger: {
              trigger: itemsRef.current,
              start: 'top 80%',
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
      className="py-24 lg:py-32 bg-bg border-t border-border"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <p className="font-mono text-xs text-accent tracking-widest uppercase mb-4">
          {t('label')}
        </p>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Work experience */}
          <div>
            <h2
              className="font-display text-white uppercase leading-none mb-10"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
            >
              Work
            </h2>

            <div className="relative" ref={itemsRef}>
              {/* Vertical line */}
              <div
                ref={lineRef}
                className="absolute left-0 top-0 bottom-0 w-px bg-border"
                style={{ transformOrigin: 'top center' }}
              />

              <div className="flex flex-col gap-8 pl-6">
                {experienceItems.map((item, i) => (
                  <div key={i} className="timeline-item relative">
                    {/* Dot */}
                    <div className="timeline-dot absolute -left-[1.625rem] top-1 w-2 h-2 rounded-full bg-accent" />

                    <p className="font-mono text-xs text-accent tracking-widest uppercase mb-1">
                      {item.year}
                    </p>
                    <p className="font-ui font-bold text-white text-lg leading-tight">
                      {item.company}
                    </p>
                    <p className="font-ui text-off-white text-sm font-bold tracking-wide uppercase mb-1">
                      {item.role}
                    </p>
                    <p className="font-ui text-muted text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Education */}
          <div>
            <h2
              className="font-display text-white uppercase leading-none mb-10"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
            >
              Education
            </h2>

            <div className="flex flex-col gap-6">
              {educationItems.map((item, i) => (
                <div
                  key={i}
                  className="p-5 bg-surface border border-border"
                  style={{ transition: 'border-color 0.2s ease' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#E8272A';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#2A2A2A';
                  }}
                >
                  <p className="font-mono text-xs text-accent tracking-widest uppercase mb-1">
                    {item.year}
                  </p>
                  <p className="font-ui font-bold text-white text-lg leading-tight">
                    {item.institution}
                  </p>
                  <p className="font-ui text-off-white text-sm font-bold tracking-wide uppercase mb-1">
                    {item.degree}
                  </p>
                  {item.detail && (
                    <p className="font-mono text-xs text-muted mt-2">
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
