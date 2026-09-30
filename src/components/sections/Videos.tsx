'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { VIDEOS, type VideoItem } from '../../lib/content';

// Motion & Video — data-driven from VIDEOS (src/lib/content.ts) + messages videos.items.<id>.
// Lives OUTSIDE the card stack (like Skills): a normal-flow block that scrolls over the
// sticky Projects card, so the stack and the horizontal rail math stay untouched.
// Videos never autoplay: preload="none", a lazy optimized poster, and playback (with sound
// and native controls) starts only on click/tap. Starting one pauses the others.

function VideoCard({ item }: { item: VideoItem }) {
  const t = useTranslations('videos');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);

  const title = t(`items.${item.id}.title`);
  const eyebrow = t(`items.${item.id}.eyebrow`);
  const caption = t(`items.${item.id}.caption`);
  const landscape = item.orientation === 'landscape';

  const start = () => {
    const v = videoRef.current;
    if (!v) return;
    setStarted(true);
    v.play().catch(() => {
      // If the browser refuses, fall back to native controls so the user can press play.
      setPlaying(true);
    });
  };

  const onPlay = () => {
    document.querySelectorAll<HTMLVideoElement>('video[data-portfolio-video]').forEach((other) => {
      if (other !== videoRef.current && !other.paused) other.pause();
    });
  };

  const audioLabel = item.audioLang === 'es' ? t('audio_es') : item.audioLang === 'en' ? t('audio_en') : null;

  const chips = (
    <span className="flex gap-2" aria-hidden="true">
      <span className="font-mono text-[10px] text-off-white bg-bg/80 border border-border rounded-xs px-1.5 py-0.5 tracking-widest">{item.duration}</span>
      {audioLabel && (
        <span className="font-mono text-[10px] text-off-white bg-bg/80 border border-border rounded-xs px-1.5 py-0.5 tracking-widest uppercase">{audioLabel}</span>
      )}
    </span>
  );

  const media = (
    <div
      className="group relative w-full overflow-hidden border border-border bg-surface"
      style={{ aspectRatio: `${item.width} / ${item.height}` }}
    >
      <video
        ref={videoRef}
        data-portfolio-video=""
        src={item.src}
        preload="none"
        playsInline
        controls={playing}
        onPlay={onPlay}
        onPlaying={() => setPlaying(true)}
        className="absolute inset-0 w-full h-full object-contain bg-bg"
        aria-label={title}
      />

      {!playing && (
        <button
          type="button"
          onClick={start}
          className="absolute inset-0 w-full h-full text-left focus:outline-none"
          aria-label={t('play_aria', { title })}
        >
          <Image
            src={item.poster}
            alt=""
            fill
            // Landscape posters carry text to the edge: no hover zoom there (it would crop it)
            className={`object-cover ${landscape ? '' : 'motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-[1.03]'}`}
            sizes={landscape ? '(min-width: 1024px) 70vw, 90vw' : '(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 80vw'}
          />
          <span
            className={`absolute inset-0 ${landscape ? 'bg-bg/45 group-hover:bg-bg/30 transition-colors duration-200' : 'bg-gradient-to-t from-bg/80 via-bg/10 to-transparent'}`}
            aria-hidden="true"
          />

          {/* Meta chips — on the poster for portrait; landscape shows them in the text column */}
          {!landscape && <span className="absolute top-3 left-3">{chips}</span>}

          {/* Play control — square, per system (radius 0) */}
          <span
            className={`absolute flex items-center gap-3 ${landscape ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex-col' : 'left-3 bottom-3'}`}
            aria-hidden="true"
          >
            <span className={`flex items-center justify-center border border-accent bg-bg/70 transition-colors duration-150 group-hover:bg-accent group-focus-visible:bg-accent ${landscape ? 'w-16 h-16' : 'w-12 h-12'}`}>
              {started ? (
                <span className="block w-3 h-3 border border-off-white motion-safe:animate-spin" />
              ) : (
                <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor" className="text-off-white translate-x-px">
                  <path d="M0 0 L14 8 L0 16 Z" />
                </svg>
              )}
            </span>
            <span className="font-mono text-xs text-off-white uppercase tracking-widest">{t('play')}</span>
          </span>
        </button>
      )}
    </div>
  );

  const text = (
    <div className={landscape ? 'pt-4 lg:pt-0' : 'pt-4'}>
      {landscape && <div className="mb-3">{chips}</div>}
      <p className="font-mono text-[10px] sm:text-xs text-accent uppercase tracking-widest mb-1.5">{eyebrow}</p>
      <h3 className="font-ui font-bold text-off-white text-lg leading-snug mb-2">{title}</h3>
      <p className="font-ui text-muted text-sm leading-relaxed">{caption}</p>
    </div>
  );

  if (landscape) {
    return (
      <article className="shrink-0 w-[88vw] snap-start sm:w-auto sm:col-span-2 lg:col-span-4 lg:grid lg:grid-cols-4 lg:gap-6 lg:items-end">
        <div className="lg:col-span-3">{media}</div>
        <div className="lg:col-span-1">{text}</div>
      </article>
    );
  }

  return (
    <article className="shrink-0 w-[72vw] snap-start sm:w-auto">
      {media}
      {text}
    </article>
  );
}

export default function Videos() {
  const t = useTranslations('videos');

  return (
    <section id="videos" className="py-16 lg:py-24 bg-bg border-t border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="lg:grid lg:grid-cols-4 lg:gap-6 mb-8 lg:mb-12">
          <div className="lg:col-span-2">
            <p className="font-mono text-xs text-accent tracking-widest uppercase mb-3 lg:mb-6">{t('label')}</p>
            <h2
              className="font-display text-white uppercase leading-none"
              style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)' }}
            >
              {t('headline')}
            </h2>
          </div>
          <p className="lg:col-span-2 lg:self-end font-ui text-muted text-base lg:text-lg mt-4 lg:mt-0 max-w-md">
            {t('intro')}{' '}
            {/* Fine pointer (mouse) says "click", touch says "tap" */}
            <span className="hidden [@media(pointer:fine)]:inline">{t('intro_click')}</span>
            <span className="[@media(pointer:fine)]:hidden">{t('intro_tap')}</span>
          </p>
        </div>

        {/* Mobile: horizontal snap strip (contained overflow). sm+: grid. */}
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-6 sm:scroll-px-0 -mx-6 px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 lg:gap-y-12">
          {VIDEOS.map((item) => (
            <VideoCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
