'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import MetricCounter from '../ui/MetricCounter';
import StackBadge from '../ui/StackBadge';
import {
  TRAUMAVISION_METRICS,
  TRAUMAVISION_STACK,
  TRAUMAVISION_SCREENSHOTS,
  ELEVEN_STACK,
  HACKATHON_STACK,
} from '../../lib/content';

export default function Projects() {
  const t = useTranslations('projects');
  const sectionRef = useRef<HTMLElement>(null);
  const traumavisionRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);
  const [activeScreenshot, setActiveScreenshot] = useState(0);

  useEffect(() => {
    let cleanup = false;

    const animate = async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      if (cleanup) return;

      if (traumavisionRef.current) {
        gsap.fromTo(
          traumavisionRef.current,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: traumavisionRef.current,
              start: 'top 75%',
            },
          }
        );
      }

      if (secondaryRef.current) {
        const cards = secondaryRef.current.querySelectorAll('.project-card');
        gsap.fromTo(
          cards,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            stagger: 0.12,
            scrollTrigger: {
              trigger: secondaryRef.current,
              start: 'top 75%',
            },
          }
        );
      }
    };

    animate();
    return () => { cleanup = true; };
  }, []);

  const metricLabels: Record<string, string> = {
    auc: t('traumavision.metric_auc'),
    accuracy: t('traumavision.metric_accuracy'),
    sensitivity: t('traumavision.metric_sensitivity'),
    f1: t('traumavision.metric_f1'),
  };

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="py-24 lg:py-32 bg-bg border-t border-border"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section label */}
        <p className="font-mono text-xs text-accent tracking-widest uppercase mb-4">
          {t('label')}
        </p>

        {/* TraumaVision — Full width featured */}
        <div
          ref={traumavisionRef}
          className="mb-16 bg-surface border border-border overflow-hidden"
          style={{
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = '#E8272A';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-card-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = '#2A2A2A';
            (e.currentTarget as HTMLDivElement).style.boxShadow = '';
          }}
        >
          {/* Header */}
          <div className="p-6 lg:p-8 border-b border-border">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-accent tracking-widest uppercase mb-2">
                  {t('traumavision.label')}
                </p>
                <h2
                  className="font-display text-white uppercase leading-none mb-2"
                  style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
                >
                  {t('traumavision.title')}
                </h2>
                <p className="font-ui text-off-white text-lg">
                  {t('traumavision.subtitle')}
                </p>
              </div>
            </div>
          </div>

          {/* Screenshot gallery */}
          <div className="relative">
            {/* Main screenshot */}
            <div className="relative aspect-video w-full overflow-hidden bg-bg">
              <Image
                src={TRAUMAVISION_SCREENSHOTS[activeScreenshot].src}
                alt={TRAUMAVISION_SCREENSHOTS[activeScreenshot].alt}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>

            {/* Thumbnail dots */}
            <div className="flex items-center gap-2 p-4 border-t border-border overflow-x-auto">
              {TRAUMAVISION_SCREENSHOTS.map((shot, i) => (
                <button
                  key={i}
                  onClick={() => setActiveScreenshot(i)}
                  className={`
                    relative flex-shrink-0 w-16 h-10 overflow-hidden border transition-all duration-150
                    ${i === activeScreenshot ? 'border-accent' : 'border-border hover:border-surface-alt'}
                  `}
                  aria-label={`View screenshot ${i + 1}`}
                >
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div className="p-6 lg:p-8 border-t border-border">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              {TRAUMAVISION_METRICS.map((metric) => (
                <MetricCounter
                  key={metric.key}
                  value={metric.value}
                  decimals={metric.decimals}
                  suffix={metric.suffix}
                  label={metricLabels[metric.key] || metric.key}
                  duration={1.5}
                />
              ))}
            </div>

            {/* Pipeline */}
            <div className="mb-6 p-4 bg-bg border border-border">
              <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">
                {t('traumavision.pipeline_label')}
              </p>
              <p className="font-mono text-sm text-off-white tracking-wide">
                X-Ray{' '}
                <span className="text-accent">→</span>{' '}
                DenseNet{' '}
                <span className="text-accent">→</span>{' '}
                YOLOv8{' '}
                <span className="text-accent">→</span>{' '}
                Grad-CAM{' '}
                <span className="text-accent">→</span>{' '}
                Output
              </p>
            </div>

            {/* Stack */}
            <div>
              <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">
                {t('traumavision.stack_label')}
              </p>
              <div className="flex flex-wrap gap-2">
                {TRAUMAVISION_STACK.map((tech) => (
                  <StackBadge key={tech} label={tech} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary cards */}
        <div
          ref={secondaryRef}
          className="grid md:grid-cols-2 gap-6"
        >
          {/* Eleven */}
          <div
            className="project-card p-6 bg-surface border border-border flex flex-col gap-4 bracket-corner"
            style={{ transition: 'border-color 0.3s ease, box-shadow 0.3s ease' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#E8272A';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-card-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#2A2A2A';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '';
            }}
          >
            <div>
              <p className="font-mono text-xs text-accent tracking-widest uppercase mb-1">
                {t('eleven.subtitle')}
              </p>
              <h3 className="font-display text-white uppercase leading-tight mb-2"
                style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
              >
                {t('eleven.title')}
              </h3>
              <p className="font-ui text-off-white text-base leading-relaxed">
                {t('eleven.description')}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">
                Role
              </p>
              <p className="font-ui font-bold text-off-white text-sm">{t('eleven.role')}</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-auto">
              {ELEVEN_STACK.map((tech) => (
                <StackBadge key={tech} label={tech} />
              ))}
            </div>
            <a
              href="https://eleven-pagina.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-block font-ui font-bold text-xs text-accent
                border border-accent px-4 py-2
                tracking-widest uppercase
                transition-all duration-150
                hover:bg-accent hover:text-white
                self-start
              "
            >
              {t('eleven.cta')}
            </a>
          </div>

          {/* Hackathon */}
          <div
            className="project-card p-6 bg-surface border border-border flex flex-col gap-4 bracket-corner"
            style={{ transition: 'border-color 0.3s ease, box-shadow 0.3s ease' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#E8272A';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-card-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#2A2A2A';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '';
            }}
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <p className="font-mono text-xs text-accent tracking-widest uppercase">
                  {t('hackathon.subtitle')}
                </p>
                <span className="font-mono text-xs text-white bg-accent px-2 py-0.5">
                  {t('hackathon.badge')}
                </span>
              </div>
              <h3 className="font-display text-white uppercase leading-tight mb-2"
                style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
              >
                {t('hackathon.title')}
              </h3>
              <p className="font-ui text-off-white text-base leading-relaxed">
                {t('hackathon.description')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mt-auto">
              {HACKATHON_STACK.map((tech) => (
                <StackBadge key={tech} label={tech} />
              ))}
            </div>
            {/* Hackathon photo */}
            <div className="relative h-32 overflow-hidden border border-border mt-2">
              <Image
                src="/images/hackathon-stage.jpg"
                alt="Rocking the Industry 2025"
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
