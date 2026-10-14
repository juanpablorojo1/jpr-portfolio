'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ExperienceStage from './ExperienceStage';
import { whenNoGallery } from '../../lib/idle';
import { phoneReveal } from '../../lib/phoneMotion';
import './experience-phone.css';

// Experience — data-driven from messages experience.*. Two layouts in the same #experience block:
// - .ex-classic (these columns): phones/tablets (<1024) and desktop without the 3D scene (reduced motion, ?static, no GPU).
// - ExperienceStage: desktop ≥1024 with the «Señal» scene — the vertical ECG (ecg.js + experience-senal.css).
// Below 1024 (2026-10-14, mobile-senal): phone design in experience-phone.css (.exm-*). The vertical ECG becomes an SVG
// trace in the gutter of the roles, drawn by the scroll (short scrub, no pin) with one beat per role; the beat lights
// its role when the trace front passes it. Phone-only pieces are display:none outside the < 1024 block.

const pad2 = (n: number) => String(n).padStart(2, '0');

/** The trace down the gutter (x = 9 of a 30 px wide SVG): flat, and one P-QRS-T per role with its R peak (pointing at
 *  the role, to the right) at the role's year line. y in px of the list. */
function ecgPath(beats: number[], h: number): string {
  let d = 'M9 0';
  for (const y of beats) {
    d += ` V${(y - 26).toFixed(1)} q5 4 0 8 V${(y - 6).toFixed(1)} L5 ${(y - 3).toFixed(1)} L27 ${y.toFixed(1)} L2 ${(y + 7).toFixed(1)} L9 ${(y + 11).toFixed(1)} V${(y + 28).toFixed(1)} q7 6 0 12`;
  }
  return `${d} V${h.toFixed(1)}`;
}

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

    // con la galería de escritorio activa esta versión está oculta: sus animaciones esperan (D-01)
    const stopWait = whenNoGallery(sectionRef.current, () => { animate(); });
    return () => { cleanup = true; stopWait(); };
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

  // Phone (< 1024): entrances (phoneMotion) + the ECG trace of the roles
  useEffect(() => (sectionRef.current ? phoneReveal(sectionRef.current) : undefined), []);
  useEffect(() => {
    const list = itemsRef.current;
    const svg = list?.querySelector<SVGSVGElement>('.exm-ecg');
    const trace = svg?.querySelector<SVGPathElement>('.exm-trace');
    const ghost = svg?.querySelector<SVGPathElement>('.exm-ghost');
    const head = svg?.querySelector<SVGCircleElement>('.exm-head');
    if (!list || !svg || !trace || !ghost || !head) return;
    const items = Array.from(list.querySelectorAll<HTMLElement>('.timeline-item'));
    let beats: number[] = [];
    let len = 1;
    const build = () => {
      const h = list.offsetHeight;
      // the R peak on the middle of the year line of each role
      beats = items.map((it) => {
        const y = it.querySelector<HTMLElement>('.exm-year');
        return it.offsetTop + (y ? y.offsetTop + y.offsetHeight / 2 : 10);
      });
      const d = ecgPath(beats, h);
      svg.setAttribute('viewBox', `0 0 30 ${h}`);
      svg.style.height = `${h}px`;
      trace.setAttribute('d', d);
      ghost.setAttribute('d', d);
      len = trace.getTotalLength() || 1;
    };

    const mm = gsap.matchMedia();
    mm.add({ phone: '(max-width: 1023px)', still: '(prefers-reduced-motion: reduce)' }, (ctx) => {
      if (!ctx.conditions?.phone) return;
      build();
      let lastH = list.offsetHeight;
      const ro = new ResizeObserver(() => {
        if (list.offsetHeight === lastH) return;
        lastH = list.offsetHeight;
        build();
        ScrollTrigger.refresh();
      });
      ro.observe(list);
      if (ctx.conditions.still) {
        // reduced motion: the whole trace, every role lit, nothing moves
        trace.style.strokeDashoffset = '0';
        items.forEach((it) => it.setAttribute('data-beat', ''));
        return () => { ro.disconnect(); trace.style.strokeDashoffset = ''; items.forEach((it) => it.removeAttribute('data-beat')); };
      }
      gsap.registerPlugin(ScrollTrigger);
      const lit = new Set<number>();
      const st = ScrollTrigger.create({
        trigger: list,
        // the front of the trace runs at ~68 % of the screen: just under where the eye reads
        start: 'top 68%',
        end: 'bottom 68%',
        scrub: 0.35,
        onUpdate: (self) => {
          const p = self.progress;
          trace.style.strokeDashoffset = String(1 - p);
          const pt = trace.getPointAtLength(p * len);
          head.setAttribute('cx', pt.x.toFixed(1));
          head.setAttribute('cy', pt.y.toFixed(1));
          head.style.opacity = p > 0.001 && p < 0.999 ? '1' : '0';
          // a role lights the first time the front passes its beat (it stays lit: one beat per role)
          beats.forEach((y, i) => {
            if (!lit.has(i) && pt.y >= y - 2) { lit.add(i); items[i].setAttribute('data-beat', ''); }
          });
        },
      });
      return () => {
        st.kill(); ro.disconnect();
        trace.style.strokeDashoffset = ''; head.style.opacity = '';
        items.forEach((it) => it.removeAttribute('data-beat'));
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <div id="experience">
    <section
      ref={sectionRef}
      className="ex-classic relative bg-bg pt-10 pb-10 lg:py-0 lg:min-h-screen lg:flex lg:flex-col lg:justify-center"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <p data-pm="rise" className="exm-label font-mono text-xs text-accent tracking-widest uppercase mb-3 lg:mb-4">
          <span className="exm-sq" aria-hidden="true" />{t('label')}
        </p>
        {/* phone only (display:none ≥ 1024): the headline and the count of each group, like the desktop stage */}
        <h2 className="exm-title font-display" data-pm="lines" data-pm-d="0.1" aria-label={t('label')}>
          <span data-pm-lines>{t('label')}</span>
        </h2>
        <ul className="exm-counts" data-pm="group" data-pm-d="0.25">
          <li data-pm-i><b>{pad2(experienceItems.length)}</b>{t('work_label')}</li>
          <li data-pm-i><b>{pad2(educationItems.length)}</b>{t('education_label')}</li>
          <li data-pm-i><b>{pad2(recognitionItems.length)}</b>{t('recognition_label')}</li>
        </ul>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Work experience */}
          <div>
            <div className="exm-ghead flex items-baseline gap-4 mb-4" data-pm="rise">
              <span className="font-mono text-xs text-accent tracking-widest uppercase">{t('work_label')}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="exm-list relative" ref={itemsRef}>
              {/* phone only: the ECG of the roles (path built from the measured positions, drawn by the scroll) */}
              <svg className="exm-ecg" viewBox="0 0 30 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path className="exm-ghost" d="M9 0 V100" />
                <path className="exm-trace" pathLength={1} d="M9 0 V100" />
                <circle className="exm-head" r="3.5" cx="9" cy="0" />
              </svg>
              {/* Vertical line */}
              <div
                ref={lineRef}
                className="exm-desk absolute left-0 top-0 bottom-0 w-0.5 bg-border"
                style={{ transformOrigin: 'top center' }}
              />

              <div className="exm-roles flex flex-col gap-4 lg:gap-5 pl-6">
                {experienceItems.map((item, i) => (
                  <div key={i} className="timeline-item relative">
                    {/* Per-item vertical connector — grows scaleY with scroll */}
                    <div
                      className="timeline-item-line exm-desk absolute left-0 top-0 bottom-0 w-0.5 bg-border -translate-x-6"
                      style={{ transformOrigin: 'top center' }}
                    />

                    {/* Dot — rombo with one-shot ping ring */}
                    <div className="exm-desk absolute -left-[1.75rem] top-2">
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

                    <p className="exm-year font-mono text-sm text-accent tracking-widest uppercase mb-2">
                      {item.year}
                    </p>
                    <p
                      className="exm-co font-display text-white uppercase leading-none mb-1"
                      style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)' }}
                    >
                      {item.company}
                    </p>
                    <div className="exm-rolewrap overflow-hidden">
                      <p
                        className="timeline-role exm-role font-ui text-off-white text-base font-bold tracking-wide uppercase mb-1"
                        style={{ clipPath: 'inset(0 100% 0 0)' }}
                      >
                        {item.role}
                      </p>
                    </div>
                    {/* full text on every width (the phone used to clamp it to 3 lines) */}
                    <p className="exm-desc font-ui text-muted text-sm leading-snug">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Education + Recognition */}
          <div className="exm-side flex flex-col gap-8 lg:gap-10">
            {[
              { key: 'edu', label: t('education_label'), items: educationItems },
              { key: 'rec', label: t('recognition_label'), items: recognitionItems },
            ].map((group) => (
              <div key={group.label} className="exm-group" data-g={group.key}>
                <div className="exm-ghead flex items-baseline gap-4 mb-5" data-pm="rise">
                  <span className="font-mono text-xs text-accent tracking-widest uppercase">{group.label}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="flex flex-col gap-4 lg:gap-6" data-pm="group">
                  {group.items.map((item, i) => (
                    <div
                      key={i}
                      data-pm-i
                      className="exm-entry pl-6 border-l-2 border-border py-2"
                    >
                      <p className="exm-eyear font-mono text-xs text-accent tracking-widest uppercase mb-1">
                        {item.year}
                      </p>
                      <p className="exm-inst font-ui font-bold text-white text-2xl leading-tight">
                        {item.institution}
                      </p>
                      <p className="exm-deg font-ui text-off-white text-base font-bold tracking-wide uppercase mb-1">
                        {item.degree}
                      </p>
                      {item.detail && (
                        <p className="exm-detail font-mono text-sm text-muted mt-2">
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
    <ExperienceStage />
    </div>
  );
}
