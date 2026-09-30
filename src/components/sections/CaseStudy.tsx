'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import StackBadge from '../ui/StackBadge';
import type { CaseShot } from '../ui/CaseLightbox';

// Case-study format fixed by Juan: problem → my role → key decisions → result.
// Desktop: one rail panel of 200vw = two spreads (A: problem + role + screens,
// B: decisions + result). Mobile: same content stacked.

export interface CaseDecision {
  title: string;
  body: string;
}

export interface CaseStat {
  value: string;
  label: string;
}

export interface CaseStudyData {
  number: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  badge?: string;
  problem: string;
  role: string;
  decisions: CaseDecision[];
  result: string;
  stats: CaseStat[];
  stack: readonly string[];
  /** Where the stack chips sit on desktop: spread A (left, under role) or B (under stats). */
  stackSpread: 'a' | 'b';
  shots: CaseShot[];
  shotsNote?: string;
  seo?: { label: string; items: string[]; shots: CaseShot[] };
  cta?: { href: string; label: string };
}

interface PanelProps {
  data: CaseStudyData;
  /** Opens the lightbox at an index of [...shots, ...seo.shots]. */
  onOpen: (index: number) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function BlockLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">
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
}: {
  shot: CaseShot;
  index: number;
  onOpen: (i: number) => void;
  sizes: string;
  viewLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className={`group relative block w-full overflow-hidden border border-border hover:border-accent focus-visible:border-accent transition-colors duration-150 focus:outline-none ${className}`}
      style={{ aspectRatio: '1600 / 756' }}
      aria-label={`${viewLabel}: ${shot.label}`}
    >
      <Image
        src={shot.src}
        alt={shot.caption}
        fill
        className="object-cover motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-105"
        sizes={sizes}
      />
      <span className="absolute inset-0 bg-bg/0 group-hover:bg-bg/60 transition-colors duration-200 flex items-end p-2">
        <span className="font-mono text-[10px] leading-tight text-left opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200">
          <span className="text-accent">{String(index + 1).padStart(2, '0')}</span>
          <span className="text-off-white uppercase"> / {shot.label}</span>
        </span>
      </span>
    </button>
  );
}

function Gallery({
  data,
  onOpen,
  viewLabel,
  screensLabel,
  cols,
  sizesFeatured,
  sizesThumb,
}: {
  data: CaseStudyData;
  onOpen: (i: number) => void;
  viewLabel: string;
  screensLabel: string;
  cols: 2 | 4;
  sizesFeatured: string;
  sizesThumb: string;
}) {
  const [featured, ...thumbs] = data.shots;
  const filler = (cols - (thumbs.length % cols)) % cols;
  return (
    <div className={`grid gap-2 ${cols === 4 ? 'grid-cols-4' : 'grid-cols-2'}`}>
      <ShotButton
        shot={featured}
        index={0}
        onOpen={onOpen}
        sizes={sizesFeatured}
        viewLabel={viewLabel}
        className={cols === 4 ? 'col-span-4' : 'col-span-2'}
      />
      {thumbs.map((shot, i) => (
        <ShotButton key={shot.src} shot={shot} index={i + 1} onOpen={onOpen} sizes={sizesThumb} viewLabel={viewLabel} />
      ))}
      {filler > 0 && (
        <div
          className="border border-border flex items-end p-2"
          style={{ gridColumn: `span ${filler} / span ${filler}` }}
          aria-hidden="true"
        >
          <span className="font-mono text-[10px] text-muted uppercase tracking-widest leading-tight">
            <span className="text-accent">{String(data.shots.length).padStart(2, '0')}</span> {screensLabel}
          </span>
        </div>
      )}
    </div>
  );
}

function Stats({ stats, size }: { stats: CaseStat[]; size: 'lg' | 'sm' }) {
  const cols = stats.length >= 4 ? (size === 'lg' ? 'grid-cols-4' : 'grid-cols-2') : 'grid-cols-3';
  return (
    <div className={`grid ${cols} gap-x-6 gap-y-4 border-l-2 border-accent ${size === 'lg' ? 'pl-6' : 'pl-4'}`}>
      {stats.map((s) => (
        <div key={s.label}>
          <p className={`font-mono text-white tracking-tight mb-1 ${size === 'lg' ? 'text-2xl' : 'text-lg'}`}>{s.value}</p>
          <p className="font-mono text-[10px] sm:text-xs text-muted uppercase tracking-widest leading-snug">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function Decisions({ decisions, compact }: { decisions: CaseDecision[]; compact?: boolean }) {
  return (
    <ol className={compact ? 'space-y-5' : 'space-y-6'}>
      {decisions.map((d, i) => (
        <li key={d.title} className="grid grid-cols-[2.5rem_1fr] gap-3">
          <span className="font-display text-accent leading-none" style={{ fontSize: compact ? '1.75rem' : '2.25rem' }} aria-hidden="true">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div>
            <p className={`font-ui font-bold text-off-white leading-snug mb-1 ${compact ? 'text-base' : 'text-lg'}`}>{d.title}</p>
            <p className={`font-ui text-muted leading-relaxed ${compact ? 'text-sm' : 'text-[0.95rem]'}`}>{d.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function SeoBlock({ data, onOpen, viewLabel, sizes }: { data: CaseStudyData; onOpen: (i: number) => void; viewLabel: string; sizes: string }) {
  if (!data.seo) return null;
  const offset = data.shots.length;
  return (
    <div className="border-t border-border pt-5">
      <p className="font-mono text-xs text-accent uppercase tracking-widest mb-3">{data.seo.label}</p>
      <ul className="space-y-1.5 mb-4">
        {data.seo.items.map((item) => (
          <li key={item} className="grid grid-cols-[1rem_1fr] font-mono text-xs text-off-white leading-relaxed">
            <span className="text-accent" aria-hidden="true">—</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
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
      className="inline-block font-ui font-bold text-xs text-accent border border-accent px-4 py-2 tracking-widest uppercase transition-all duration-150 hover:bg-accent hover:text-white"
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

// ── Desktop: 200vw rail panel ──────────────────────────────────────────────
export function CaseStudyPanel({ data, onOpen, onMouseMove, onMouseLeave }: PanelProps) {
  const t = useTranslations('projects.case');
  const spread = 'relative flex flex-col justify-center';
  const spreadStyle = { width: '100vw', height: '100vh', padding: '6rem 3rem 3rem' } as const;

  return (
    <div className="relative flex" style={{ width: '200vw', height: '100vh' }}>
      {/* Spread A — problem + role + screens */}
      <div className={spread} style={spreadStyle}>
        <div className="flex items-baseline gap-4 mb-6">
          <span className="font-mono text-xs text-accent tracking-widest">{data.number}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto w-full">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <p className="font-mono text-xs text-accent tracking-widest uppercase">{data.eyebrow}</p>
              {data.badge && <StatusBadge label={data.badge} />}
            </div>
            <h2
              className="font-display text-white uppercase leading-none mb-3"
              style={{ fontSize: 'clamp(2.5rem, 4.6vw, 5rem)' }}
            >
              {data.title}
            </h2>
            <p className="font-ui text-off-white text-lg leading-snug mb-6 max-w-xl">{data.subtitle}</p>

            <div className="mb-5 max-w-xl">
              <BlockLabel n="01">{t('problem')}</BlockLabel>
              <p className="font-ui text-muted text-[0.95rem] leading-relaxed">{data.problem}</p>
            </div>
            <div className="mb-6 max-w-xl">
              <BlockLabel n="02">{t('role')}</BlockLabel>
              <p className="font-ui text-off-white text-[0.95rem] leading-relaxed">{data.role}</p>
            </div>

            {data.stackSpread === 'a' && <Stack stack={data.stack} />}
          </div>

          <div
            style={{ transformStyle: 'preserve-3d' }}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
          >
            <Gallery
              data={data}
              onOpen={onOpen}
              viewLabel={t('view_shot')}
              screensLabel={t('screens')}
              cols={4}
              sizesFeatured="45vw"
              sizesThumb="12vw"
            />
            {data.shotsNote && (
              <p className="font-mono text-[10px] text-muted uppercase tracking-widest mt-3">* {data.shotsNote}</p>
            )}
          </div>
        </div>
      </div>

      {/* Spread B — key decisions + result */}
      <div className={spread} style={spreadStyle}>
        <div className="flex items-baseline gap-4 mb-6">
          <span className="font-mono text-xs text-muted tracking-widest uppercase">
            <span className="text-accent">{data.number}</span> · {data.title}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto w-full">
          <div>
            <BlockLabel n="03">{t('decisions')}</BlockLabel>
            <div className="mt-4">
              <Decisions decisions={data.decisions} />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <BlockLabel n="04">{t('result')}</BlockLabel>
              <p className="font-ui text-off-white text-lg leading-snug mb-5">{data.result}</p>
              <Stats stats={data.stats} size="lg" />
            </div>

            {data.stackSpread === 'b' && (
              <div>
                <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">{t('stack')}</p>
                <Stack stack={data.stack} />
              </div>
            )}

            <SeoBlock data={data} onOpen={onOpen} viewLabel={t('view_shot')} sizes="22vw" />

            {data.cta && (
              <div>
                <Cta cta={data.cta} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mobile / tablet: stacked block ─────────────────────────────────────────
export function CaseStudyMobile({ data, onOpen, isLast }: { data: CaseStudyData; onOpen: (index: number) => void; isLast?: boolean }) {
  const t = useTranslations('projects.case');
  return (
    <div className={`border-t border-border pt-8 ${isLast ? '' : 'mb-20'}`}>
      <div className="flex items-baseline gap-4 mb-6">
        <span className="font-mono text-xs text-accent tracking-widest">{data.number}</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {data.badge && (
        <div className="mb-3">
          <StatusBadge label={data.badge} />
        </div>
      )}
      <p className="font-mono text-xs text-accent tracking-widest uppercase mb-2">{data.eyebrow}</p>
      <h2 className="font-display text-white uppercase leading-none mb-4" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)' }}>{data.title}</h2>
      <p className="font-ui text-off-white text-lg leading-snug mb-6">{data.subtitle}</p>

      <div className="mb-8">
        <Gallery
          data={data}
          onOpen={onOpen}
          viewLabel={t('view_shot')}
          screensLabel={t('screens')}
          cols={2}
          sizesFeatured="(min-width: 768px) 90vw, 100vw"
          sizesThumb="50vw"
        />
        {data.shotsNote && (
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mt-3">* {data.shotsNote}</p>
        )}
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-10">
        <div>
          <div className="mb-6">
            <BlockLabel n="01">{t('problem')}</BlockLabel>
            <p className="font-ui text-muted leading-relaxed">{data.problem}</p>
          </div>
          <div className="mb-8">
            <BlockLabel n="02">{t('role')}</BlockLabel>
            <p className="font-ui text-off-white leading-relaxed">{data.role}</p>
          </div>
        </div>
        <div className="mb-8">
          <BlockLabel n="03">{t('decisions')}</BlockLabel>
          <div className="mt-4">
            <Decisions decisions={data.decisions} compact />
          </div>
        </div>
      </div>

      <div className="mb-8">
        <BlockLabel n="04">{t('result')}</BlockLabel>
        <p className="font-ui text-off-white text-lg leading-snug mb-5">{data.result}</p>
        <Stats stats={data.stats} size="sm" />
      </div>

      {data.seo && (
        <div className="mb-8">
          <SeoBlock data={data} onOpen={onOpen} viewLabel={t('view_shot')} sizes="50vw" />
        </div>
      )}

      <div className={data.cta ? 'mb-6' : ''}>
        <Stack stack={data.stack} />
      </div>
      <Cta cta={data.cta} />
    </div>
  );
}
