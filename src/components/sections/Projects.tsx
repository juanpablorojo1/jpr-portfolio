'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import MetricCounter from '../ui/MetricCounter';
import StackBadge from '../ui/StackBadge';
import CaseLightbox, { type CaseShot } from '../ui/CaseLightbox';
import ProjectsGallery from './ProjectsGallery';
import { CaseStudyMobile, type CaseStudyData, type CaseDecision, type CaseStat } from './CaseStudy';
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
  HACKATHON_STACK,
} from '../../lib/content';


type ShotCopy = { label: string; caption: string };
const withSrc = (srcs: readonly string[], copy: ShotCopy[]): CaseShot[] =>
  srcs.map((src, i) => ({ src, label: copy[i]?.label ?? '', caption: copy[i]?.caption ?? '' }));

export default function Projects() {
  const t = useTranslations('projects');

  // Lightbox state: null = closed, number = index of open screenshot
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [elevenLightboxIndex, setElevenLightboxIndex] = useState<number | null>(null);
  const [kibboLightboxIndex, setKibboLightboxIndex] = useState<number | null>(null);
  const [leexLightboxIndex, setLeexLightboxIndex] = useState<number | null>(null);
  const openKibbo = useCallback((i: number | null) => setKibboLightboxIndex(i), []);
  const openLeex = useCallback((i: number | null) => setLeexLightboxIndex(i), []);

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
    specificity: t('traumavision.metric_specificity'),
  };

  const tvShotLabels = t.raw('traumavision.shot_labels') as string[];
  const elevenShotLabels = t.raw('eleven.shot_labels') as string[];

  return (
    <div id="projects">
      {/* ── Apilado: celular (<1024) y escritorio sin la escena 3D (reduced motion, ?static, sin GPU).
          Con la galería activa (data-gallery en la zona, ≥1024) se oculta: projects-senal.css ── */}
      <section className="pj-stack block py-24 bg-bg">
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

      {/* ── Escritorio ≥1024 con la escena «Señal»: la galería espacial (ProjectsGallery + scene.js).
          Sin escena (reduced motion, ?static, sin GPU) queda el layout apilado de arriba (projects-senal.css). ── */}
      <ProjectsGallery
        kibbo={kibbo}
        leex={leex}
        kibboShotCount={kibboLightboxShots.length}
        openTraumavision={setLightboxIndex}
        openEleven={setElevenLightboxIndex}
        openKibbo={openKibbo}
        openLeex={openLeex}
      />

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
