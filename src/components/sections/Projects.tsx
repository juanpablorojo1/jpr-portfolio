'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import MetricCounter from '../ui/MetricCounter';
import StackBadge from '../ui/StackBadge';
import CaseLightbox, { type CaseShot } from '../ui/CaseLightbox';
import { CaseStudyPanel, CaseStudyMobile, type CaseStudyData, type CaseDecision, type CaseStat } from './CaseStudy';
import {
  TRAUMAVISION_METRICS,
  TRAUMAVISION_STACK,
  TRAUMAVISION_SCREENSHOTS,
  ELEVEN_STACK,
  ELEVEN_SCREENSHOTS,
  KIBBO_URL,
  KIBBO_STACK,
  KIBBO_SCREENSHOTS,
  KIBBO_SEO_SCREENSHOTS,
  LEEX_STACK,
  LEEX_SCREENSHOTS,
  PROJECT_PANEL_WIDTHS,
  HACKATHON_STACK,
  HACKATHON_PHOTOS,
} from '../../lib/content';


// Rail math (desktop): section height = RAIL_UNITS × 100vh, rail width = RAIL_UNITS × 100vw.
const RAIL_UNITS: number = PROJECT_PANEL_WIDTHS.reduce((a: number, b: number) => a + b, 0);
const PANEL_STARTS: number[] = PROJECT_PANEL_WIDTHS.map((_, i) =>
  PROJECT_PANEL_WIDTHS.slice(0, i).reduce((a: number, b: number) => a + b, 0)
);

type ShotCopy = { label: string; caption: string };
const withSrc = (srcs: readonly string[], copy: ShotCopy[]): CaseShot[] =>
  srcs.map((src, i) => ({ src, label: copy[i]?.label ?? '', caption: copy[i]?.caption ?? '' }));

export default function Projects() {
  const t = useTranslations('projects');
  const sectionRef = useRef<HTMLElement>(null);
  const traumavisionRef = useRef<HTMLDivElement>(null);
  const elevenRef = useRef<HTMLDivElement>(null);
  const hackathonRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  // Scroll position where the rail starts moving (from its ScrollTrigger). The section
  // lives inside a sticky card, so its bounding rect can't tell us that.
  const railStartRef = useRef<() => number | null>(() => null);

  // Lightbox state: null = closed, number = index of open screenshot
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [elevenLightboxIndex, setElevenLightboxIndex] = useState<number | null>(null);
  const [kibboLightboxIndex, setKibboLightboxIndex] = useState<number | null>(null);
  const [leexLightboxIndex, setLeexLightboxIndex] = useState<number | null>(null);
  const openKibbo = useCallback((i: number | null) => setKibboLightboxIndex(i), []);
  const openLeex = useCallback((i: number | null) => setLeexLightboxIndex(i), []);
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
      // Respect prefers-reduced-motion — skip scroll-driven GSAP animations
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      if (cleanup) return;

      // Scroll horizontal: pinea el contenedor sticky y mueve el rail (desktop only)
      if (horizontalRef.current && railRef.current && window.innerWidth >= 1024) {
        const tween = gsap.to(railRef.current, {
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
        railStartRef.current = () => tween.scrollTrigger?.start ?? null;
      }

      // Progress dots — one per project. Panels can be wider than 100vw (case
      // studies = 2 spreads), so each dot's range is its panel's share of the rail.
      if (railRef.current) {
        PANEL_STARTS.forEach((startUnits, i) => {
          const dot = document.querySelector(`[data-dot="${i}"]`) as HTMLElement;
          if (!dot) return;
          // Switch dots at mid-transition (next panel ≥ 50% in view), not at the exact edge.
          const isLast = i === PANEL_STARTS.length - 1;
          const from = startUnits - 0.5; // i = 0 → lights up as the rail docks
          const to = isLast ? RAIL_UNITS : startUnits + PROJECT_PANEL_WIDTHS[i] - 0.5;
          ScrollTrigger.create({
            trigger: sectionRef.current,
            start: `${(from / RAIL_UNITS) * 100}% top`,
            end: `${(to / RAIL_UNITS) * 100}% top`,
            onEnter: () => { dot.style.background = '#E8272A'; dot.style.width = '12px'; },
            onLeave: () => { dot.style.background = '#555555'; dot.style.width = '6px'; },
            onEnterBack: () => { dot.style.background = '#E8272A'; dot.style.width = '12px'; },
            onLeaveBack: () => { dot.style.background = '#555555'; dot.style.width = '6px'; },
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

  // Keyboard: when focus lands on something in an off-screen part of the rail, scroll the
  // page to the spread that contains it (the rail follows the page scroll).
  useEffect(() => {
    const rail = railRef.current;
    const section = sectionRef.current;
    if (!rail || !section) return;
    const onFocusIn = (e: FocusEvent) => {
      if (window.innerWidth < 1024) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const r = target.getBoundingClientRect();
      // Mouse clicks / focus on something already on screen: leave the page alone
      if (r.left >= 0 && r.right <= window.innerWidth) return;
      // Position inside the rail (independent of the current GSAP offset)
      const x = r.left - rail.getBoundingClientRect().left;
      const unit = Math.min(Math.max(Math.floor(x / window.innerWidth), 0), RAIL_UNITS - 1);
      const sync = () => {
        const start = railStartRef.current();
        if (start === null) return;
        const top = start + unit * window.innerHeight;
        if (Math.abs(window.scrollY - top) > 2) {
          window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
        }
      };
      // The browser's own focus-scroll runs after focusin (smoothly, html has
      // scroll-behavior: smooth) and would override us: wait until the page scroll
      // settles, then sync.
      clearTimeout(settleTimer);
      window.removeEventListener('scroll', onScrollSettle);
      pendingSync = sync;
      window.addEventListener('scroll', onScrollSettle, { passive: true });
      settleTimer = window.setTimeout(flush, 180);
    };
    let settleTimer = 0;
    let pendingSync: (() => void) | null = null;
    const flush = () => {
      window.removeEventListener('scroll', onScrollSettle);
      const fn = pendingSync;
      pendingSync = null;
      fn?.();
    };
    const onScrollSettle = () => {
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(flush, 180);
    };
    rail.addEventListener('focusin', onFocusIn);
    return () => {
      rail.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('scroll', onScrollSettle);
      clearTimeout(settleTimer);
    };
  }, []);

  const kibboShots = withSrc(KIBBO_SCREENSHOTS, t.raw('kibbo.shots') as ShotCopy[]);
  const kibboSeoShots = withSrc(KIBBO_SEO_SCREENSHOTS, t.raw('kibbo.seo_shots') as ShotCopy[]);
  const kibbo: CaseStudyData = {
    number: '04',
    eyebrow: t('kibbo.eyebrow'),
    title: t('kibbo.title'),
    subtitle: t('kibbo.subtitle'),
    problem: t('kibbo.problem'),
    role: t('kibbo.role'),
    decisions: t.raw('kibbo.decisions') as CaseDecision[],
    result: t('kibbo.result'),
    stats: t.raw('kibbo.stats') as CaseStat[],
    stack: KIBBO_STACK,
    stackSpread: 'a',
    shots: kibboShots,
    seo: { label: t('kibbo.seo_label'), items: t.raw('kibbo.seo_items') as string[], shots: kibboSeoShots },
    cta: { href: KIBBO_URL, label: t('kibbo.cta') },
  };
  const kibboLightboxShots = [...kibboShots, ...kibboSeoShots];

  const leex: CaseStudyData = {
    number: '05',
    eyebrow: t('leex.eyebrow'),
    title: t('leex.title'),
    subtitle: t('leex.subtitle'),
    badge: t('leex.badge'),
    problem: t('leex.problem'),
    role: t('leex.role'),
    decisions: t.raw('leex.decisions') as CaseDecision[],
    result: t('leex.result'),
    stats: t.raw('leex.stats') as CaseStat[],
    stack: LEEX_STACK,
    stackSpread: 'b',
    shots: withSrc(LEEX_SCREENSHOTS, t.raw('leex.shots') as ShotCopy[]),
    shotsNote: t('leex.blur_note'),
  };

  const metricLabels: Record<string, string> = {
    auc: t('traumavision.metric_auc'),
    map50: t('traumavision.metric_map50'),
    recall: t('traumavision.metric_recall'),
    f1: t('traumavision.metric_f1'),
  };

  const tvShotLabels = t.raw('traumavision.shot_labels') as string[];
  const elevenShotLabels = t.raw('eleven.shot_labels') as string[];

  return (
    <div id="projects">
      {/* ── Mobile layout (<lg) — and desktop with prefers-reduced-motion, where the
          horizontal rail would never move: proyectos apilados verticalmente ── */}
      <section className="block lg:hidden lg:motion-reduce:block py-24 bg-bg">
        <div className="max-w-7xl mx-auto px-6">
          <p className="font-mono text-xs text-accent tracking-widest uppercase mb-16">{t('label')}</p>

          {/* TraumaVision */}
          <div className="mb-20 border-t border-border pt-8">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-accent tracking-widest">01</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <p className="font-mono text-xs text-accent tracking-widest uppercase mb-2">{t('traumavision.label')}</p>
            <h2 className="font-display text-white uppercase leading-none mb-4" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>{t('traumavision.title')}</h2>
            <p className="font-ui text-off-white mb-2">{t('traumavision.subtitle')}</p>
            <p className="font-ui text-muted text-sm mb-6">{t('traumavision.description')}</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {TRAUMAVISION_METRICS.map((metric) => (
                <MetricCounter key={metric.key} value={metric.value} decimals={metric.decimals} suffix={metric.suffix} label={metricLabels[metric.key] || metric.key} duration={1.5} />
              ))}
            </div>
            <div className="mb-4 border-l-2 border-accent pl-4">
              <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">{t('traumavision.pipeline_label')}</p>
              <p className="font-mono text-sm text-off-white">DICOM <span className="text-accent">→</span> CLAHE <span className="text-accent">→</span> YOLOv8m <span className="text-accent">→</span> Detection <span className="text-accent">→</span> Report</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRAUMAVISION_STACK.map((tech) => <StackBadge key={tech} label={tech} />)}
            </div>
          </div>

          {/* Eleven */}
          <div className="mb-20 border-t border-border pt-8">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-accent tracking-widest">02</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <p className="font-mono text-xs text-accent tracking-widest uppercase mb-2">{t('eleven.subtitle')}</p>
            <h2 className="font-display text-white uppercase leading-none mb-4" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>{t('eleven.title')}</h2>
            <p className="font-ui text-off-white mb-6">{t('eleven.description_expanded')}</p>
            <div className="flex gap-8 mb-6 border-l-2 border-accent pl-4">
              {[
                { value: t('eleven.stat_founded'), label: t('eleven.stat_founded_label') },
                { value: t('eleven.stat_sites'), label: t('eleven.stat_sites_label') },
                { value: t('eleven.stat_approach'), label: t('eleven.stat_approach_label') },
              ].map((stat, i) => (
                <div key={i}>
                  <p className="font-mono text-lg text-white tracking-tight mb-0.5">{stat.value}</p>
                  <p className="font-mono text-xs text-muted uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {ELEVEN_STACK.map((tech) => <StackBadge key={tech} label={tech} />)}
            </div>
            <a href="https://eleven-pagina.vercel.app" target="_blank" rel="noopener noreferrer" className="inline-block font-ui font-bold text-xs text-accent border border-accent px-4 py-2 tracking-widest uppercase transition-all duration-150 hover:bg-accent hover:text-white">{t('eleven.cta')}</a>
          </div>

          {/* Hackathon */}
          <div className="mb-20 border-t border-border pt-8">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-accent tracking-widest">03</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <p className="font-mono text-xs text-accent tracking-widest uppercase">{t('hackathon.subtitle')}</p>
              <span className="font-mono text-xs text-white bg-accent px-2 py-0.5">{t('hackathon.badge')}</span>
            </div>
            <h2 className="font-display text-white uppercase leading-none mb-4" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>{t('hackathon.title')}</h2>
            <p className="font-ui text-off-white mb-6">{t('hackathon.description_expanded')}</p>
            <div className="flex gap-8 mb-6 border-l-2 border-accent pl-4">
              {[
                { value: t('hackathon.event_stat_place'), label: t('hackathon.event_stat_place_label') },
                { value: t('hackathon.event_stat_team'), label: t('hackathon.event_stat_team_label') },
              ].map((stat, i) => (
                <div key={i}>
                  <p className="font-mono text-lg text-white tracking-tight mb-0.5">{stat.value}</p>
                  <p className="font-mono text-xs text-muted uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {HACKATHON_STACK.map((tech) => <StackBadge key={tech} label={tech} />)}
            </div>
          </div>

          {/* KIBBO — case study */}
          <CaseStudyMobile data={kibbo} onOpen={openKibbo} />

          {/* LEEX — case study */}
          <CaseStudyMobile data={leex} onOpen={openLeex} isLast />
        </div>
      </section>

      {/* ── Desktop layout (lg+): horizontal scroll ── */}
      <section
        ref={sectionRef}
        className="hidden lg:block lg:motion-reduce:hidden py-0 bg-bg"
        style={{ height: `${RAIL_UNITS * 100}vh` }}
        aria-label={t('label')}
      >
        {/* Sticky container — se pina y hace scroll horizontal */}
        <div
          ref={horizontalRef}
          className="sticky top-0"
          // clip (not hidden): no scroll container, so focusing an off-screen thumbnail
          // can't shift scrollLeft and desync the rail from the page scroll.
          style={{ height: '100vh', overflow: 'clip' }}
        >
          {/* Section label — esquina superior izquierda, fijo dentro del sticky */}
          <div className="absolute top-8 left-6 lg:left-12 z-10">
            <p className="font-mono text-xs text-accent tracking-widest uppercase">
              {t('label')}
            </p>
          </div>

          {/* Rail de proyectos — paneles horizontales (anchos en PROJECT_PANEL_WIDTHS) */}
          <div
            ref={railRef}
            className="flex"
            style={{ width: `${RAIL_UNITS * 100}vw`, height: '100%' }}
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
                  <p className="font-ui text-off-white text-lg mb-2 max-w-lg">
                    {t('traumavision.subtitle')}
                  </p>
                  <p className="font-ui text-muted text-sm mb-8 max-w-lg">
                    {t('traumavision.description')}
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
                      DICOM <span className="text-accent">→</span> CLAHE <span className="text-accent">→</span> YOLOv8m <span className="text-accent">→</span> Detection <span className="text-accent">→</span> Report
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
                      aria-label={`${t('case.view_shot')}: ${tvShotLabels[i]}`}
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
                          <span className="text-off-white"> / {tvShotLabels[i]}</span>
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
                      aria-label={`${t('case.view_shot')}: ${elevenShotLabels[i]}`}
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
                          <span className="text-off-white"> / {elevenShotLabels[i]}</span>
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
                      { value: t('hackathon.event_stat_place'), label: t('hackathon.event_stat_place_label') },
                      { value: t('hackathon.event_stat_team'), label: t('hackathon.event_stat_team_label') },
                      { value: t('hackathon.event_stat_organizer'), label: t('hackathon.event_stat_organizer_label') },
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

            {/* ── Panel 4: KIBBO case study (200vw, 2 spreads) ── */}
            <CaseStudyPanel data={kibbo} onOpen={openKibbo} onMouseMove={handle3DMove} onMouseLeave={handle3DLeave} />

            {/* ── Panel 5: LEEX case study (200vw, 2 spreads) ── */}
            <CaseStudyPanel data={leex} onOpen={openLeex} onMouseMove={handle3DMove} onMouseLeave={handle3DLeave} />
          </div>

          {/* Indicador de progreso — puntitos abajo */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10">
            {PROJECT_PANEL_WIDTHS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 bg-[#555555]"
                style={{ transition: 'background 0.3s, width 0.3s', width: '6px' }}
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
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
          onClick={() => setElevenLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t('case.lightbox.viewer')}
        >
          <button
            className="absolute top-4 right-6 font-mono text-sm text-off-white hover:text-accent transition-colors duration-150 z-10"
            onClick={() => setElevenLightboxIndex(null)}
            aria-label={t('case.lightbox.close_aria')}
          >
            {t('case.lightbox.close')}
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-2xl text-off-white hover:text-accent transition-colors duration-150 z-10 px-3 py-2"
            onClick={(e) => { e.stopPropagation(); setElevenLightboxIndex((i) => i !== null ? (i - 1 + ELEVEN_SCREENSHOTS.length) % ELEVEN_SCREENSHOTS.length : null); }}
            aria-label={t('case.lightbox.prev')}
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
              <span className="font-mono text-xs text-off-white">/ {elevenShotLabels[elevenLightboxIndex]}</span>
              <span className="font-mono text-xs text-muted ml-auto">{elevenLightboxIndex + 1} / {ELEVEN_SCREENSHOTS.length}</span>
            </div>
          </div>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-2xl text-off-white hover:text-accent transition-colors duration-150 z-10 px-3 py-2"
            onClick={(e) => { e.stopPropagation(); setElevenLightboxIndex((i) => i !== null ? (i + 1) % ELEVEN_SCREENSHOTS.length : null); }}
            aria-label={t('case.lightbox.next')}
          >→</button>
        </div>
      )}

      {/* Lightbox — KIBBO (site + SEO/GEO) and LEEX screenshots */}
      <CaseLightbox shots={kibboLightboxShots} index={kibboLightboxIndex} onChange={openKibbo} />
      <CaseLightbox shots={leex.shots} index={leexLightboxIndex} onChange={openLeex} />

      {/* ─────────────────────────────────────────────────────────── */}
      {/* Lightbox — TraumaVision screenshots                         */}
      {/* ─────────────────────────────────────────────────────────── */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t('case.lightbox.viewer')}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-6 font-mono text-sm text-off-white hover:text-accent transition-colors duration-150 z-10"
            onClick={() => setLightboxIndex(null)}
            aria-label={t('case.lightbox.close_aria')}
          >
            {t('case.lightbox.close')}
          </button>

          {/* Prev arrow */}
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-2xl text-off-white hover:text-accent transition-colors duration-150 z-10 px-3 py-2"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) => i !== null ? (i - 1 + TRAUMAVISION_SCREENSHOTS.length) % TRAUMAVISION_SCREENSHOTS.length : null);
            }}
            aria-label={t('case.lightbox.prev')}
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
                / {tvShotLabels[lightboxIndex]}
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
            aria-label={t('case.lightbox.next')}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
