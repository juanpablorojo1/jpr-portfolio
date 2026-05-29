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

          // Cluster fade up — scrub-driven
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

          // Badges — scrub-driven
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

  const clusters = [
    {
      title: t('cluster_ai.title'),
      items: ['PyTorch', 'DenseNet', 'YOLOv8', 'Grad-CAM', 'Claude API', 'Scikit-learn', 'NumPy', 'Pandas'],
    },
    {
      title: t('cluster_web.title'),
      items: ['Next.js', 'React', 'FastAPI', 'Supabase', 'GSAP', 'Vercel', 'SQLite', 'Python'],
    },
    {
      title: t('cluster_bio.title'),
      items: ['CDSS / SaMD', 'JCI Compliance', 'ISO / IEC', 'ANMAT', 'Medical Devices', 'ICU Equipment'],
    },
  ];

  return (
    <section
      id="skills"
      ref={sectionRef}
      className="py-32 lg:py-40 bg-bg"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section label */}
        <p className="font-mono text-xs text-accent tracking-widest uppercase mb-6">
          {t('label')}
        </p>

        <h2
          className="font-display text-white uppercase leading-none mb-8"
          style={{ fontSize: 'clamp(3rem, 7vw, 6rem)' }}
        >
          Tech Stack
        </h2>

        {/* Marquee de tech stack */}
        <div className="relative overflow-hidden mb-16 border-y border-border py-3">
          <div
            className="flex gap-8 whitespace-nowrap"
            style={{
              animation: 'marquee 25s linear infinite',
              width: 'max-content',
            }}
          >
            {['PyTorch', 'YOLOv8', 'DenseNet', 'Claude API', 'Next.js', 'FastAPI', 'Supabase', 'GSAP', 'Grad-CAM', 'Scikit-learn', 'React', 'Vercel', 'SQLite', 'JCI Standards', 'Medical Devices', 'PyTorch', 'YOLOv8', 'DenseNet', 'Claude API', 'Next.js', 'FastAPI', 'Supabase', 'GSAP', 'Grad-CAM', 'Scikit-learn'].map((tech, i) => (
              <span key={i} className="font-mono text-xs text-muted uppercase tracking-widest">
                <span className="text-muted mr-2">·</span>{tech}
              </span>
            ))}
          </div>
        </div>

        {/* Clusters grid */}
        <div
          ref={clustersRef}
          className="grid md:grid-cols-3 gap-8"
        >
          {clusters.map((cluster, i) => (
            <div
              key={i}
              className="skill-cluster relative overflow-hidden pt-8 border-t border-border"
            >
              <span aria-hidden="true" className="absolute top-4 right-6 font-display text-[10rem] lg:text-[14rem] text-white opacity-[0.07] pointer-events-none select-none leading-none">
                {String(i + 1).padStart(2, '0')}
              </span>
              {/* Cluster header */}
              <div className="mb-5 pb-4 border-b border-border">
                <h3 className="font-ui font-bold text-white text-2xl tracking-wide uppercase">
                  {cluster.title}
                </h3>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-3">
                {cluster.items.map((item) => (
                  <span key={item} className="badge-item">
                    <StackBadge label={item} />
                  </span>
                ))}
              </div>

              {/* Métricas TraumaVision — solo cluster AI */}
              {i === 0 && (
                <p className="mt-4 pt-3 border-t border-border font-mono text-xs text-off-white tracking-wide">
                  AUC-ROC 0.973 · mAP50 0.919 · Clinical deployment
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Languages row */}
        <div className="mt-16 pt-8 border-t border-border flex flex-wrap gap-8">
          <div>
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">English</p>
            <p className="font-ui font-bold text-white text-base">B2 — EF Campus UK + California</p>
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
