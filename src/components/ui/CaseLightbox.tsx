'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export interface CaseShot {
  src: string;
  label: string;
  caption: string;
}

interface Props {
  shots: CaseShot[];
  index: number | null;
  onChange: (index: number | null) => void;
}

// Lightbox for case-study screenshots (KIBBO, LEEX). Same visual language as the
// Eleven/TraumaVision viewers (black 95%, accent border, mono labels), with the
// caption below the image so it never covers the screen, and i18n labels.
export default function CaseLightbox({ shots, index, onChange }: Props) {
  const t = useTranslations('projects.case.lightbox');
  const closeRef = useRef<HTMLButtonElement>(null);
  const total = shots.length;
  // Portal to <body>: the Projects card lives inside a sticky TransitionZone (its own
  // stacking context), which would otherwise trap the overlay under the navbar.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (index === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChange(null);
      if (e.key === 'ArrowRight') onChange((index + 1) % total);
      if (e.key === 'ArrowLeft') onChange((index - 1 + total) % total);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [index, total, onChange]);

  useEffect(() => {
    if (index !== null) closeRef.current?.focus({ preventScroll: true });
  }, [index]);

  if (index === null || !mounted) return null;
  const shot = shots[index];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
      onClick={() => onChange(null)}
      role="dialog"
      aria-modal="true"
      aria-label={t('viewer')}
    >
      <button
        ref={closeRef}
        className="absolute top-4 right-4 md:right-6 font-mono text-sm text-off-white uppercase hover:text-accent focus-visible:text-accent focus:outline-none transition-colors duration-150 z-10 px-2 py-1"
        onClick={() => onChange(null)}
        aria-label={t('close_aria')}
      >
        {t('close')}
      </button>

      <button
        className="absolute left-1 md:left-4 top-1/2 -translate-y-1/2 font-mono text-2xl text-off-white hover:text-accent focus-visible:text-accent focus:outline-none transition-colors duration-150 z-10 px-3 py-2"
        onClick={(e) => { e.stopPropagation(); onChange((index - 1 + total) % total); }}
        aria-label={t('prev')}
      >←</button>

      <figure
        className="relative w-full max-w-5xl mx-10 md:mx-16"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full border border-accent bg-bg" style={{ aspectRatio: '1600 / 756' }}>
          <Image
            src={shot.src}
            alt={shot.caption}
            fill
            className="object-contain"
            sizes="(min-width: 1024px) 1024px, 100vw"
            priority
          />
        </div>
        <figcaption className="flex items-start gap-3 pt-3">
          <span className="font-mono text-xs text-accent shrink-0">{String(index + 1).padStart(2, '0')}</span>
          <span className="font-mono text-xs text-off-white">
            <span className="uppercase tracking-widest">{shot.label}</span>
            <span className="text-muted"> — </span>
            {shot.caption}
          </span>
          <span className="font-mono text-xs text-muted ml-auto shrink-0">{index + 1} / {total}</span>
        </figcaption>
      </figure>

      <button
        className="absolute right-1 md:right-4 top-1/2 -translate-y-1/2 font-mono text-2xl text-off-white hover:text-accent focus-visible:text-accent focus:outline-none transition-colors duration-150 z-10 px-3 py-2"
        onClick={(e) => { e.stopPropagation(); onChange((index + 1) % total); }}
        aria-label={t('next')}
      >→</button>
    </div>,
    document.body
  );
}
