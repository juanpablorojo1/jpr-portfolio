'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import StackBadge from '../ui/StackBadge';
import type { CaseShot } from '../ui/CaseLightbox';
import ProjectDemo from '../ui/ProjectDemo';
import DeskOnlyImage from '../ui/DeskOnlyImage';
import type { ProjectDemo as DemoSrc } from '../../lib/content';

// Ficha técnica (pedido de Juan, 2026-10-14; reemplaza problema → mi rol → decisiones clave → resultado): una línea de
// qué es (led_line) bajo el título → medios → 01 Componentes → 02 Stack → 03 Logros → nota de alcance → acciones.
// Celular y escritorio sin escena: CaseStudyMobile (abajo). Escritorio con escena: el panel «Ver proyecto»
// (ProjectsGallery, caseBody), con los mismos datos.
// Phone (< 1024, 2026-10-14, mobile-senal): CaseStudyMobile carries the phone design through classes (pjm-*,
// projects-senal.css) and data-pm (phoneMotion). The visual piece goes first and edge to edge (PhoneMedia, only
// shown below 1024); the desktop-static demo + strip stays as it was (hidden on phones).

export interface CaseStat {
  value: string;
  label: string;
}

export interface CaseStudyData {
  number: string;
  eyebrow: string;
  title: string;
  /** qué es, en una línea: projects.<id>.led_line (la misma de la vitrina) */
  line: string;
  badge?: string;
  /** Componentes: una pieza por línea */
  parts: string[];
  /** Logros: 2-4 {valor, rótulo} */
  stats: CaseStat[];
  /** nota chica bajo Logros (TraumaVision: alcance regulatorio) */
  note?: string;
  stack: readonly string[];
  shots: CaseShot[];
  shotsNote?: string;
  seo?: { label: string; shots: CaseShot[] };
  cta?: { href: string; label: string };
  /** video demo (Track C): PROJECT_DEMOS + alt de messages projects.<id>.demo_alt */
  demo?: { src: DemoSrc; alt: string };
}

/** Un valor que no entra en media columna del celular («96,7% · 93,1%», «Emprende U 2026»): los logros van uno por
 *  fila, con la misma letra (Juan: no achicar). El panel de escritorio usa la misma regla (pj-long). */
export const hasLongStat = (stats: CaseStat[]) => stats.some((s) => s.value.length > 8);

function BlockLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="pjm-blk font-mono text-xs text-muted uppercase tracking-widest mb-2">
      <span className="text-accent">{n}</span>
      <span className="text-border"> / </span>
      {children}
    </p>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 border border-accent rounded-xs px-2 py-0.5 font-mono text-xs text-off-white uppercase tracking-widest">
      <span className="relative inline-flex w-1.5 h-1.5" aria-hidden="true">
        <span className="absolute inset-0 bg-accent motion-safe:animate-ping opacity-60" />
        <span className="relative w-1.5 h-1.5 bg-accent" />
      </span>
      {label}
    </span>
  );
}

function ShotButton({
  shot,
  index,
  onOpen,
  sizes,
  viewLabel,
  className = '',
  deskOnly = false,
}: {
  shot: CaseShot;
  index: number;
  onOpen: (i: number) => void;
  sizes: string;
  viewLabel: string;
  className?: string;
  /** hidden below 1024 (the desktop-static strip): no request on phones (DeskOnlyImage) */
  deskOnly?: boolean;
}) {
  const imgClass = 'object-cover motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-105';
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className={`group relative block w-full overflow-hidden border border-border hover:border-accent focus-visible:border-accent transition-colors duration-150 focus:outline-none ${className}`}
      style={{ aspectRatio: '1600 / 756' }}
      aria-label={`${viewLabel}: ${shot.label}`}
    >
      {deskOnly
        ? <DeskOnlyImage src={shot.src} alt={shot.caption} sizes={sizes} className={imgClass} />
        : <Image src={shot.src} alt={shot.caption} fill className={imgClass} sizes={sizes} />}
      <span className="absolute inset-0 bg-bg/0 group-hover:bg-bg/60 transition-colors duration-200 flex items-end p-2">
        <span className="pjm-shotlbl font-mono text-[10px] leading-tight text-left opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200">
          <span className="text-accent">{String(index + 1).padStart(2, '0')}</span>
          <span className="text-off-white uppercase"> / {shot.label}</span>
        </span>
      </span>
    </button>
  );
}

// Mobile: featured shot + thumbnails in a horizontal snap strip (same pattern as the
// video strip). No filler tile.
function StripGallery({ data, onOpen, viewLabel }: { data: CaseStudyData; onOpen: (i: number) => void; viewLabel: string }) {
  const [featured, ...thumbs] = data.shots;
  return (
    <div>
      <div className="max-w-4xl lg:max-w-3xl">
        <ShotButton shot={featured} index={0} onOpen={onOpen} sizes="(min-width: 1024px) 900px, 100vw" viewLabel={viewLabel} deskOnly />
      </div>
      <div className="flex gap-2 mt-2 overflow-x-auto snap-x snap-mandatory scroll-px-6 -mx-6 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {thumbs.map((shot, i) => (
          <div key={shot.src} className="shrink-0 w-[42vw] sm:w-[28vw] lg:w-[14rem] snap-start">
            <ShotButton shot={shot} index={i + 1} onOpen={onOpen} sizes="42vw" viewLabel={viewLabel} deskOnly />
          </div>
        ))}
      </div>
    </div>
  );
}

function Stats({ stats, size }: { stats: CaseStat[]; size: 'lg' | 'sm' }) {
  // 4 stats read as a 2×2 (long labels stay at ≤ 2 lines); 3 stay in one row. Long values (pjm-long): one per row
  // on the phone (projects-senal.css), same type size.
  const cols = stats.length >= 4 ? 'grid-cols-2' : 'grid-cols-3';
  return (
    <div className={`grid ${cols}${hasLongStat(stats) ? ' pjm-long' : ''} gap-x-6 gap-y-4 border-l-2 border-accent ${size === 'lg' ? 'pl-6' : 'pl-4'}`}>
      {stats.map((s) => (
        <div key={s.label} data-pm-i>
          <p className={`font-mono text-white tracking-tight mb-1 ${size === 'lg' ? 'text-2xl' : 'text-lg'}`}>{s.value}</p>
          <p className="font-mono text-[10px] sm:text-xs text-muted uppercase tracking-widest leading-snug">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// Componentes: una pieza por línea, con el guion rojo de las listas del sitio (un glifo, no texto chico en rojo)
function Parts({ parts }: { parts: string[] }) {
  return (
    <ul className="pjm-parts space-y-2">
      {parts.map((x) => (
        <li key={x} data-pm-i className="grid grid-cols-[1.25rem_1fr] font-ui text-off-white leading-relaxed">
          <span className="text-accent" aria-hidden="true">—</span>
          <span>{x}</span>
        </li>
      ))}
    </ul>
  );
}

function SeoBlock({ data, onOpen, viewLabel, sizes }: { data: CaseStudyData; onOpen: (i: number) => void; viewLabel: string; sizes: string }) {
  if (!data.seo) return null;
  const offset = data.shots.length;
  return (
    <div className="border-t border-border pt-5">
      <p className="font-mono text-xs text-accent uppercase tracking-widest mb-3">{data.seo.label}</p>
      <div className="grid grid-cols-2 gap-2">
        {data.seo.shots.map((shot, i) => (
          <ShotButton key={shot.src} shot={shot} index={offset + i} onOpen={onOpen} sizes={sizes} viewLabel={viewLabel} />
        ))}
      </div>
    </div>
  );
}

function Cta({ cta }: { cta?: CaseStudyData['cta'] }) {
  if (!cta) return null;
  return (
    <a
      href={cta.href}
      target="_blank"
      rel="noopener noreferrer"
      className="pjm-cta inline-block font-ui font-bold text-xs text-accent border border-accent px-4 py-2 tracking-widest uppercase transition-all duration-150 hover:bg-accent hover:text-white"
    >
      {cta.label}
    </a>
  );
}

function Stack({ stack }: { stack: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {stack.map((tech) => <StackBadge key={tech} label={tech} />)}
    </div>
  );
}

// ── Phone (< 1024): the visual piece, edge to edge ─────────────────────────────
// Demo first (plays only in view, poster near: ProjectDemo), then every screen in a snap strip with its label always
// visible (no hover on touch). Images are only requested a viewport before they show (useNear), so nothing here
// competes with the hero LCP. display: none at >= 1024 (projects-senal.css): there it never intersects, never loads.
export function PhoneMedia({ data, onOpen }: { data: CaseStudyData; onOpen: (index: number) => void }) {
  const t = useTranslations('projects.case');
  const ref = useRef<HTMLDivElement>(null);
  const near = useNear(ref);
  return (
    <div ref={ref} className="pjm-media">
      {data.demo && (
        <div className="pjm-demo" data-pm="on">
          <ProjectDemo demo={data.demo.src} title={data.title} alt={data.demo.alt} />
        </div>
      )}
      <ul className="pjm-strip" aria-label={`${t('screens')}: ${data.title}`}>
        {data.shots.map((shot, i) => (
          <li key={shot.src}>
            {/* nombre accesible = el rótulo visible con «Ver captura» delante (label-content-name-mismatch) */}
            <button type="button" className="pjm-shot" onClick={() => onOpen(i)}>
              <span className="pjm-shot-img">
                {near && <Image src={shot.src} alt="" fill className="object-cover" sizes="(max-width: 767px) 80vw, 46vw" />}
              </span>
              <span className="pjm-shot-lbl"><span className="sr-only">{t('view_shot')}: </span><b>{String(i + 1).padStart(2, '0')}</b> {shot.label}</span>
            </button>
          </li>
        ))}
      </ul>
      {data.shotsNote && <p className="pjm-note">* {data.shotsNote}</p>}
    </div>
  );
}

/** true from one viewport before the element shows up (and stays true). */
export function useNear(ref: React.RefObject<HTMLElement>) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setNear(true); io.disconnect(); }
    }, { rootMargin: '0px 0px 100% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return near;
}

// ── Mobile / tablet: stacked block ─────────────────────────────────────────
// >= 1024 this is the desktop layout without the 3D scene (reduced motion, ?static, no GPU): it must not change.
// The phone design rides on the pjm-* hooks (projects-senal.css) and on data-pm (phoneMotion, < 1024 only).
export function CaseStudyMobile({ data, onOpen, isLast }: { data: CaseStudyData; onOpen: (index: number) => void; isLast?: boolean }) {
  const t = useTranslations('projects.case');
  return (
    <div id={`pj-${data.number}`} className={`pjm-case border-t border-border pt-8 ${isLast ? '' : 'mb-20'}`}>
      {/* phone: the signal cut that opens each project (red line + head), in step with the header reveal */}
      <span className="pjm-cut" aria-hidden="true"><b /><i /></span>
      <div className="pjm-head" data-pm="cut">
        <div className="pjm-folio flex items-baseline gap-4 mb-6">
          <span className="font-mono text-xs text-accent tracking-widest">{data.number}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {data.badge && (
          <div className="pjm-badge mb-3">
            <StatusBadge label={data.badge} />
          </div>
        )}
        <p className="pjm-eyebrow font-mono text-xs text-accent tracking-widest uppercase mb-2">{data.eyebrow}</p>
        <h2 className="pjm-title font-display text-white uppercase leading-none mb-4" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>{data.title}</h2>
        <p className="pjm-sub font-ui text-off-white text-lg leading-snug mb-6">{data.line}</p>
      </div>

      <PhoneMedia data={data} onOpen={onOpen} />

      <div className="pjm-desk mb-10">
        {data.demo && (
          <div className="max-w-4xl lg:max-w-3xl mb-4">
            <ProjectDemo demo={data.demo.src} title={data.title} alt={data.demo.alt} />
          </div>
        )}
        <StripGallery data={data} onOpen={onOpen} viewLabel={t('view_shot')} />
        {data.shotsNote && (
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mt-3">* {data.shotsNote}</p>
        )}
      </div>

      {/* Ficha: 01 Componentes · 02 Stack (de a dos columnas desde 768) → 03 Logros + nota */}
      <div className="pjm-story md:grid md:grid-cols-2 md:gap-10">
        <div className="pjm-step mb-8">
          <div data-pm="rise"><BlockLabel n="01">{t('parts')}</BlockLabel></div>
          <div data-pm="group"><Parts parts={data.parts} /></div>
        </div>
        <div className="pjm-step mb-8" data-pm="rise">
          <BlockLabel n="02">{t('stack')}</BlockLabel>
          <Stack stack={data.stack} />
        </div>
      </div>

      <div className={`pjm-step pjm-result${data.seo || data.cta ? ' mb-8' : ''}`}>
        <div data-pm="rise"><BlockLabel n="03">{t('achievements')}</BlockLabel></div>
        <div data-pm="group"><Stats stats={data.stats} size="sm" /></div>
        {data.note && (
          <p className="pjm-scope font-mono text-[10px] text-muted uppercase tracking-widest leading-relaxed mt-4" data-pm="rise">{data.note}</p>
        )}
      </div>

      {data.seo && (
        <div className="pjm-seo mb-6" data-pm="rise">
          <SeoBlock data={data} onOpen={onOpen} viewLabel={t('view_shot')} sizes="50vw" />
        </div>
      )}

      <Cta cta={data.cta} />
    </div>
  );
}
