'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import StackBadge from '../ui/StackBadge';
import StackStage from './StackStage';
import { whenNoGallery } from '../../lib/idle';
import { phoneReveal } from '../../lib/phoneMotion';
import './stack-phone.css';

// Stack — data-driven from messages skills.*. Two layouts in the same #skills block:
// - .sk-classic (this grid): phones/tablets (<1024) and desktop without the 3D scene (reduced motion, ?static, no GPU).
// - StackStage: desktop ≥1024 with the «Señal» scene — the layered network (network.js + stack-senal.css).
// Below 1024 (2026-10-14, mobile-senal): phone design in stack-phone.css (.skm-*): the layers as a vertical list, one
// per group, threaded by the red line (SVG) with a node at each layer; staggered entrance (phoneMotion).
// Phone-only pieces are display:none outside the < 1024 block.

export default function Skills() {
  const t = useTranslations('skills');
  const sectionRef = useRef<HTMLElement>(null);
  const clustersRef = useRef<HTMLDivElement>(null);

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

      if (clustersRef.current) {
        const clusters = clustersRef.current.querySelectorAll('.skill-cluster');

        clusters.forEach((cluster) => {
          const badges = cluster.querySelectorAll('.badge-item');

          gsap.fromTo(
            cluster,
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: cluster,
                start: 'top bottom',
                end: 'top 30%',
                scrub: 1.5,
              },
            }
          );

          gsap.fromTo(
            badges,
            { opacity: 0, y: 10 },
            {
              opacity: 1,
              y: 0,
              ease: 'none',
              stagger: 0.04,
              scrollTrigger: {
                trigger: cluster,
                start: 'top bottom',
                end: 'top 10%',
                scrub: 1,
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

  useEffect(() => (sectionRef.current ? phoneReveal(sectionRef.current) : undefined), []);

  const clusterKeys = ['cluster_ai', 'cluster_web', 'cluster_tools', 'cluster_bio'] as const;
  const headline = t('headline');

  const MARQUEE_ITEMS = [
    'PyTorch', 'YOLOv8m', 'Claude API', 'Next.js', 'FastAPI', 'Supabase', 'GSAP',
    'HyperFrames', 'Tailwind', 'Playwright MCP',
    'Multi-Agent Orchestration', 'Prompt Caching', 'Vercel', 'TypeScript', 'WebGL',
    'PyDICOM', 'Anthropic SDK', 'MCP Protocol', 'Remotion', 'Extended Thinking',
  ];

  return (
    <div id="skills">
    <section
      ref={sectionRef}
      className="sk-classic py-10 lg:py-24 lg:pb-32 bg-bg"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <p data-pm="rise" className="skm-label font-mono text-xs text-accent tracking-widest uppercase mb-3 lg:mb-6">
          <span className="skm-sq" aria-hidden="true" />{t('label')}
        </p>

        <h2
          data-pm="lines" data-pm-d="0.1" aria-label={headline}
          className="skm-title font-display text-white uppercase leading-none mb-4 lg:mb-8"
          style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)' }}
        >
          <span data-pm-lines>{headline}</span>
        </h2>

        {/* Marquee */}
        <div className="marquee-container relative overflow-hidden mb-8 lg:mb-16 border-y border-border py-3">
          <div
            className="marquee-content flex gap-8 whitespace-nowrap"
            style={{ animation: 'marquee 30s linear infinite', width: 'max-content' }}
          >
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((tech, i) => (
              <span key={i} className="font-mono text-xs text-muted uppercase tracking-widest">
                <span className="text-muted mr-2">·</span>{tech}
              </span>
            ))}
          </div>
        </div>

        {/* 4-cluster grid — 2 cols mobile, 2 cols md+, 4 cols xl */}
        <div
          ref={clustersRef}
          className="skm-layers grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-8"
        >
          {clusterKeys.map((key, i) => {
            const items = t.raw(`${key}.items`) as string[];
            const title = t(`${key}.title`);

            return (
              <div
                key={key}
                className="skill-cluster relative overflow-visible lg:overflow-hidden pt-4 lg:pt-8 border-t border-border"
              >
                {/* phone only: the red thread of this layer (drawn when the layer arrives) and its node */}
                <svg className="skm-thread" data-pm="draw" viewBox="0 0 2 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                  <path className="pm-trace" pathLength={1} d="M1 0 V100" />
                  <path className="pm-head" pathLength={1} d="M1 0 V100" />
                </svg>
                <div className="skm-lhead mb-3 lg:mb-5 pb-3 lg:pb-4 border-b border-border" data-pm="rise">
                  <span className="skm-node" aria-hidden="true" />
                  <span className="skm-idx" aria-hidden="true">{String(i + 1).padStart(2, '0')}<i> / {String(clusterKeys.length).padStart(2, '0')}</i></span>
                  <h3 className="skm-ltitle font-ui font-bold text-white text-base lg:text-xl tracking-wide uppercase">
                    {title}
                  </h3>
                </div>

                <div className="skm-items flex flex-wrap gap-1.5 lg:gap-2" data-pm="rise" data-pm-d="0.12">
                  {items.map((item) => (
                    <span key={item} className="badge-item">
                      <StackBadge label={item} className="text-[10px] lg:text-xs px-1.5 lg:px-2 py-0.5 tracking-normal lg:tracking-widest" />
                    </span>
                  ))}
                </div>

                {i === 0 && (
                  <p className="skm-metric mt-4 pt-3 border-t border-border font-mono text-xs text-off-white tracking-wide" data-pm="rise">
                    {t('ai_metrics')}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Languages row */}
        <div className="skm-langs mt-8 lg:mt-16 pt-6 lg:pt-8 border-t border-border flex flex-wrap gap-6 lg:gap-8" data-pm="group">
          <div data-pm-i>
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">{t('lang_en_label')}</p>
            <p className="font-ui font-bold text-white text-base">{t('lang_en_value')}</p>
          </div>
          <div className="w-px bg-border" />
          <div data-pm-i>
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">{t('lang_es_label')}</p>
            <p className="font-ui font-bold text-white text-base">{t('lang_es_value')}</p>
          </div>
        </div>
      </div>
    </section>
    <StackStage />
    </div>
  );
}
