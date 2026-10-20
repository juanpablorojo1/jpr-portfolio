'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { arrowStep } from '../../lib/keys';

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
// Eleven/TraumaVision viewers (black 95%, accent border, mono labels), caption below
// the image, i18n labels. Accessibility: focus goes to Close on open, Tab/Shift+Tab stay
// inside the dialog, the page behind can't scroll (wheel/touch included) and focus
// returns to the thumbnail that opened it.
// Phone (< 1024, 2026-10-14, mobile-senal): its own layout, decided when it opens (client state, no SSR). Full screen
// above the top bar and the dock (portal + z 300), the shot at a readable size that pans sideways (a landscape screen
// in a portrait phone is unreadable at fit-width), a pan gauge under it, and prev / next / close at the bottom, in
// thumb reach, close in the dock's menu spot. The new shot comes in with the signal cut (projects-senal.css).
// >= 1024 renders exactly as before.
export default function CaseLightbox({ shots, index, onChange }: Props) {
  const t = useTranslations('projects.case.lightbox');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const gaugeRef = useRef<HTMLElement>(null);
  const total = shots.length;
  const isOpen = index !== null;

  // Portal to <body>: the Projects card lives inside a sticky TransitionZone (its own
  // stacking context), which would otherwise trap the overlay under the navbar.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Keyboard: Esc / arrows / focus trap
  useEffect(() => {
    if (index === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onChange(null); return; }
      const d = arrowStep(e);   // F (I-03): una pantalla por pulsación; Tab mantenido sigue en la trampa de foco
      if (d) onChange((index + d + total) % total);
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>('button, a[href]')
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const inside = active ? dialogRef.current.contains(active) : false;
        if (e.shiftKey && (active === first || !inside)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (active === last || !inside)) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [index, total, onChange]);

  // Open/close side effects: remember opener, lock background scroll, restore on close
  useEffect(() => {
    if (!isOpen) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prevBody = document.body.style.overflow;
    const prevHtml = html.style.overflow;
    document.body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    // Belt and braces: swallow wheel/touch scroll that would reach the page (and the GSAP rail)
    // (on phones the shot pans sideways inside [data-lb-pan]: that one gesture is let through)
    const block = (e: Event) => {
      if (e.type === 'touchmove' && (e.target as Element | null)?.closest?.('[data-lb-pan]')) return;
      e.preventDefault();
    };
    window.addEventListener('wheel', block, { passive: false });
    window.addEventListener('touchmove', block, { passive: false });
    return () => {
      document.body.style.overflow = prevBody;
      html.style.overflow = prevHtml;
      window.removeEventListener('wheel', block);
      window.removeEventListener('touchmove', block);
      const opener = openerRef.current;
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && mounted) closeRef.current?.focus({ preventScroll: true });
  }, [isOpen, mounted]);

  if (index === null || !mounted) return null;
  const shot = shots[index];
  const prev = () => onChange((index - 1 + total) % total);
  const next = () => onChange((index + 1) % total);

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const phone = window.matchMedia('(max-width: 1023px)').matches;
  if (phone) {
    // pan gauge: the visible part of the shot, as a red segment on a hairline (written straight to the DOM, no re-render)
    const onPan = (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget, g = gaugeRef.current;
      if (!g || el.scrollWidth <= 0) return;
      g.style.setProperty('--x', String(el.scrollLeft / el.scrollWidth));
      g.style.setProperty('--w', String(el.clientWidth / el.scrollWidth));
    };
    const onImg = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const pan = (e.currentTarget as HTMLElement).closest<HTMLDivElement>('[data-lb-pan]'), g = gaugeRef.current;
      if (!pan || !g) return;
      g.style.setProperty('--x', '0');
      g.style.setProperty('--w', String(Math.min(1, pan.clientWidth / Math.max(1, pan.scrollWidth))));
    };
    return createPortal(
      <div ref={dialogRef} className="lbm" role="dialog" aria-modal="true" aria-label={t('viewer')}>
        <div className="lbm-top">
          <p className="lbm-count"><b>{pad2(index + 1)}</b> / {pad2(total)}</p>
          <a href={shot.src} target="_blank" rel="noopener noreferrer" className="lbm-full">{t('full_size')}</a>
        </div>
        <div className="lbm-stage">
          <div key={index} className="lbm-pan" data-lb-pan onScroll={onPan} tabIndex={0} aria-label={shot.label}>
            <Image src={shot.src} alt={shot.caption} width={1600} height={756} sizes="200vw" priority onLoad={onImg} />
          </div>
          <span key={`s${index}`} className="lbm-scan" aria-hidden="true" />
        </div>
        <span ref={gaugeRef} className="lbm-gauge" aria-hidden="true"><i /></span>
        <p className="lbm-cap"><span>{shot.label}</span>{shot.caption}</p>
        <div className="lbm-bar">
          <button type="button" className="lbm-btn" onClick={prev} aria-label={t('prev')}>←</button>
          <button type="button" className="lbm-btn" onClick={next} aria-label={t('next')}>→</button>
          <button type="button" ref={closeRef} className="lbm-btn lbm-close" onClick={() => onChange(null)} aria-label={t('close_aria')}><i /><i /></button>
        </div>
      </div>,
      document.body
    );
  }

  const arrowBase =
    'font-mono text-2xl text-off-white hover:text-accent focus-visible:text-accent focus:outline-none transition-colors duration-150 px-3 py-2';

  return createPortal(
    <div
      ref={dialogRef}
      // z above the fixed ECG scroll-progress line (z 200)
      className="fixed inset-0 z-[300] flex items-center justify-center"
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

      {/* Desktop/tablet arrows: outside the image */}
      <button
        className={`hidden md:block absolute left-4 top-1/2 -translate-y-1/2 z-10 ${arrowBase}`}
        onClick={(e) => { e.stopPropagation(); prev(); }}
        aria-label={t('prev')}
      >←</button>

      <figure
        className="relative w-full max-w-5xl mx-0 md:mx-16"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative w-full border-y md:border border-accent bg-bg"
          style={{ aspectRatio: '1600 / 756' }}
        >
          <Image
            src={shot.src}
            alt={shot.caption}
            fill
            className="object-contain"
            sizes="(min-width: 1024px) 1024px, 100vw"
            priority
          />
        </div>
        <figcaption className="flex items-start gap-3 pt-3 px-4 md:px-0">
          <span className="font-mono text-xs text-accent shrink-0">{String(index + 1).padStart(2, '0')}</span>
          <span className="font-mono text-xs text-off-white">
            <span className="uppercase tracking-widest">{shot.label}</span>
            <span className="text-muted"> — </span>
            {shot.caption}
          </span>
          <span className="font-mono text-xs text-muted ml-auto shrink-0">{index + 1} / {total}</span>
        </figcaption>

        {/* Mobile controls: arrows below the image + full-size link (native pinch-zoom there) */}
        <div className="md:hidden flex items-center justify-between px-1 pt-4">
          <button className={arrowBase} onClick={prev} aria-label={t('prev')}>←</button>
          <a
            href={shot.src}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-off-white uppercase tracking-widest underline decoration-accent underline-offset-4 px-2 py-2"
          >
            {t('full_size')}
          </a>
          <button className={arrowBase} onClick={next} aria-label={t('next')}>→</button>
        </div>
      </figure>

      <button
        className={`hidden md:block absolute right-4 top-1/2 -translate-y-1/2 z-10 ${arrowBase}`}
        onClick={(e) => { e.stopPropagation(); next(); }}
        aria-label={t('next')}
      >→</button>
    </div>,
    document.body
  );
}
