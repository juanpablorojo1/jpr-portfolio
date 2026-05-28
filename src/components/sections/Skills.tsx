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

        clusters.forEach((cluster, i) => {
          const badges = cluster.querySelectorAll('.badge-item');

          gsap.fromTo(
            cluster,
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: 'power2.out',
              delay: i * 0.15,
              scrollTrigger: {
                trigger: cluster,
                start: 'top 80%',
              },
            }
          );

          gsap.fromTo(
            badges,
            { opacity: 0, y: 10 },
            {
              opacity: 1,
              y: 0,
              duration: 0.4,
              ease: 'power2.out',
              stagger: 0.04,
              delay: i * 0.15 + 0.2,
              scrollTrigger: {
                trigger: cluster,
                start: 'top 80%',
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
      icon: '◈',
    },
    {
      title: t('cluster_web.title'),
      items: ['Next.js', 'React', 'FastAPI', 'Supabase', 'GSAP', 'Vercel', 'SQLite', 'Python'],
      icon: '◇',
    },
    {
      title: t('cluster_bio.title'),
      items: ['CDSS / SaMD', 'JCI Compliance', 'ISO / IEC', 'ANMAT', 'Medical Devices', 'ICU Equipment'],
      icon: '⬡',
    },
  ];

  return (
    <section
      id="skills"
      ref={sectionRef}
      className="py-24 lg:py-32 bg-bg border-t border-border"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section label */}
        <p className="font-mono text-xs text-accent tracking-widest uppercase mb-4">
          {t('label')}
        </p>

        <h2
          className="font-display text-white uppercase leading-none mb-12"
          style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
        >
          Tech Stack
        </h2>

        {/* Clusters grid */}
        <div
          ref={clustersRef}
          className="grid md:grid-cols-3 gap-8"
        >
          {clusters.map((cluster, i) => (
            <div
              key={i}
              className="skill-cluster p-6 bg-surface border border-border"
            >
              {/* Cluster header */}
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
                <span className="text-accent text-xl font-mono" aria-hidden="true">
                  {cluster.icon}
                </span>
                <h3 className="font-ui font-bold text-white text-lg tracking-wide uppercase">
                  {cluster.title}
                </h3>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {cluster.items.map((item) => (
                  <span key={item} className="badge-item">
                    <StackBadge label={item} />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Languages row */}
        <div className="mt-8 p-6 bg-surface border border-border">
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">English</p>
              <p className="font-ui font-bold text-white text-sm">B2 — EF Campus UK + California</p>
            </div>
            <div className="w-px bg-border" />
            <div>
              <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">Spanish</p>
              <p className="font-ui font-bold text-white text-sm">Native</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
