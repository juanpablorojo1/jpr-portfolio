'use client';

/* Frame by Frame «Señal» · la sala de proyección (escritorio ≥1024 con la escena viva). U4.
   La escena (projector.js, dentro del pasillo de corridor.js) dibuja la sala, el haz y las pantallas, y reproduce la
   vista previa muda de la pantalla en foco. Acá vive la capa HTML:
   - Titular, nota de posproducción por IA y stack, al encenderse el haz (plano de situación).
   - Un rótulo por pantalla del lado contrario a ella: ficha, título, texto, herramientas, crédito y controles.
     La escena le escribe un parallax leve en el mismo frame del render (S.fbf.tags). Entra con el gesto del sitio
     (titular desde z −1100, expo.out 1,2 s; el resto 14 px, 1,0 s); sale en 0,5 s.
   - «Reproducir» (o clic en la pantalla en foco) abre el video con sonido en un <dialog> modal con controles nativos;
     mientras está abierto, la vista previa de la escena se pausa (S.fbf.open). «Pausar vista previa» la detiene
     (S.fbf.paused, WCAG 2.2.2).
   Los textos y controles siguen en el árbol de accesibilidad aunque estén apagados (opacidad 0): con Tab, el foco
   en un rótulo apagado lleva el scroll a su estadía. Sin escena viva: los rótulos con su poster en HTML.
   El guion (estadías, alto de la sección) es frames.ts, el mismo que usa la cámara. */

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { onSignal, type Senal } from '../hero/senal/signal';
import {
  FBF_DWELLS, FBF_SCREENS, FBF_SECTION_VH, fbfTagWanted, fbfIntroWanted, fbfChromeWanted, fbfCurrent,
} from '../hero/senal/frames';
import { VIDEOS } from '../../lib/content';
import { idleTask, lazySet, setBatch } from '../../lib/idle';
import './videos-senal.css';

gsap.registerPlugin(SplitText);

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function VideosStage() {
  const t = useTranslations('videos');
  const ref = useRef<HTMLElement>(null);
  const dlgRef = useRef<HTMLDialogElement>(null);
  const dlgVideoRef = useRef<HTMLVideoElement>(null);
  const sRef = useRef<Senal | null>(null);
  const backRef = useRef<HTMLElement | null>(null);
  // limpieza en el acto (el evento 'close' llega en una tarea aparte: queda de respaldo, la limpieza es idempotente)
  const cleanupRef = useRef<() => void>(() => {});
  const onShowRef = useRef<() => void>(() => {});
  const [paused, setPaused] = useState(false);
  const [openK, setOpenK] = useState(-1);
  const total = pad2(VIDEOS.length);

  useEffect(() => { if (sRef.current) sRef.current.fbf.paused = paused; }, [paused]);

  /* ---------- diálogo: el video con sonido y controles nativos ---------- */
  const openVideo = (k: number) => {
    const d = dlgRef.current, v = dlgVideoRef.current;
    if (!d || !v || d.open) return;
    backRef.current = document.activeElement as HTMLElement | null;
    const item = VIDEOS[k];
    v.poster = item.poster;
    v.src = item.src;
    setOpenK(k);
    if (sRef.current) sRef.current.fbf.open = k;
    d.showModal();
    onShowRef.current();
    v.focus({ preventScroll: true });
    v.play().catch(() => { /* el navegador lo rechazó: quedan los controles nativos */ });
  };
  const closeVideo = () => { const d = dlgRef.current; if (d?.open) d.close(); cleanupRef.current(); };

  useEffect(() => {
    const d = dlgRef.current, v = dlgVideoRef.current;
    if (!d || !v) return;
    const SCROLL_KEYS = new Set(['PageDown', 'PageUp', 'Home', 'End']);
    const block = (e: Event) => { if (d.open) e.preventDefault(); };
    const keys = (e: KeyboardEvent) => {
      if (!d.open) return;
      // en la página de atrás no se scrollea; dentro del video las flechas y el espacio son del reproductor
      if (SCROLL_KEYS.has(e.key) || ((e.key === ' ' || e.key.startsWith('Arrow')) && e.target !== v)) {
        if (!(e.target as HTMLElement).closest?.('button')) e.preventDefault();
      }
    };
    let shown = false;
    const onClose = () => {
      if (!shown) return;
      shown = false;
      v.pause();
      v.removeAttribute('src');
      v.load();
      setOpenK(-1);
      if (sRef.current) sRef.current.fbf.open = -1;
      removeEventListener('wheel', block);
      removeEventListener('touchmove', block);
      const back = backRef.current;
      if (back && document.contains(back)) back.focus({ preventScroll: true });
    };
    cleanupRef.current = onClose;
    const onShow = () => {
      if (shown) return;
      shown = true;
      addEventListener('wheel', block, { passive: false });
      addEventListener('touchmove', block, { passive: false });
    };
    // clic en el fondo del diálogo (fuera del video y de la barra) lo cierra
    const onClick = (e: MouseEvent) => { if (e.target === d) { d.close(); onClose(); } };
    // Esc: el navegador cierra el diálogo; la limpieza va acá mismo
    const onCancel = () => { queueMicrotask(onClose); };
    d.addEventListener('close', onClose);
    d.addEventListener('cancel', onCancel);
    d.addEventListener('click', onClick);
    addEventListener('keydown', keys);
    onShowRef.current = onShow;
    return () => {
      d.removeEventListener('close', onClose);
      d.removeEventListener('cancel', onCancel);
      d.removeEventListener('click', onClick);
      removeEventListener('keydown', keys);
      removeEventListener('wheel', block);
      removeEventListener('touchmove', block);
      if (d.open) d.close();
      onClose();
    };
  }, []);

  /* ---------- coreografía con la cámara ---------- */
  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const zone = section.closest<HTMLElement>('.fbf-zone');
      const stage = section.querySelector<HTMLElement>('.fv-stage');
      const label = section.querySelector<HTMLElement>('.fv-label');
      const count = section.querySelector<HTMLElement>('.fv-count');
      const countN = section.querySelector<HTMLElement>('.fv-count b');
      const intro = section.querySelector<HTMLElement>('.fv-intro');
      const head = section.querySelector<HTMLElement>('.fv-head');
      const tags = Array.from(section.querySelectorAll<HTMLElement>('.fv-tag'));
      if (!zone || !stage || !label || !count || !countN || !intro || !head || tags.length !== FBF_DWELLS.length) return;
      let S: Senal | null = null;
      const offSignal = onSignal((s) => { S = s; sRef.current = s; s.fbf.tags = tags; });
      let alive = true;

      type T = { el: HTMLElement; title: HTMLElement; rest: HTMLElement[]; split: SplitText | null; on: boolean; tl: gsap.core.Timeline | null };
      const mk = (el: HTMLElement, title: HTMLElement, rest: HTMLElement[]): T => ({ el, title, rest, split: null, on: false, tl: null });
      const ts: T[] = tags.map((el) => mk(el, el.querySelector<HTMLElement>('.fv-title')!, Array.from(el.querySelectorAll<HTMLElement>('.fv-eyebrow, .fv-chips, .fv-cap, .fv-made, .fv-credit, .fv-acts'))));
      const it: T = mk(intro, head, Array.from(intro.querySelectorAll<HTMLElement>('.fv-note, .fv-hint, .fv-tools')));
      const all = [...ts, it];
      let chromeOn = false;
      let cancelPrep = () => {};
      const hideJobs: Array<[HTMLElement | HTMLElement[] | null, gsap.TweenVars]> = [
        [[label, count], { opacity: 0, y: 14 }],
        ...all.flatMap((c): Array<[HTMLElement | HTMLElement[], gsap.TweenVars]> => [[c.rest, { opacity: 0, y: 14 }], [c.title, { opacity: 0 }]]),
      ];

      // L: el aterrizaje del About (el mismo que usa la cámara: trig.end = alto de la zona del hero)
      let land = 1;
      const measure = () => {
        const hz = document.querySelector<HTMLElement>('.transition-zone[data-section="hero"]');
        land = Math.max(1, (hz?.parentElement?.offsetTop ?? 0) + (hz?.offsetHeight ?? 0));
      };
      measure();
      addEventListener('resize', measure);
      // estado inicial (todo apagado): ya si la sección está cerca de la vista; si no, en su tarea ociosa o al primer
      // scroll, fuera de la hidratación (D-01). Lejos no se ve: el resultado es el mismo.
      const hidden = lazySet(section, hideJobs);

      const show = (c: T) => {
        c.on = true;
        c.tl?.kill();
        c.el.setAttribute('data-on', '');
        c.tl = gsap.timeline();
        if (c.split) c.tl.to(c.split.chars, { z: 0, y: 0, rotationX: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: 0.012 }, 0.12);
        c.tl.to(c.rest, { opacity: 1, y: 0, duration: 1.0, ease: 'expo.out', stagger: 0.07 }, 0.05);
      };
      const hide = (c: T) => {
        c.on = false;
        c.tl?.kill();
        c.tl = gsap.timeline({ onComplete: () => { c.el.removeAttribute('data-on'); c.el.style.transform = ''; } });
        if (c.split) c.tl.to(c.split.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0, duration: 0.5, ease: 'expo.out', stagger: 0.003 }, 0);
        c.tl.to(c.rest, { opacity: 0, y: 14, duration: 0.35, ease: 'expo.out' }, 0);
      };

      // clic en la escena sobre la pantalla en foco: abre su video con sonido
      const onDocClick = (e: MouseEvent) => {
        if (e.button !== 0 || !S || S.fbf.hover < 0) return;
        if ((e.target as HTMLElement).closest('a, button, input, dialog, [role="dialog"], .jnav')) return;
        if (ts[S.fbf.hover]?.on) openVideo(S.fbf.hover);
      };
      document.addEventListener('click', onDocClick);
      // teclado: el foco en un rótulo apagado lleva el scroll a su estadía (la cámara encara la pantalla)
      const onFocusIn = (e: FocusEvent) => {
        if (dlgRef.current?.open) return;
        const tag = (e.target as HTMLElement).closest<HTMLElement>('.fv-tag');
        if (!tag) return;
        const k = tags.indexOf(tag);
        if (k < 0 || ts[k].on) return;
        const [d0, d1] = FBF_DWELLS[k];
        window.scrollTo({ top: land + ((d0 + d1) / 2) * innerHeight, behavior: 'instant' as ScrollBehavior });
      };
      section.addEventListener('focusin', onFocusIn);

      const tick = () => {
        if (!zone.hasAttribute('data-gallery')) return;
        const raw = (scrollY - land) / innerHeight;
        const live = !!(zone.hasAttribute('data-see-through') && S && !S.dead && S.fbf.live);
        const u = live && S ? S.state.gal : raw;            // con escena: el texto llega con la cámara
        stage.classList.toggle('is-live', live);
        const wantChrome = fbfChromeWanted(u);
        if (wantChrome !== chromeOn) {
          chromeOn = wantChrome;
          gsap.to([label, count], { opacity: wantChrome ? 1 : 0, y: wantChrome ? 0 : 14, duration: wantChrome ? 0.8 : 0.35, ease: 'expo.out', overwrite: true });
        }
        const n = pad2(fbfCurrent(u) + 1);
        if (countN.textContent !== n) countN.textContent = n;
        const wi = fbfIntroWanted(u);
        if (wi && !it.on) show(it); else if (!wi && it.on) hide(it);
        ts.forEach((c, k) => {
          const want = fbfTagWanted(k, u);
          if (want && !c.on) show(c); else if (!want && c.on) hide(c);
        });
      };

      // titulares partidos fuera de la hidratación, en su propia tarea ociosa (D-01): partir, medir, preparar
      document.fonts.ready.then(() => {
        if (!alive) return;
        cancelPrep = idleTask(() => {
          if (!alive) return;
          hidden.ensure();
          all.forEach((c) => { c.split = SplitText.create(c.title, { type: 'words,chars', wordsClass: 'word', charsClass: 'char', aria: 'none' }); });
          measure();
          setBatch([
            ...all.map((c): [Element[], gsap.TweenVars] => [c.split!.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0 }]),
            ...all.map((c): [HTMLElement, gsap.TweenVars] => [c.title, { opacity: 1 }]),
          ]);
          gsap.ticker.add(tick);
        });
      });

      return () => {
        alive = false;
        cancelPrep();
        hidden.cancel();
        gsap.ticker.remove(tick);
        removeEventListener('resize', measure);
        document.removeEventListener('click', onDocClick);
        section.removeEventListener('focusin', onFocusIn);
        if (S) { S.fbf.tags = []; S.fbf.paused = false; }
        offSignal();
        sRef.current = null;
        stage.classList.remove('is-live');
        document.documentElement.classList.remove('fv-hot');
        all.forEach((c) => {
          c.tl?.kill();
          c.el.removeAttribute('data-on');
          c.el.style.transform = '';
          if (c.split) { gsap.killTweensOf(c.split.chars); c.split.revert(); }
          gsap.set([...c.rest, c.title], { clearProps: 'opacity,transform' });
        });
        gsap.set([label, count], { clearProps: 'opacity,transform' });
      };
    });
    return () => mm.revert();
    // openVideo sólo usa refs: estable para el efecto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stack = t.raw('stack') as string[];
  const cur = openK >= 0 ? VIDEOS[openK] : null;

  return (
    <section ref={ref} className="fv-gal" aria-label={t('label')} style={{ height: `${FBF_SECTION_VH * 100}vh` }}>
      <div className="fv-stage">
        <p className="fv-label"><span className="fv-dot" aria-hidden="true" />{t('label')}</p>
        <p className="fv-count" aria-hidden="true"><b>01</b> / {total}</p>

        {/* plano de situación: titular, cómo se hacen las piezas y con qué */}
        <div className="fv-intro">
          <h2 className="fv-head font-display" aria-label={t('headline')}>{t('headline')}</h2>
          <p className="fv-note">{t('note')}</p>
          <p className="fv-hint">{t('intro_click')}</p>
          <div className="fv-tools">
            <p className="fv-k">{t('stack_label')}</p>
            <p className="fv-mono">{stack.join(' · ')}</p>
          </div>
        </div>

        {/* una ficha por pantalla, del lado contrario a ella (frames.ts: side) */}
        {VIDEOS.map((item, k) => {
          const title = t(`items.${item.id}.title`);
          const audio = item.audioLang === 'es' ? t('audio_es') : item.audioLang === 'en' ? t('audio_en') : null;
          return (
            <article key={item.id} className="fv-tag" data-side={FBF_SCREENS[k].side < 0 ? 'r' : 'l'} data-land={item.width > item.height ? '' : undefined} aria-labelledby={`fv-t-${k}`}>
              {/* sin escena viva: el poster en HTML (con la escena, la pantalla está en la sala) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="fv-poster" src={item.poster} alt="" loading="lazy" decoding="async" width={item.width} height={item.height} />
              <p className="fv-eyebrow"><b>{pad2(k + 1)}</b> / {total} · {t(`items.${item.id}.eyebrow`)}</p>
              <h3 id={`fv-t-${k}`} className="fv-title font-display" aria-label={title}>{title}</h3>
              <p className="fv-chips">{item.duration}{audio && <> · {audio}</>}</p>
              <p className="fv-cap">{t(`items.${item.id}.caption`)}</p>
              <p className="fv-made">{t(`items.${item.id}.made_with`)}</p>
              {item.creditHref && (
                <p className="fv-credit">
                  {t.rich(`items.${item.id}.credit`, {
                    license: (chunks) => <a href={item.creditHref} target="_blank" rel="noopener noreferrer license">{chunks}</a>,
                  })}
                </p>
              )}
              <div className="fv-acts">
                <button type="button" className="fv-btn fv-play" onClick={() => openVideo(k)} aria-label={t('play_aria', { title })} aria-haspopup="dialog">
                  <svg width="9" height="10" viewBox="0 0 14 16" fill="currentColor" aria-hidden="true"><path d="M0 0 L14 8 L0 16 Z" /></svg>
                  {t('play')}
                </button>
                <button type="button" className="fv-btn fv-pause" onClick={() => setPaused((p) => !p)}>
                  {paused
                    ? <svg width="9" height="10" viewBox="0 0 14 16" fill="currentColor" aria-hidden="true"><path d="M0 0 L14 8 L0 16 Z" /></svg>
                    : <svg width="9" height="10" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true"><path d="M0 0h3.5v12H0zM6.5 0H10v12H6.5z" /></svg>}
                  {paused ? t('preview_play') : t('preview_pause')}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* el video con sonido: diálogo modal nativo (Esc, foco atrapado por el navegador, foco de vuelta al cerrar) */}
      <dialog ref={dlgRef} className="fv-dlg" aria-labelledby="fv-dlg-t">
        <div className="fv-dlg-bar">
          <p id="fv-dlg-t">{cur ? <><b>{pad2(openK + 1)}</b> / {total} · {t(`items.${cur.id}.title`)}</> : ''}</p>
          <button type="button" className="fv-btn" onClick={closeVideo}>{t('close')}</button>
        </div>
        <video ref={dlgVideoRef} className="fv-dlg-video" controls playsInline preload="none" data-portfolio-video="" />
      </dialog>
    </section>
  );
}
