'use client';

/* Frame by Frame «Tambor 360» en el teléfono (< 1024, U4 2026-10-14, rama mobile-senal). Sin escena 3D: el tambor es
   CSS 3D (perspective + preserve-3d), un prisma de 5 caras 9:16 con la cara de frente casi a pantalla completa y las
   vecinas asomando de costado, en escorzo y en sombra.
   - Giro: swipe horizontal con Pointer Events sobre el escenario (touch-action: pan-y: el scroll vertical sigue siendo
     del navegador). El tambor sigue al dedo; al soltar se proyecta con la velocidad del gesto (hasta 2 caras con un
     tirón) y se asienta con power3.out cuya velocidad inicial es la del dedo: no hay salto entre arrastre y asentado.
     Flechas (52 px), ← → con el foco en la galería, y un toque sobre una cara vecina la trae al frente.
   - El asentado cae en un latido: la recta roja del piso dispara un complejo QRS bajo la cara y el borde de la cara
     se enciende un instante (con vibración de 8 ms en Android si el giro vino del dedo).
   - Videos: preload="none", el src recién cuando la cara llega al frente con la sección a la vista; corre sólo la de
     frente, muda (autoplay), con la sección a la vista y la pestaña visible. Toque sobre la cara de frente = pausa
     (WCAG 2.2.2), también el botón. Sonido al alcance del pulgar (abajo a la derecha): suena sólo la cara de frente.
   - Reduced motion: sin giro animado (cambio directo de cara), sin entrada, sin latido, sin autoplay (la cara muestra
     el botón de reproducir).
   En >= 1024 este bloque está en display: none (videos-phone.css) y sus pósters piden un GIF de 1 px.
   10 videos, 5 caras (2026-10-14, opción A de Juan: «Mismo tambor, 10 videos»): el prisma sigue siendo de 5. El giro es
   un paso lógico: cara de frente = paso mod 5, video = paso mod 10. Cada cara muestra el video del paso más cercano que
   le toca; cambia sólo cuando la cara cruza los 180° (oculta), y ahí suelta el src del video que sale. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getImageProps } from 'next/image';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import StackBadge from '../ui/StackBadge';
import { VIDEOS } from '../../lib/content';
import { phoneReveal } from '../../lib/phoneMotion';
import './videos-phone.css';

const NV = VIDEOS.length;                        // videos que recorre (10)
const N = 5;                                     // caras del prisma (fijo)
const STEP = 360 / N;
const modN = (a: number, n: number) => ((a % n) + n) % n;
const mod = (a: number) => modN(a, NV);          // paso → video
const face = (a: number) => modN(a, N);          // paso → cara
/** pasos de la cara k al frente, en [-2,5, 2,5): ±2,5 = de espaldas */
const relOf = (k: number, v: number) => modN(k - v + N / 2, N) - N / 2;
/** el video de la cara k con el tambor en v: el del paso más cercano que cae en esa cara */
const vidOf = (k: number, v: number) => mod(Math.round(v + relOf(k, v)));
const FACES = Array.from({ length: N }, (_, k) => k);
const pad2 = (n: number) => String(n).padStart(2, '0');
const PHONE_MQ = '(max-width: 1023px)';
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
/** el complejo del latido, en un cuadro de 120 × 36 (la recta sigue por fuera, en CSS) */
const BEAT = 'M0 26 H40 L45 23 L50 26 H55 L59 29 L64 4 L69 33 L73 26 H80 L86 21 L92 26 H120';

const posterProps = (src: string, w: number, h: number, land: boolean) =>
  getImageProps({ src, alt: '', width: w, height: h, sizes: land ? '86vw' : '(max-width: 767px) 86vw, 420px' }).props;

/** el póster de la cara: sólo el teléfono lo pide (en >= 1024 la fuente es un GIF de 1 px, como DeskOnlyImage) */
function Poster({ src, w, h, land }: { src: string; w: number; h: number; land: boolean }) {
  const props = posterProps(src, w, h, land);
  return (
    <picture>
      <source media="(min-width: 1024px)" srcSet={BLANK} />
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img {...props} className="fvm-poster" loading="lazy" decoding="async" draggable={false} />
    </picture>
  );
}

export default function VideosPhone() {
  const t = useTranslations('videos');
  const secRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const drumRef = useRef<HTMLDivElement>(null);
  const faceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadeRefs = useRef<(HTMLElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const floorRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<HTMLDivElement>(null);
  const rot = useRef({ v: 0, target: 0 });
  const twRef = useRef<gsap.core.Tween | null>(null);
  const beatRef = useRef<gsap.core.Tween | null>(null);
  const touched = useRef(false);                 // el usuario ya giró: la entrada no se mete
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageOn, setPageOn] = useState(true);
  const [phone, setPhone] = useState(false);
  // por cara: qué video muestra, si su <video> tiene src y si ya está corriendo sobre el póster
  const [faceVid, setFaceVid] = useState<number[]>(() => FACES.map((k) => vidOf(k, 0)));
  const [armed, setArmed] = useState<boolean[]>(() => FACES.map(() => false));
  const [shown, setShown] = useState<boolean[]>(() => FACES.map(() => false));
  const faceVidRef = useRef(faceVid);
  const armedRef = useRef(armed);
  armedRef.current = armed;

  /** la cara suelta su video: sin src (el efecto de abajo hace load() y libera el buffer), vuelve el póster */
  const disarm = useCallback((ks: number[]) => {
    setArmed((a) => (ks.some((k) => a[k]) ? a.map((x, k) => (ks.includes(k) ? false : x)) : a));
    setShown((a) => (ks.some((k) => a[k]) ? a.map((x, k) => (ks.includes(k) ? false : x)) : a));
  }, []);

  /* ---------- pintar el tambor: rotación + sombra de cada cara según su ángulo ---------- */
  const paint = useCallback((v: number) => {
    const drum = drumRef.current;
    if (!drum) return;
    drum.style.transform = `translateZ(calc(var(--fa) * -1)) rotateY(${(-v * STEP).toFixed(3)}deg)`;
    let fv: number[] | null = null;
    const drop: number[] = [];
    const tf = face(rot.current.target);
    for (let k = 0; k < N; k++) {
      let d = (k - v) % N;
      if (d > N / 2) d -= N;
      if (d < -N / 2) d += N;
      const ang = Math.abs(d * STEP);
      const sh = shadeRefs.current[k];
      if (sh) sh.style.opacity = Math.min(0.9, (1 - Math.cos((ang * Math.PI) / 180)) * 1.5).toFixed(3);
      const f = faceRefs.current[k];
      const hid = ang > 112;
      if (f) f.style.visibility = hid ? 'hidden' : '';
      // reasignación de espaldas (cruza los 180°, oculta): toma el video nuevo y suelta el que sale
      const j = vidOf(k, v);
      if (j !== faceVidRef.current[k]) {
        fv = fv || faceVidRef.current.slice();
        fv[k] = j;
        drop.push(k);
      } else if (hid && k !== tf && armedRef.current[k]) drop.push(k);   // oculta y no es la que llega: suelta el src
    }
    if (fv) { faceVidRef.current = fv; setFaceVid(fv); }
    if (drop.length) disarm(drop);
  }, [disarm]);

  /* ---------- el latido del asentado ---------- */
  const beat = useCallback((fromSwipe: boolean) => {
    const floor = floorRef.current;
    if (!floor || reduced()) return;
    const pulse = floor.querySelector<SVGPathElement>('.fvm-pulse');
    const lines = floor.querySelectorAll<HTMLElement>('.fvm-floor-l');
    const rim = faceRefs.current[face(rot.current.target)]?.querySelector<HTMLElement>('.fvm-rim');
    if (pulse) gsap.fromTo(pulse, { strokeDashoffset: 0.24, opacity: 1 }, { strokeDashoffset: -1, duration: 0.62, ease: 'power2.inOut', overwrite: true });
    gsap.fromTo(lines, { opacity: 1 }, { opacity: 0.42, duration: 0.9, ease: 'expo.out', overwrite: 'auto' });
    if (rim) gsap.fromTo(rim, { opacity: 0.95 }, { opacity: 0, duration: 0.85, ease: 'expo.out', delay: 0.08, overwrite: true });
    if (fromSwipe && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(8); } catch { /* sin permiso: nada */ }
    }
  }, []);

  /* ---------- giro ---------- */
  const turnTo = useCallback((target: number, dur = 0.9, ease = 'expo.out', fromSwipe = false) => {
    rot.current.target = target;
    setFront(mod(target));
    twRef.current?.kill();
    beatRef.current?.kill();
    if (reduced()) { rot.current.v = target; paint(target); return; }
    twRef.current = gsap.to(rot.current, { v: target, duration: dur, ease, onUpdate: () => paint(rot.current.v) });
    // el latido cae cuando la cara ya llegó a la vista (la cola del ease es casi quieta)
    beatRef.current = gsap.delayedCall(dur * (ease === 'power3.out' ? 0.5 : 0.36), () => beat(fromSwipe));
  }, [beat, paint]);

  const go = useCallback((d: number) => { touched.current = true; turnTo(rot.current.target + d); }, [turnTo]);

  /* ---------- montaje: teléfono, reduced motion, pestaña visible, entradas del texto ---------- */
  useEffect(() => {
    const mq = matchMedia(PHONE_MQ);
    const rm = matchMedia('(prefers-reduced-motion: reduce)');
    const onMq = () => setPhone(mq.matches);
    const onRm = () => { if (rm.matches) setPaused(true); };
    onMq(); onRm();
    mq.addEventListener('change', onMq);
    rm.addEventListener('change', onRm);
    const onVis = () => setPageOn(document.visibilityState === 'visible');
    onVis();
    document.addEventListener('visibilitychange', onVis);
    paint(rot.current.v);
    return () => {
      mq.removeEventListener('change', onMq);
      rm.removeEventListener('change', onRm);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [paint]);

  useEffect(() => (secRef.current ? phoneReveal(secRef.current) : undefined), []);

  /* la sección a la vista (la mitad del escenario): ahí corre el video de frente */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const io = new IntersectionObserver(([e]) => setInView(e.intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] });
    io.observe(scene);
    return () => io.disconnect();
  }, []);

  /* F-04: el dock (Navbar, < 1024) no queda nunca sobre los controles. Mientras los controles cruzan la franja del dock
     (su alto: 56 px + safe area, contra el borde inferior) html.fvm-ctrl-low lo retira (navbar.css), como el escritorio
     retira el sonido global con fv-drum-ui. Afuera de esa franja el dock no cambia. Se mide en el mismo evento de scroll
     (sin esperar un cuadro): el toque que sigue ya encuentra el control. */
  useEffect(() => {
    const ctrl = ctrlRef.current;
    if (!phone || !ctrl) return;
    const html = document.documentElement;
    const dock = document.querySelector<HTMLElement>('.jnav-dock');
    const check = () => {
      const r = ctrl.getBoundingClientRect();
      const low = r.height > 0 && r.top < innerHeight && r.bottom > innerHeight - (dock?.offsetHeight || 56);
      if (low !== html.classList.contains('fvm-ctrl-low')) html.classList.toggle('fvm-ctrl-low', low);
    };
    check();
    addEventListener('scroll', check, { passive: true });
    addEventListener('resize', check);
    return () => {
      removeEventListener('scroll', check);
      removeEventListener('resize', check);
      html.classList.remove('fvm-ctrl-low');
    };
  }, [phone]);

  /* ---------- entrada del tambor: llega girando desde la cara anterior y se asienta en un latido ---------- */
  useEffect(() => {
    const scene = sceneRef.current, floor = floorRef.current;
    if (!scene || !floor) return;
    const mm = gsap.matchMedia();
    mm.add('(max-width: 1023px) and (prefers-reduced-motion: no-preference)', () => {
      const lines = floor.querySelectorAll<HTMLElement>('.fvm-floor-l');
      const blip = floor.querySelector<SVGPathElement>('.fvm-blip');
      if (!touched.current) { rot.current.v = rot.current.target - 1.15; paint(rot.current.v); }
      gsap.set(lines, { scaleX: 0 });
      if (blip) gsap.set(blip, { opacity: 0 });
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        gsap.to(lines, { scaleX: 1, duration: 1.1, ease: 'expo.out' });
        if (blip) gsap.to(blip, { opacity: 1, duration: 0.6, delay: 0.5, ease: 'power1.out' });
        if (touched.current) return;
        twRef.current?.kill();
        twRef.current = gsap.to(rot.current, { v: rot.current.target, duration: 1.8, ease: 'expo.out', onUpdate: () => paint(rot.current.v) });
        beatRef.current = gsap.delayedCall(0.62, () => beat(false));
      }, { threshold: 0.3 });
      io.observe(scene);
      return () => {
        io.disconnect();
        twRef.current?.kill();
        beatRef.current?.kill();
        rot.current.v = rot.current.target;
        paint(rot.current.v);
      };
    });
    return () => mm.revert();
  }, [beat, paint]);

  /* ---------- arrastre (Pointer Events): el tambor sigue al dedo y se asienta con la velocidad del gesto ---------- */
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    let id = -1, x0 = 0, y0 = 0, r0 = 0, moved = false, lastX = 0, lastT = 0, vel = 0;
    const per = () => {                                      // px de arrastre por cara: algo menos que el ancho (masa)
      const f = faceRefs.current[0];
      return Math.max(160, (f?.offsetWidth || innerWidth * 0.8) * 0.82);
    };
    const down = (e: PointerEvent) => {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      id = e.pointerId; x0 = lastX = e.clientX; y0 = e.clientY; lastT = performance.now(); vel = 0; moved = false;
      r0 = rot.current.v;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (!moved) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { id = -1; return; }   // es scroll: del navegador
        if (Math.abs(dx) < 8) return;
        moved = true; touched.current = true;
        twRef.current?.kill(); beatRef.current?.kill();
        r0 = rot.current.v; x0 = e.clientX;
        el.classList.add('is-drag');
        try { el.setPointerCapture(id); } catch { /* puntero ya liberado */ }
      }
      const now = performance.now(), dt = Math.max(8, now - lastT);
      vel = vel * 0.55 + ((e.clientX - lastX) / dt) * 0.45;      // px/ms, suavizado
      lastX = e.clientX; lastT = now;
      if (!reduced()) { rot.current.v = r0 - (e.clientX - x0) / per(); paint(rot.current.v); }
    };
    const end = (e: PointerEvent, cancel: boolean) => {
      if (e.pointerId !== id) return;
      id = -1;
      el.classList.remove('is-drag');
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (!moved) {
        if (cancel) return;
        // un toque: sobre la cara de frente pausa o reanuda; sobre una vecina la trae al frente
        const f = faceRefs.current[face(rot.current.target)];
        const r = f?.getBoundingClientRect();
        if (r && e.clientX < r.left) go(-1);
        else if (r && e.clientX > r.right) go(1);
        else setPaused((p) => !p);
        return;
      }
      const dx = e.clientX - x0;
      const base = Math.round(r0);
      if (reduced()) {                                          // sin inercia: un paso si el gesto alcanzó
        if (Math.abs(dx) > 40) turnTo(base + (dx < 0 ? 1 : -1));
        return;
      }
      const v = rot.current.v;
      if (cancel) { turnTo(Math.round(v), 0.6, 'power3.out'); return; }
      // velocidad en caras/s y proyección con una constante de 0,22 s (el tambor tiene masa: un tirón fuerte da 2 caras)
      const velF = (-vel * 1000) / per();
      let tgt = Math.round(v + velF * 0.22);
      tgt = Math.max(base - 2, Math.min(base + 2, tgt));
      if (tgt === base && Math.abs(v - r0) > 0.16) tgt = base + Math.sign(v - r0);
      const delta = tgt - v;
      // power3.out arranca a 3·Δ/dur: la duración se elige para que esa velocidad sea la del dedo
      const dur = Math.sign(velF) === Math.sign(delta) && Math.abs(velF) > 0.4
        ? Math.min(1.1, Math.max(0.38, (3 * Math.abs(delta)) / Math.abs(velF)))
        : Math.min(0.9, 0.45 + 0.5 * Math.abs(delta));
      turnTo(tgt, dur, 'power3.out', true);
    };
    const up = (e: PointerEvent) => end(e, false);
    const cancel = (e: PointerEvent) => end(e, true);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', cancel);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
    };
  }, [go, paint, turnTo]);

  /* ---------- reproducción: sólo la cara de frente, muda salvo que se pida sonido ---------- */
  const live = phone && inView && pageOn;
  const ff = face(front);                        // la cara de frente (front es el video)
  useEffect(() => {
    if (live && !armed[ff] && faceVid[ff] === front) setArmed((a) => a.map((x, k) => x || k === ff));
  }, [live, ff, front, armed, faceVid]);

  // el video que sale ya no tiene src (React lo quitó): load() vacía el elemento y libera lo que había bajado
  useEffect(() => {
    videoRefs.current.forEach((v, k) => {
      if (!v || armed[k] || v.networkState === v.NETWORK_EMPTY) return;
      v.pause();
      v.removeAttribute('src');
      v.load();
    });
  }, [armed]);

  // pósters entrantes: con la sección a la vista, los de los videos que todavía no están en ninguna cara (misma
  // fuente que <Poster>: al reasignar, la cara oculta ya lo tiene en caché)
  const preloaded = useRef(false);
  useEffect(() => {
    if (!live || preloaded.current) return;
    preloaded.current = true;
    VIDEOS.forEach((v, j) => {
      if (faceVidRef.current.includes(j)) return;
      const p = posterProps(v.poster, v.width, v.height, v.width > v.height);
      const img = new Image();
      if (p.sizes) img.sizes = p.sizes;
      if (p.srcSet) img.srcset = p.srcSet;
      img.src = p.src;
    });
  }, [live]);

  useEffect(() => {
    videoRefs.current.forEach((v, k) => {
      if (!v) return;
      if (k !== ff || !live || paused) {
        if (!v.paused) v.pause();
        if (k !== ff) v.muted = true;
        return;
      }
      if (!armed[k]) return;
      v.muted = !sound;
      if (v.paused) {
        v.play().catch(() => {
          // el navegador no deja sonar sin gesto: sigue muda y el botón vuelve a «apagado»
          if (!v.muted) { v.muted = true; setSound(false); v.play().catch(() => {}); }
        });
      }
    });
  }, [ff, live, paused, sound, armed]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    go(e.key === 'ArrowRight' ? 1 : -1);
  };

  const item = VIDEOS[front];
  const title = t(`items.${item.id}.title`);

  return (
    <section ref={secRef} className="fvm" aria-labelledby="fvm-h">
      <header className="fvm-head">
        <p data-pm="rise" className="fvm-label" aria-hidden="true"><span className="fvm-dot" />{t('label')}</p>
        <h2 id="fvm-h" data-pm="lines" data-pm-d="0.1" className="fvm-title" aria-label={t('headline')}>
          <span data-pm-lines className="fvm-line">{t('headline')}</span>
        </h2>
      </header>

      <div
        className="fvm-stage"
        role="region"
        aria-roledescription={t('gallery_role')}
        aria-label={t('headline')}
        tabIndex={0}
        onKeyDown={onKey}
      >
        <div ref={sceneRef} className="fvm-scene">
          <div ref={drumRef} className="fvm-drum">
            {FACES.map((k) => {
              const v = VIDEOS[faceVid[k]];
              const land = v.width > v.height;
              return (
                <div
                  key={k}
                  ref={(n) => { faceRefs.current[k] = n; }}
                  className="fvm-face"
                  data-land={land ? '' : undefined}
                  style={{ '--a': `${k * STEP}deg` } as React.CSSProperties}
                  aria-hidden="true"
                >
                  <Poster key={v.id} src={v.poster} w={v.width} h={v.height} land={land} />
                  <video
                    ref={(n) => { videoRefs.current[k] = n; }}
                    className="fvm-video"
                    src={armed[k] ? v.src : undefined}
                    preload="none"
                    muted
                    playsInline
                    loop
                    disablePictureInPicture
                    data-on={shown[k] ? '' : undefined}
                    onPlaying={() => { if (!shown[k]) setShown((s) => s.map((x, i) => x || i === k)); }}
                    tabIndex={-1}
                  />
                  <i className="fvm-shade" ref={(n) => { shadeRefs.current[k] = n; }} />
                  <i className="fvm-rim" />
                  {k === ff && (
                    <span className="fvm-play" data-on={paused ? '' : undefined}>
                      <span>
                        <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><path d="M0 0 L14 8 L0 16 Z" /></svg>
                      </span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div ref={floorRef} className="fvm-floor" aria-hidden="true">
            <span className="fvm-floor-l fvm-floor-ll" />
            <svg viewBox="0 0 120 36" width="120" height="36" focusable="false">
              <path className="fvm-blip" d={BEAT} />
              <path className="fvm-pulse" d={BEAT} pathLength={1} />
            </svg>
            <span className="fvm-floor-l fvm-floor-lr" />
          </div>
        </div>

        {/* el nombre de cada video para lectores de pantalla; el cambio se anuncia */}
        <ol className="sr-only">
          {VIDEOS.map((v, k) => (
            <li key={v.id} aria-current={k === front ? 'true' : undefined}>
              {t('slide_aria', { n: k + 1, total: NV, title: t(`items.${v.id}.title`) })}
            </li>
          ))}
        </ol>
        <p className="sr-only" aria-live="polite">{t('slide_aria', { n: front + 1, total: NV, title })}</p>

        <p className="fvm-meta" aria-hidden="true">
          <span className="fvm-pos"><b>{pad2(front + 1)}</b> / {pad2(NV)}</span>
          <span className="fvm-name" key={item.id}>{title}</span>
        </p>

        <div ref={ctrlRef} className="fvm-ctrl">
          <button type="button" className="fvm-btn" onClick={() => go(-1)} aria-label={t('prev')}>
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" className="fvm-btn" onClick={() => go(1)} aria-label={t('next')}>
            <span aria-hidden="true">→</span>
          </button>
          <span className="fvm-sp" />
          <button
            type="button"
            className="fvm-btn fvm-pause"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? t('resume') : t('pause')}
          >
            <span aria-hidden="true">
              {paused
                ? <svg width="11" height="12" viewBox="0 0 14 16" fill="currentColor"><path d="M0 0 L14 8 L0 16 Z" /></svg>
                : <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><path d="M0 0h3.5v12H0zM6.5 0H10v12H6.5z" /></svg>}
            </span>
          </button>
          <button type="button" className="fvm-snd" onClick={() => setSound((s) => !s)} aria-pressed={sound}>
            <span className="fvm-bars" aria-hidden="true"><i /><i /><i /></span>
            {t('sound_short')}
          </button>
        </div>
      </div>

      {/* debajo de los controles, del video de frente: cómo se hizo, o el crédito CC BY (la incubadora) */}
      <p className="fvm-credit" key={item.id}>
        {item.creditHref ? t.rich(`items.${item.id}.credit`, {
          license: (chunks) => <a href={item.creditHref} target="_blank" rel="noopener noreferrer license">{chunks}</a>,
        }) : t(`items.${item.id}.made_with`)}
      </p>

      <div className="fvm-colophon">
        <p data-pm="rise" className="fvm-note">{t('note')}</p>
        <div data-pm="group">
          <p data-pm-i className="fvm-stack-l">{t('stack_label')}</p>
          <div data-pm-i className="fvm-stack">
            {(t.raw('stack') as string[]).map((tool) => <StackBadge key={tool} label={tool} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
