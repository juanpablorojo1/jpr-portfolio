'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import MetricCounter from '../ui/MetricCounter';
import StackBadge from '../ui/StackBadge';
import CaseLightbox, { type CaseShot } from '../ui/CaseLightbox';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import ProjectsGallery from './ProjectsGallery';
import { CaseStudyMobile, useNear, type CaseStudyData, type CaseStat } from './CaseStudy';
import { phoneReveal } from '../../lib/phoneMotion';
import {
  TRAUMAVISION_STACK,
  TRAUMAVISION_SCREENSHOTS,
  ELEVEN_STACK,
  ELEVEN_SCREENSHOTS,
  ELEVEN_URL,
  KIBBO_URL,
  KIBBO_STACK,
  KIBBO_SCREENSHOTS,
  KIBBO_SEO_SCREENSHOTS,
  LEEX_STACK,
  LEEX_SCREENSHOTS,
  HACKATHON_STACK,
  HACKATHON_PHOTOS,
  PROJECT_DEMOS,
} from '../../lib/content';

/* Celular (< 1024, 2026-10-14, mobile-senal): «Vitrina» vertical. El apilado (.pj-stack) lleva el diseño de teléfono
   por clases pjm-* (projects-senal.css, bloque < 1024) y data-pm (phoneMotion): un índice de los cinco proyectos
   arriba, y cada proyecto se abre con un corte de señal (la recta roja barre el ancho y destapa la cabecera), con la
   pieza visual primero y de borde a borde, y la ficha técnica (componentes, stack, logros). Los visores de
   capturas son CaseLightbox a pantalla completa, por encima de la barra y el dock, con el cerrar abajo.
   En >= 1024 el apilado es el escritorio sin escena (reduced motion, ?static, sin GPU) y queda como estaba. */

// la foto del hackathon (Juan en Rocking the Industry): sólo en el teléfono, pedida una pantalla antes de verse
function HackathonPhoto({ alt }: { alt: string }) {
  const ref = useRef<HTMLElement>(null);
  const near = useNear(ref);
  return (
    <figure ref={ref} className="pjm-photo" data-pm="on">
      {near && <Image src={HACKATHON_PHOTOS[0].src} alt={alt} fill className="object-cover" sizes="100vw" />}
    </figure>
  );
}


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
  // Foco de los visores TraumaVision / Eleven: a Cerrar al abrir, Tab adentro, vuelve a «Screens» al cerrar (F-02)
  // Celular: los visores de TraumaVision / Eleven son CaseLightbox (pantalla completa, cerrar abajo); los de abajo quedan
  // para >= 1024. Se decide al abrir (estado del cliente), así el HTML del servidor no cambia.
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  const tvFocus = useDialogFocus(!isPhone && lightboxIndex !== null);
  const elevenFocus = useDialogFocus(!isPhone && elevenLightboxIndex !== null);

  // entradas del celular (phoneMotion: < 1024 y sin reduced motion; en escritorio no hace nada)
  const stackRef = useRef<HTMLElement>(null);
  useEffect(() => (stackRef.current ? phoneReveal(stackRef.current) : undefined), []);

  // Close TraumaVision lightbox on Escape/arrows
  useEffect(() => {
    if (lightboxIndex === null || isPhone) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex((i) => i !== null ? (i + 1) % TRAUMAVISION_SCREENSHOTS.length : null);
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => i !== null ? (i - 1 + TRAUMAVISION_SCREENSHOTS.length) % TRAUMAVISION_SCREENSHOTS.length : null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, isPhone]);

  // Close Eleven lightbox on Escape/arrows
  useEffect(() => {
    if (elevenLightboxIndex === null || isPhone) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setElevenLightboxIndex(null);
      if (e.key === 'ArrowRight') setElevenLightboxIndex((i) => i !== null ? (i + 1) % ELEVEN_SCREENSHOTS.length : null);
      if (e.key === 'ArrowLeft') setElevenLightboxIndex((i) => i !== null ? (i - 1 + ELEVEN_SCREENSHOTS.length) % ELEVEN_SCREENSHOTS.length : null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [elevenLightboxIndex, isPhone]);


  const kibboShots = withSrc(KIBBO_SCREENSHOTS, t.raw('kibbo.shots') as ShotCopy[]);
  const kibboSeoShots = withSrc(KIBBO_SEO_SCREENSHOTS, t.raw('kibbo.seo_shots') as ShotCopy[]);
  const kibbo: CaseStudyData = {
    number: '04',
    eyebrow: t('kibbo.eyebrow'),
    title: t('kibbo.title'),
    line: t('kibbo.led_line'),
    parts: t.raw('kibbo.parts') as string[],
    stats: t.raw('kibbo.stats') as CaseStat[],
    stack: KIBBO_STACK,
    shots: kibboShots,
    seo: { label: t('kibbo.seo_label'), shots: kibboSeoShots },
    cta: { href: KIBBO_URL, label: t('kibbo.cta') },
    demo: { src: PROJECT_DEMOS.kibbo, alt: t('kibbo.demo_alt') },
  };
  const kibboLightboxShots = [...kibboShots, ...kibboSeoShots];

  const leex: CaseStudyData = {
    number: '05',
    eyebrow: t('leex.eyebrow'),
    title: t('leex.title'),
    line: t('leex.led_line'),
    badge: t('leex.badge'),
    parts: t.raw('leex.parts') as string[],
    stats: t.raw('leex.stats') as CaseStat[],
    stack: LEEX_STACK,
    shots: withSrc(LEEX_SCREENSHOTS, t.raw('leex.shots') as ShotCopy[]),
    shotsNote: t('leex.blur_note'),
    demo: { src: PROJECT_DEMOS.leex, alt: t('leex.demo_alt') },
  };

  const tvShotLabels = t.raw('traumavision.shot_labels') as string[];
  const elevenShotLabels = t.raw('eleven.shot_labels') as string[];
  const tvShotAlts = t.raw('traumavision.shots_alt') as string[];
  const elevenShotAlts = t.raw('eleven.shots_alt') as string[];

  // Ficha técnica (Juan, 2026-10-14): qué es (led_line) · componentes · stack · logros. Los logros de TraumaVision traen
  // el formato del idioma resuelto en el copy («96,7%» / «96.7%»); la vitrina sigue con TRAUMAVISION_METRICS.
  const traumavision: CaseStudyData = {
    number: '01',
    eyebrow: t('traumavision.eyebrow'),
    title: t('traumavision.title'),
    line: t('traumavision.led_line'),
    parts: t.raw('traumavision.parts') as string[],
    stats: t.raw('traumavision.stats') as CaseStat[],
    note: t('traumavision.scope_note'),
    stack: TRAUMAVISION_STACK,
    shots: TRAUMAVISION_SCREENSHOTS.map((sh, i) => ({ src: sh.src, label: tvShotLabels[i] ?? '', caption: tvShotAlts[i] ?? '' })),
    demo: { src: PROJECT_DEMOS.traumavision, alt: t('traumavision.demo_alt') },
  };
  const eleven: CaseStudyData = {
    number: '02',
    eyebrow: t('eleven.eyebrow'),
    title: t('eleven.title'),
    line: t('eleven.led_line'),
    parts: t.raw('eleven.parts') as string[],
    stats: t.raw('eleven.stats') as CaseStat[],
    stack: ELEVEN_STACK,
    shots: ELEVEN_SCREENSHOTS.map((sh, i) => ({ src: sh.src, label: elevenShotLabels[i] ?? '', caption: elevenShotAlts[i] ?? '' })),
    cta: { href: ELEVEN_URL, label: t('eleven.cta') },
    demo: { src: PROJECT_DEMOS.eleven, alt: t('eleven.demo_alt') },
  };

  // índice del teléfono: número, nombre y una línea corta (el eyebrow sin «Caso ·»)
  const tag = (eyebrow: string) => eyebrow.split(' · ').slice(1).join(' · ');
  const index = [
    { n: traumavision.number, title: traumavision.title, tag: tag(traumavision.eyebrow) },
    { n: eleven.number, title: eleven.title, tag: tag(eleven.eyebrow) },
    { n: '03', title: t('hackathon.title'), tag: t('hackathon.subtitle') },
    { n: kibbo.number, title: kibbo.title, tag: tag(kibbo.eyebrow) },
    { n: leex.number, title: leex.title, tag: tag(leex.eyebrow) },
  ];
  const hkPhotoAlt = (t.raw('hackathon.photos_alt') as string[])[0] ?? t('hackathon.title');

  return (
    <div id="projects">
      {/* ── Apilado: celular (<1024) y escritorio sin la escena 3D (reduced motion, ?static, sin GPU).
          Con la galería activa (data-gallery en la zona, ≥1024) se oculta: projects-senal.css ── */}
      <section ref={stackRef} className="pj-stack block py-24 bg-bg">
        <div className="pjm-wrap max-w-7xl mx-auto px-6">
          <p data-pm="rise" className="pjm-label font-mono text-xs text-accent tracking-widest uppercase mb-16"><span className="pjm-dot" aria-hidden="true" />{t('label')}</p>

          {/* Celular: índice de los cinco proyectos (saltos con el pulgar). Fuera en >= 1024. */}
          <nav className="pjm-index" aria-label={t('label')}>
            <ol data-pm="group">
              {index.map((it) => (
                <li key={it.n} data-pm-i>
                  <a href={`#pj-${it.n}`}>
                    <span className="pjm-ix-n">{it.n}</span>
                    <span className="pjm-ix-t">{it.title}</span>
                    <span className="pjm-ix-s">{it.tag}</span>
                    <span className="pjm-ix-a" aria-hidden="true">↓</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* TraumaVision y Eleven: el mismo formato de caso que KIBBO y LEEX */}
          <CaseStudyMobile data={traumavision} onOpen={setLightboxIndex} />
          <CaseStudyMobile data={eleven} onOpen={setElevenLightboxIndex} />

          {/* Hackathon */}
          <div id="pj-03" className="pjm-case pjm-hk mb-20 border-t border-border pt-8">
            <span className="pjm-cut" aria-hidden="true"><b /><i /></span>
            <div className="pjm-head" data-pm="cut">
              <div className="pjm-folio flex items-baseline gap-4 mb-6">
                <span className="font-mono text-xs text-accent tracking-widest">03</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="pjm-hk-meta flex items-center gap-3 mb-2">
                <p className="pjm-eyebrow font-mono text-xs text-accent tracking-widest uppercase">{t('hackathon.subtitle')}</p>
                <span className="pjm-hk-badge font-mono text-xs text-white bg-accent px-2 py-0.5">{t('hackathon.badge')}</span>
              </div>
              <h2 className="pjm-title font-display text-white uppercase leading-none mb-4" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>{t('hackathon.title')}</h2>
            </div>
            <HackathonPhoto alt={hkPhotoAlt} />
            <p data-pm="rise" className="pjm-hk-desc font-ui text-off-white mb-6">{t('hackathon.description_expanded')}</p>
            <div data-pm="group" className="pjm-hk-stats flex gap-8 mb-6 border-l-2 border-accent pl-4">
              {[
                { value: t('hackathon.event_stat_place'), label: t('hackathon.event_stat_place_label') },
                { value: t('hackathon.event_stat_team'), label: t('hackathon.event_stat_team_label') },
              ].map((stat, i) => (
                <div key={i} data-pm-i>
                  <p className="font-mono text-lg text-white tracking-tight mb-0.5">{stat.value}</p>
                  <p className="font-mono text-xs text-muted uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
            <div data-pm="rise" className="pjm-chips flex flex-wrap gap-2">
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
        traumavision={traumavision}
        eleven={eleven}
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
      {/* Portal a <body> y z 300 (como CaseLightbox): dentro de la TransitionZone sticky el menú (z 100) tapaba
          «Close» y el foco quedaba en un botón invisible (F-02). */}
      {/* Celular: TraumaVision y Eleven con el mismo visor que KIBBO y LEEX (pantalla completa, cerrar abajo) */}
      {isPhone && <CaseLightbox shots={traumavision.shots} index={lightboxIndex} onChange={setLightboxIndex} />}
      {isPhone && <CaseLightbox shots={eleven.shots} index={elevenLightboxIndex} onChange={setElevenLightboxIndex} />}

      {!isPhone && elevenLightboxIndex !== null && createPortal(
        <div
          ref={elevenFocus.dialogRef}
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
          onClick={() => setElevenLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t('case.lightbox.viewer')}
        >
          <button
            ref={elevenFocus.closeRef}
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
              alt={elevenShotAlts[elevenLightboxIndex]}
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
        </div>,
        document.body
      )}

      {/* Lightbox — KIBBO (site + SEO/GEO) and LEEX screenshots */}
      <CaseLightbox shots={kibboLightboxShots} index={kibboLightboxIndex} onChange={openKibbo} />
      <CaseLightbox shots={leex.shots} index={leexLightboxIndex} onChange={openLeex} />

      {/* ─────────────────────────────────────────────────────────── */}
      {/* Lightbox — TraumaVision screenshots                         */}
      {/* ─────────────────────────────────────────────────────────── */}
      {/* Portal a <body> y z 300 (como CaseLightbox): dentro de la TransitionZone sticky el menú (z 100) tapaba
          «Close» y el foco quedaba en un botón invisible (F-02). */}
      {!isPhone && lightboxIndex !== null && createPortal(
        <div
          ref={tvFocus.dialogRef}
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t('case.lightbox.viewer')}
        >
          {/* Close button */}
          <button
            ref={tvFocus.closeRef}
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
              alt={tvShotAlts[lightboxIndex]}
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
        </div>,
        document.body
      )}
    </div>
  );
}
