'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import StackBadge from '../ui/StackBadge';

export default function Skills() {
  const t = useTranslations('skills');
  const sectionRef = useRef<HTMLElement>(null);
  const clustersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cleanup = false;

    const animate = async () => {
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

    animate();
    return () => { cleanup = true; };
  }, []);

  const clusterKeys = ['cluster_ai', 'cluster_web', 'cluster_content', 'cluster_bio'] as const;

  const MARQUEE_ITEMS = [
    'PyTorch', 'YOLOv8m', 'Claude API', 'Next.js', 'FastAPI', 'Supabase', 'GSAP',
    'HyperFrames', 'Gemini Imagen 3', 'DALL-E 3', 'Tailwind', 'Playwright MCP',
    'Multi-agent', 'Prompt Caching', 'Vercel', 'TypeScript', 'OGL · WebGL',
    'PyDICOM', 'VS Code', 'GitHub Copilot', 'Remotion', 'Meta API',
  ];

  return (
    <section
      id="skills"
      ref={sectionRef}
      className="py-14 lg:py-32 bg-bg"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <p className="font-mono text-xs text-accent tracking-widest uppercase mb-6">
          {t('label')}
        </p>

        <h2
          className="font-display text-white uppercase leading-none mb-8"
          style={{ fontSize: 'clamp(3rem, 7vw, 6rem)' }}
        >
          Tech Stack
        </h2>

        {/* Marquee */}
        <div className="relative overflow-hidden mb-16 border-y border-border py-3">
          <div
            className="flex gap-8 whitespace-nowrap"
            style={{ animation: 'marquee 30s linear infinite', width: 'max-content' }}
          >
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((tech, i) => (
              <span key={i} className="font-mono text-xs text-muted uppercase tracking-widest">
                <span className="text-muted mr-2">·</span>{tech}
              </span>
            ))}
          </div>
        </div>

        {/* 4-cluster grid — 2 cols on md+, 4 cols on xl */}
        <div
          ref={clustersRef}
          className="grid md:grid-cols-2 xl:grid-cols-4 gap-8"
        >
          {clusterKeys.map((key, i) => {
            const items = t.raw(`${key}.items`) as string[];
            const title = t(`${key}.title`);

            return (
              <div
                key={key}
                className="skill-cluster relative overflow-hidden pt-8 border-t border-border"
              >
                <div className="mb-5 pb-4 border-b border-border">
                  <h3 className="font-ui font-bold text-white text-xl tracking-wide uppercase">
                    {title}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {items.map((item) => (
                    <span key={item} className="badge-item">
                      <StackBadge label={item} />
                    </span>
                  ))}
                </div>

                {i === 0 && (
                  <p className="mt-4 pt-3 border-t border-border font-mono text-xs text-off-white tracking-wide">
                    AUC-ROC 0.973 · mAP50 0.919
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Languages row */}
        <div className="mt-16 pt-8 border-t border-border flex flex-wrap gap-8">
          <div>
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">English</p>
            <p className="font-ui font-bold text-white text-base">B2 — LTC Eastbourne + California</p>
          </div>
          <div className="w-px bg-border" />
          <div>
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">Spanish</p>
            <p className="font-ui font-bold text-white text-base">Native</p>
          </div>
        </div>
      </div>
    </section>
  );
}
