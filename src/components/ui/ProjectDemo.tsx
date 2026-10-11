'use client';

/* Video demo de un proyecto (Track C, 2026-10-11) en el caso: el panel del negatoscopio (ProjectsGallery) y el
   apilado de celular / sin escena (CaseStudyMobile). Loop mudo, sin controles nativos.
   - Carga: preload="none" y el poster recién cerca de la vista (no pesa en la carga de la página: el panel y el
     apilado existen siempre en el DOM, uno de los dos oculto).
   - Corre sólo a la vista (IntersectionObserver: un panel cerrado o un apilado oculto no cuentan) y se pausa al salir.
   - Pausa del usuario (WCAG 2.2.2): botón propio. Con prefers-reduced-motion no arranca solo: queda el poster y el
     botón dice «Reproducir». */

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ProjectDemo as Demo } from '../../lib/content';
import './project-demo.css';

type Props = { demo: Demo; title: string; alt: string; className?: string };

export default function ProjectDemo({ demo, title, alt, className = '' }: Props) {
  const t = useTranslations('projects.case');
  const box = useRef<HTMLElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [paused, setPaused] = useState(false);      // pausa del usuario
  const [playing, setPlaying] = useState(false);
  const inView = useRef(false);
  const userPaused = useRef(false);

  const sync = () => {
    const v = vid.current;
    if (!v) return;
    if (inView.current && !userPaused.current) v.play().catch(() => {});
    else if (!v.paused) v.pause();
  };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // reduced motion: no arranca solo (el usuario lo pone en marcha con el botón)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { userPaused.current = true; setPaused(true); }
    const ioNear = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); ioNear.disconnect(); } }, { rootMargin: '600px 0px' });
    const io = new IntersectionObserver(([e]) => { inView.current = e.isIntersecting; sync(); }, { threshold: 0.35 });
    ioNear.observe(el);
    io.observe(el);
    return () => { ioNear.disconnect(); io.disconnect(); vid.current?.pause(); };
  }, []);
  // las <source> entran con near: si ya estaba a la vista, recién ahora puede arrancar
  useEffect(() => { if (near) sync(); }, [near]);

  const toggle = () => {
    userPaused.current = !userPaused.current;
    setPaused(userPaused.current);
    if (userPaused.current) vid.current?.pause();
    else { inView.current = true; sync(); }
  };

  const label = paused || !playing ? t('demo_play') : t('demo_pause');
  const aria = paused || !playing ? t('demo_play_aria', { title }) : t('demo_pause_aria', { title });

  return (
    <figure ref={box} className={`pdemo ${className}`}>
      <div className="pdemo-frame" style={{ aspectRatio: `${demo.width} / ${demo.height}` }}>
        <video
          ref={vid}
          muted
          playsInline
          loop
          preload="none"
          poster={near ? demo.poster : undefined}
          aria-label={alt}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        >
          {near && <source src={demo.mp4} type="video/mp4" />}
          {near && <source src={demo.webm} type="video/webm" />}
        </video>
      </div>
      <figcaption className="pdemo-bar">
        <span className="pdemo-k"><span className="pdemo-dot" aria-hidden="true" />{t('demo')} · {demo.duration}</span>
        <button type="button" className="pdemo-btn" onClick={toggle} aria-label={aria}>
          {paused || !playing
            ? <svg width="9" height="10" viewBox="0 0 14 16" fill="currentColor" aria-hidden="true"><path d="M0 0 L14 8 L0 16 Z" /></svg>
            : <svg width="9" height="10" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true"><path d="M0 0h3.5v12H0zM6.5 0H10v12H6.5z" /></svg>}
          {label}
        </button>
      </figcaption>
    </figure>
  );
}
