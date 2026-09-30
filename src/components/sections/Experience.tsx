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

  const experienceItems = t.raw('items') as ExperienceItem[];
  const educationItems = t.raw('education') as EducationItem[];
  const recognitionItems = t.raw('recognition') as EducationItem[];

  useEffect(() => {
    let cleanup = false;

    const animate = async () => {
      // Skip GSAP scrub animations on mobile — elements render visible
      if (typeof window !== 'undefined' && window.innerWidth < 1024) return;
      // Respect prefers-reduced-motion — elements render fully visible via CSS fallback
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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
              end: 'bottom bottom', // complete when the card is fully shown (pin moment)
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

        // Per-item vertical lines — scaleY scrub (each grows as its item enters)
        const itemLines = itemsRef.current.querySelectorAll('.timeline-item-line');
        itemLines.forEach((line, idx) => {
          const item = items[idx];
          if (!item) return;
          gsap.fromTo(
            line,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: item,
                start: 'top bottom',
                end: 'bottom bottom',
                scrub: 1.2,
              },
            }
          );
        });

        // Role clip-path reveal — horizontal wipe with scrub
        const roles = itemsRef.current.querySelectorAll('.timeline-role');
        roles.forEach((role, idx) => {
          const item = items[idx];
          if (!item) return;
          gsap.fromTo(
            role,
            { clipPath: 'inset(0 100% 0 0)' },
            {
              clipPath: 'inset(0 0% 0 0)',
              ease: 'none',
              scrollTrigger: {
                trigger: item,
                start: 'top bottom',
                end: 'bottom bottom', // fully revealed before Contact can cover the item
                scrub: 1.5,
              },
            }
          );
        });
      }
    };

    animate();
    return () => { cleanup = true; };
  }, []);

  // Tall-card guard (desktop card stack). The TransitionZone sticks at top:0, so if
  // this section is taller than the viewport its bottom would never scroll into view
  // before Contact covers it. When it overflows, stick at top = -(overflow): the card
  // scrolls until its bottom meets the viewport bottom, then pins and Contact slides
  // over as before. When it fits, top stays 0 (unchanged behaviour). Mobile ignores
  // this: the card stack is disabled there via CSS (!important).
  useEffect(() => {
    const zone = sectionRef.current?.closest('.transition-zone') as HTMLElement | null;
    if (!zone) return;
    const update = () => {
      const overflow = zone.offsetHeight - window.innerHeight;
      zone.style.top = window.innerWidth >= 1024 && overflow > 0 ? `${-overflow}px` : '0px';
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(zone);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      zone.style.top = '0px';
    };
  }, []);

  // Dot ping on enter — one-shot IntersectionObserver
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;
    const pings = itemsRef.current?.querySelectorAll('.timeline-dot-ping');
    if (!pings) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.style.opacity = '0.6';
            el.classList.add('animate-ping');
            // Remove ping after one cycle so it doesn't loop forever
            setTimeout(() => {
              el.classList.remove('animate-ping');
              el.style.opacity = '0';
            }, 900);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.8 }
    );

    pings.forEach((ping) => observer.observe(ping));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="experience"
      ref={sectionRef}
      className="relative bg-bg pt-10 pb-10 lg:py-0 lg:min-h-screen lg:flex lg:flex-col lg:justify-center"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <p className="font-mono text-xs text-accent tracking-widest uppercase mb-3 lg:mb-4">
          {t('label')}
        </p>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Work experience */}
          <div>
            <div className="flex items-baseline gap-4 mb-4">
              <span className="font-mono text-xs text-accent tracking-widest uppercase">{t('work_label')}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="relative" ref={itemsRef}>
              {/* Vertical line */}
              <div
                ref={lineRef}
                className="absolute left-0 top-0 bottom-0 w-0.5 bg-border"
                style={{ transformOrigin: 'top center' }}
              />

              <div className="flex flex-col gap-4 lg:gap-5 pl-6">
                {experienceItems.map((item, i) => (
                  <div key={i} className="timeline-item relative">
                    {/* Per-item vertical connector — grows scaleY with scroll */}
                    <div
                      className="timeline-item-line absolute left-0 top-0 bottom-0 w-0.5 bg-border -translate-x-6"
                      style={{ transformOrigin: 'top center' }}
                    />

                    {/* Dot — rombo with one-shot ping ring */}
                    <div className="absolute -left-[1.75rem] top-2">
                      {/* Ping ring — revealed via IntersectionObserver */}
                      <div
                        className="timeline-dot-ping absolute inset-0 w-3 h-3 bg-accent opacity-0"
                        style={{ transform: 'rotate(45deg)', animationDuration: '1s' }}
                      />
                      <div
                        className="timeline-dot w-3 h-3 bg-accent"
                        style={{ transform: 'rotate(45deg)' }}
                      />
                    </div>

                    <p className="font-mono text-sm text-accent tracking-widest uppercase mb-2">
                      {item.year}
                    </p>
                    <p
                      className="font-display text-white uppercase leading-none mb-1"
                      style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)' }}
                    >
                      {item.company}
                    </p>
                    <div className="overflow-hidden">
                      <p
                        className="timeline-role font-ui text-off-white text-base font-bold tracking-wide uppercase mb-1"
                        style={{ clipPath: 'inset(0 100% 0 0)' }}
                      >
                        {item.role}
                      </p>
                    </div>
                    <p className="font-ui text-muted text-sm leading-snug line-clamp-3 lg:line-clamp-none">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Education + Recognition */}
          <div className="flex flex-col gap-8 lg:gap-10">
            {[
              { label: t('education_label'), items: educationItems },
              { label: t('recognition_label'), items: recognitionItems },
            ].map((group) => (
              <div key={group.label}>
                <div className="flex items-baseline gap-4 mb-5">
                  <span className="font-mono text-xs text-accent tracking-widest uppercase">{group.label}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="flex flex-col gap-4 lg:gap-6">
                  {group.items.map((item, i) => (
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
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
