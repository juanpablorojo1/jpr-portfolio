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
  ELEVEN_SCREENSHOTS,
  HACKATHON_STACK,
  HACKATHON_PHOTOS,
} from '../../lib/content';


export default function Projects() {
  const t = useTranslations('projects');
  const sectionRef = useRef<HTMLElement>(null);
  const traumavisionRef = useRef<HTMLDivElement>(null);
  const elevenRef = useRef<HTMLDivElement>(null);
  const hackathonRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  // Lightbox state: null = closed, number = index of open screenshot
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [elevenLightboxIndex, setElevenLightboxIndex] = useState<number | null>(null);

  // Scroll guard — skip 3D handler during GSAP scroll
  const isScrollingRef = useRef(false);

  // Staggered Y-offsets for screenshot grids [top-left, top-right, bottom-left, bottom-right]
  const STAGGER_Y = [-6, 0, 0, 6, 0, 0];

  // Reutilizable 3D hover handlers — only on desktop
  const handle3DMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isScrollingRef.current) return;
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 4;
    const rotateX = -((e.clientY - centerY) / (rect.height / 2)) * 4;
    e.currentTarget.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    e.currentTarget.style.transition = 'transform 0.1s ease';
  };

  const handle3DLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
    e.currentTarget.style.transition = 'transform 0.4s ease';
  };

  // Close TraumaVision lightbox on Escape/arrows
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex((i) => i !== null ? (i + 1) % TRAUMAVISION_SCREENSHOTS.length : null);
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => i !== null ? (i - 1 + TRAUMAVISION_SCREENSHOTS.length) % TRAUMAVISION_SCREENSHOTS.length : null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex]);

  // Close Eleven lightbox on Escape/arrows
  useEffect(() => {
    if (elevenLightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setElevenLightboxIndex(null);
      if (e.key === 'ArrowRight') setElevenLightboxIndex((i) => i !== null ? (i + 1) % ELEVEN_SCREENSHOTS.length : null);
      if (e.key === 'ArrowLeft') setElevenLightboxIndex((i) => i !== null ? (i - 1 + ELEVEN_SCREENSHOTS.length) % ELEVEN_SCREENSHOTS.length : null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [elevenLightboxIndex]);

  useEffect(() => {
    let cleanup = false;

    const animate = async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      if (cleanup) return;

      // Scroll horizontal: pinea el contenedor sticky y mueve el rail
      if (horizontalRef.current && railRef.current) {
        gsap.to(railRef.current, {
          x: () => -(railRef.current!.offsetWidth - window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      }

      // Progress dots — actualizar según posición
      if (railRef.current) {
        [0, 1, 2].forEach((i) => {
          const dot = document.querySelector(`[data-dot="${i}"]`) as HTMLElement;
          if (!dot) return;
          ScrollTrigger.create({
            trigger: sectionRef.current,
            start: `${i * 33.33}% top`,
            end: `${(i + 1) * 33.33}% top`,
            onEnter: () => { dot.style.background = '#E8272A'; },
            onLeave: () => { dot.style.background = '#2A2A2A'; },
            onEnterBack: () => { dot.style.background = '#E8272A'; },
            onLeaveBack: () => { dot.style.background = '#2A2A2A'; },
          });
        });
      }
    };

    // Scroll guard for 3D handlers
    let scrollTimer = 0;
    const onScroll = () => {
      isScrollingRef.current = true;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => { isScrollingRef.current = false; }, 150) as unknown as number;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    animate();
    return () => {
      cleanup = true;
      window.removeEventListener('scroll', onScroll);
      // No necesitamos matar ScrollTriggers aquí — GSAP los maneja en unmount
    };
  }, []);

  const metricLabels: Record<string, string> = {
    auc: t('traumavision.metric_auc'),
    map50: t('traumavision.metric_map50'),
    recall: t('traumavision.metric_recall'),
    f1: t('traumavision.metric_f1'),
  };

  return (
    <>
      <section
        id="projects"
        ref={sectionRef}
        className="py-0 bg-bg"
        style={{ height: '300vh' }}
      >
        {/* Sticky container — se pina y hace scroll horizontal */}
        <div
          ref={horizontalRef}
          className="sticky top-0 overflow-hidden"
          style={{ height: '100vh' }}
        >
          {/* Section label — esquina superior izquierda, fijo dentro del sticky */}
          <div className="absolute top-8 left-6 lg:left-12 z-10">
            <p className="font-mono text-xs text-accent tracking-widest uppercase">
              {t('label')}
            </p>
          </div>

          {/* Rail de proyectos — 3 paneles horizontales */}
          <div
            ref={railRef}
            className="flex"
            style={{ width: '300vw', height: '100%' }}
          >
            {/* ── Panel 1: TraumaVision ── */}
            <div
              ref={traumavisionRef}
              className="relative flex flex-col justify-center"
              style={{ width: '100vw', height: '100vh', padding: '6rem 3rem 3rem' }}
            >
              {/* Número editorial */}
              <div className="flex items-baseline gap-4 mb-6">
                <span className="font-mono text-xs text-accent tracking-widest">01</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Contenido del proyecto en grid 2 columnas desktop */}
              <div className="grid lg:grid-cols-2 gap-12 items-start max-w-7xl mx-auto w-full">
                {/* LEFT: texto + métricas */}
                <div>
                  <p className="font-mono text-xs text-accent tracking-widest uppercase mb-2">
                    {t('traumavision.label')}
                  </p>
                  <h2
                    className="font-display text-white uppercase leading-none mb-4"
                    style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)' }}
                  >
                    {t('traumavision.title')}
                  </h2>
                  <p className="font-ui text-off-white text-lg mb-8 max-w-lg">
                    {t('traumavision.subtitle')}
                  </p>

                  {/* Métricas */}
                  <div ref={metricsRef} className="grid grid-cols-2 gap-6 mb-8">
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
                  <div className="mb-6 border-l-2 border-accent pl-4">
                    <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">
                      {t('traumavision.pipeline_label')}
                    </p>
                    <p className="font-mono text-sm text-off-white tracking-wide">
                      DICOM <span className="text-accent">→</span> YOLOv8 <span className="text-accent">→</span> Grad-CAM <span className="text-accent">→</span> Output
                    </p>
                  </div>

                  {/* Stack */}
                  <div className="flex flex-wrap gap-2">
                    {TRAUMAVISION_STACK.map((tech) => (
                      <StackBadge key={tech} label={tech} />
                    ))}
                  </div>
                </div>

                {/* RIGHT: screenshots */}
                <div
                  className="grid grid-cols-2 gap-2 items-end"
                  style={{ transformStyle: 'preserve-3d' }}
                  onMouseMove={handle3DMove}
                  onMouseLeave={handle3DLeave}
                >
                  {TRAUMAVISION_SCREENSHOTS.map((shot, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxIndex(i)}
                      className="group relative overflow-hidden border border-border hover:border-accent transition-colors duration-150 focus:outline-none"
                      style={{ aspectRatio: '16/10', transform: `translateY(${STAGGER_Y[i]}px)`, transition: 'transform 0.3s ease' }}
                      aria-label={`View screenshot: ${shot.label}`}
                    >
                      <Image
                        src={shot.src}
                        alt={shot.alt}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="25vw"
                      />
                      <div className="absolute inset-0 bg-bg/0 group-hover:bg-bg/60 transition-colors duration-200 flex items-end p-2">
                        <span className="font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <span className="text-accent">{String(i + 1).padStart(2, '0')}</span>
                          <span className="text-off-white"> / {shot.label}</span>
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Panel 2: Eleven ── */}
            <div
              ref={elevenRef}
              className="relative flex flex-col justify-center"
              style={{ width: '100vw', height: '100vh', padding: '6rem 3rem 3rem' }}
            >
              <div className="flex items-baseline gap-4 mb-6">
                <span className="font-mono text-xs text-accent tracking-widest">02</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="grid lg:grid-cols-2 gap-12 items-start max-w-7xl mx-auto w-full">
                {/* LEFT */}
                <div>
                  <p className="font-mono text-xs text-accent tracking-widest uppercase mb-2">
                    {t('eleven.subtitle')}
                  </p>
                  <h2
                    className="font-display text-white uppercase leading-none mb-4"
                    style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)' }}
                  >
                    {t('eleven.title')}
                  </h2>
                  <p className="font-ui text-off-white text-lg mb-8 max-w-lg">
                    {t('eleven.description_expanded')}
                  </p>

                  {/* Stats */}
                  <div className="flex gap-12 mb-8 border-l-2 border-accent pl-6">
                    {[
                      { value: t('eleven.stat_founded'), label: t('eleven.stat_founded_label') },
                      { value: t('eleven.stat_sites'), label: t('eleven.stat_sites_label') },
                      { value: t('eleven.stat_approach'), label: t('eleven.stat_approach_label') },
                    ].map((stat, i) => (
                      <div key={i}>
                        <p className="font-mono text-2xl text-white tracking-tight mb-1">{stat.value}</p>
                        <p className="font-mono text-xs text-muted uppercase tracking-widest">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Stack */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {ELEVEN_STACK.map((tech) => (
                      <StackBadge key={tech} label={tech} />
                    ))}
                  </div>

                  <a
                    href="https://eleven-pagina.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-ui font-bold text-xs text-accent border border-accent px-4 py-2 tracking-widest uppercase transition-all duration-150 hover:bg-accent hover:text-white"
                  >
                    {t('eleven.cta')}
                  </a>
                </div>

                {/* RIGHT: screenshots */}
                <div
                  className="grid grid-cols-2 gap-2 items-end"
                  style={{ transformStyle: 'preserve-3d' }}
                  onMouseMove={handle3DMove}
                  onMouseLeave={handle3DLeave}
                >
                  {ELEVEN_SCREENSHOTS.map((shot, i) => (
                    <button
                      key={i}
                      onClick={() => setElevenLightboxIndex(i)}
                      className="group relative overflow-hidden border border-border hover:border-accent transition-colors duration-150 focus:outline-none"
                      style={{ aspectRatio: '16/10', transform: `translateY(${STAGGER_Y[i]}px)`, transition: 'transform 0.3s ease' }}
                      aria-label={`View screenshot: ${shot.label}`}
                    >
                      <Image
                        src={shot.src}
                        alt={shot.alt}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="25vw"
                      />
                      <div className="absolute inset-0 bg-bg/0 group-hover:bg-bg/60 transition-colors duration-200 flex items-end p-2">
                        <span className="font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <span className="text-accent">{String(i + 1).padStart(2, '0')}</span>
                          <span className="text-off-white"> / {shot.label}</span>
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Panel 3: Hackathon ── */}
            <div
              ref={hackathonRef}
              className="relative flex flex-col justify-center"
              style={{ width: '100vw', height: '100vh', padding: '6rem 3rem 3rem' }}
            >
              <div className="flex items-baseline gap-4 mb-6">
                <span className="font-mono text-xs text-accent tracking-widest">03</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="grid lg:grid-cols-2 gap-12 items-start max-w-7xl mx-auto w-full">
                {/* LEFT */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-mono text-xs text-accent tracking-widest uppercase">
                      {t('hackathon.subtitle')}
                    </p>
                    <span className="font-mono text-xs text-white bg-accent px-2 py-0.5">
                      {t('hackathon.badge')}
                    </span>
                  </div>
                  <h2
                    className="font-display text-white uppercase leading-none mb-4"
                    style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)' }}
                  >
                    {t('hackathon.title')}
                  </h2>
                  <p className="font-ui text-off-white text-lg mb-8 max-w-lg">
                    {t('hackathon.description_expanded')}
                  </p>

                  {/* Event stats */}
                  <div className="flex gap-12 mb-8 border-l-2 border-accent pl-6">
                    {[
                      { value: t('hackathon.event_stat_place'), label: 'Result' },
                      { value: t('hackathon.event_stat_team'), label: 'Team' },
                      { value: t('hackathon.event_stat_organizer'), label: 'Event' },
                    ].map((stat, i) => (
                      <div key={i}>
                        <p className="font-mono text-lg text-white tracking-tight mb-1">{stat.value}</p>
                        <p className="font-mono text-xs text-muted uppercase tracking-widest">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Stack */}
                  <div className="flex flex-wrap gap-2">
                    {HACKATHON_STACK.map((tech) => (
                      <StackBadge key={tech} label={tech} />
                    ))}
                  </div>
                </div>

                {/* RIGHT: fotos */}
                <div
                  className="grid grid-cols-2 gap-2 items-end"
                  style={{ transformStyle: 'preserve-3d' }}
                  onMouseMove={handle3DMove}
                  onMouseLeave={handle3DLeave}
                >
                  {HACKATHON_PHOTOS.slice(0, 4).map((photo, i) => (
                    <div
                      key={i}
                      className="group relative overflow-hidden border border-border"
                      style={{ aspectRatio: '4/3', transform: `translateY(${STAGGER_Y[i]}px)`, transition: 'transform 0.3s ease' }}
                    >
                      <Image
                        src={photo.src}
                        alt={photo.alt}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="25vw"
                      />
                      <div className="absolute inset-0 bg-bg/0 group-hover:bg-bg/40 transition-colors duration-200" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Indicador de progreso — puntitos abajo */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-border"
                style={{ transition: 'background 0.3s' }}
                data-dot={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* Lightbox — Eleven screenshots                               */}
      {/* ─────────────────────────────────────────────────────────── */}
      {elevenLightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
          onClick={() => setElevenLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot viewer"
        >
          <button
            className="absolute top-4 right-6 font-mono text-sm text-off-white hover:text-accent transition-colors duration-150 z-10"
            onClick={() => setElevenLightboxIndex(null)}
            aria-label="Close screenshot viewer"
          >
            [ESC] CLOSE
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-2xl text-off-white hover:text-accent transition-colors duration-150 z-10 px-3 py-2"
            onClick={(e) => { e.stopPropagation(); setElevenLightboxIndex((i) => i !== null ? (i - 1 + ELEVEN_SCREENSHOTS.length) % ELEVEN_SCREENSHOTS.length : null); }}
            aria-label="Previous screenshot"
          >←</button>
          <div
            className="relative max-w-5xl w-full mx-16 border border-accent"
            style={{ aspectRatio: '16/9' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={ELEVEN_SCREENSHOTS[elevenLightboxIndex].src}
              alt={ELEVEN_SCREENSHOTS[elevenLightboxIndex].alt}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center gap-2" style={{ backgroundColor: 'rgba(8,8,8,0.85)' }}>
              <span className="font-mono text-xs text-accent">{String(elevenLightboxIndex + 1).padStart(2, '0')}</span>
              <span className="font-mono text-xs text-off-white">/ {ELEVEN_SCREENSHOTS[elevenLightboxIndex].label}</span>
              <span className="font-mono text-xs text-muted ml-auto">{elevenLightboxIndex + 1} / {ELEVEN_SCREENSHOTS.length}</span>
            </div>
          </div>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-2xl text-off-white hover:text-accent transition-colors duration-150 z-10 px-3 py-2"
            onClick={(e) => { e.stopPropagation(); setElevenLightboxIndex((i) => i !== null ? (i + 1) % ELEVEN_SCREENSHOTS.length : null); }}
            aria-label="Next screenshot"
          >→</button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* Lightbox — TraumaVision screenshots                         */}
      {/* ─────────────────────────────────────────────────────────── */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot viewer"
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-6 font-mono text-sm text-off-white hover:text-accent transition-colors duration-150 z-10"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close screenshot viewer"
          >
            [ESC] CLOSE
          </button>

          {/* Prev arrow */}
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-2xl text-off-white hover:text-accent transition-colors duration-150 z-10 px-3 py-2"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) => i !== null ? (i - 1 + TRAUMAVISION_SCREENSHOTS.length) % TRAUMAVISION_SCREENSHOTS.length : null);
            }}
            aria-label="Previous screenshot"
          >
            ←
          </button>

          {/* Image */}
          <div
            className="relative max-w-5xl w-full mx-16 border border-accent"
            style={{ aspectRatio: '16/9' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={TRAUMAVISION_SCREENSHOTS[lightboxIndex].src}
              alt={TRAUMAVISION_SCREENSHOTS[lightboxIndex].alt}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
            {/* Screen label */}
            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center gap-2" style={{ backgroundColor: 'rgba(8,8,8,0.85)' }}>
              <span className="font-mono text-xs text-accent">
                {String(lightboxIndex + 1).padStart(2, '0')}
              </span>
              <span className="font-mono text-xs text-off-white">
                / {TRAUMAVISION_SCREENSHOTS[lightboxIndex].label}
              </span>
              <span className="font-mono text-xs text-muted ml-auto">
                {lightboxIndex + 1} / {TRAUMAVISION_SCREENSHOTS.length}
              </span>
            </div>
          </div>

          {/* Next arrow */}
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-2xl text-off-white hover:text-accent transition-colors duration-150 z-10 px-3 py-2"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) => i !== null ? (i + 1) % TRAUMAVISION_SCREENSHOTS.length : null);
            }}
            aria-label="Next screenshot"
          >
            →
          </button>
        </div>
      )}
    </>
  );
}
