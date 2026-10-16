'use client';

/* Frame by Frame «Señal» · el Tambor 360 (escritorio ≥1024). U3 2026-10-12: port de la maqueta A de videos, elegida por
   Juan («A»). Reemplaza a la sala de proyección (U4). Pedido: «una galeria 360 con videos, sin explicarlos, solo
   mostrar los videos con una galeria que se va pasando si yo elijo». La escena (projector.js, dentro de corridor.js)
   dibuja el tambor, la señal, el haz y los videos. Acá vive la capa HTML, sin textos sobre los videos:
   - Giro del tambor (S.fbf.rot): flechas, ← → durante la estadía y arrastre horizontal (Pointer Events). El scroll no
     lo gira y nada avanza solo. Giro = tween expo.inOut 1,3 s del valor continuo (se interrumpe y encadena); arrastrando,
     el tambor sigue al puntero y al soltar se asienta en la cara vecina en la dirección del gesto. Da la vuelta.
   - Contador «01 / 05» entre las flechas; pausa (WCAG 2.2.2; también con clic sobre la cara de frente) y sonido
     (apagado por defecto: suena sólo la cara de frente).
   - Accesibilidad: región con nombre, foco visible, cada video conserva su nombre (lista oculta con el de frente
     marcado) y el cambio se anuncia en una región viva. Los textos de cada video siguen en las tarjetas (.fv-stack).
     El crédito CC BY del video de la incubadora aparece mientras está al frente.
   Sin escena viva (cargando): el póster de la cara de frente en HTML con los mismos controles, cambio por fundido.
   El guion (estadía, alto de la sección) es frames.ts, el mismo que usa la cámara.
   Base de la lógica de giro/arrastre: la galería 360 de u2-galeria360 (c736b87), adaptada; sin su diálogo. */

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onSignal, type Senal } from '../hero/senal/signal';
import { FBF_SECTION_VH, FBF_STAY, FBF_OFF, fbfCtrlWanted, fbfCanTurn, fbfChromeWanted } from '../hero/senal/frames';
import { GAL_DWELLS } from '../hero/senal/gallery';
import { VIDEOS } from '../../lib/content';
import { idleTask, lazySet } from '../../lib/idle';
import './videos-senal.css';

const pad2 = (n: number) => String(n).padStart(2, '0');
const N = VIDEOS.length;
const mod = (a: number) => ((a % N) + N) % N;
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Video hereda el negro de Projects sin el grano DOM ni el nav sólido (html.fv-vit, como html.pj-vit): se enciende
    mientras la línea roja todavía viaja (salida de Projects, antes de que pj-vit se apague en LAST_OUT + 0,9) y se
    apaga con el tambor, camino a Stack. Así el cambio nunca cae en un corte (design-critic, ronda 4). */
const LAST_OUT = GAL_DWELLS[GAL_DWELLS.length - 1][1];
const fvVitWanted = (u: number) => u > LAST_OUT + 0.45 && u < FBF_OFF + 0.45;

export default function VideosStage() {
  const t = useTranslations('videos');
  const ref = useRef<HTMLElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const sRef = useRef<Senal | null>(null);
  const liveRef = useRef(false);
  // giro del tambor en caras: v (lo que se ve, con el tween) y target (entero: la cara elegida)
  const rot = useRef({ v: 0, target: 0 });
  const twRef = useRef<gsap.core.Tween | null>(null);
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(false);
  // con la escena viva: el 16:9 está abierto de verdad (S.fbf.wide); null = sin escena, manda el video de frente
  const [wideOpen, setWideOpen] = useState<boolean | null>(null);
  const total = pad2(N);

  useEffect(() => { if (sRef.current) sRef.current.fbf.paused = paused; }, [paused]);
  useEffect(() => { if (sRef.current) sRef.current.fbf.sound = sound; }, [sound]);

  /* ---------- giro ---------- */
  const writeRot = () => { if (sRef.current) sRef.current.fbf.rot = rot.current.v; };
  /** con la escena viva, sólo con el tambor encendido y la cámara frente a él */
  const canTurn = () => {
    const S = sRef.current;
    return !liveRef.current || !S ? true : fbfCanTurn(S.state.gal);
  };
  const turnTo = (target: number, dur = 1.3, ease = 'expo.inOut') => {
    rot.current.target = target;
    setFront(mod(target));
    twRef.current?.kill();
    if (!liveRef.current || reduced()) { rot.current.v = target; writeRot(); return; }
    twRef.current = gsap.to(rot.current, { v: target, duration: dur, ease, onUpdate: writeRot });
  };
  const go = (d: number) => { if (canTurn()) turnTo(rot.current.target + d); };
  const goRef = useRef(go);
  goRef.current = go;

  /* ---------- arrastre horizontal (Pointer Events): el tambor sigue al puntero y se asienta al soltar ---------- */
  useEffect(() => {
    const el = dragRef.current;
    if (!el) return;
    let id = -1, x0 = 0, r0 = 0, moved = false, lastX = 0, lastT = 0, vel = 0;
    const per = () => Math.max(380, innerWidth * 0.3);        // px de arrastre por cara
    const setDrag = (v: boolean) => { if (sRef.current) sRef.current.fbf.drag = v; };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || !e.isPrimary || !canTurn()) return;
      id = e.pointerId; x0 = lastX = e.clientX; lastT = performance.now(); vel = 0; moved = false;
      r0 = rot.current.v;
      try { el.setPointerCapture(id); } catch { /* puntero sintético o ya liberado */ }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - x0;
      if (!moved && Math.abs(dx) > 6) { moved = true; twRef.current?.kill(); el.classList.add('is-drag'); setDrag(true); }
      if (!moved) return;
      const now = performance.now(), dt = Math.max(8, now - lastT);
      vel = vel * 0.6 + ((e.clientX - lastX) / dt) * 0.4;           // px/ms, suavizado
      lastX = e.clientX; lastT = now;
      if (liveRef.current && !reduced()) { rot.current.v = r0 - dx / per(); writeRot(); }
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      el.classList.remove('is-drag');
      setDrag(false);
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (!moved) {
        // un toque sin arrastre sobre la cara de frente: pausa o reanuda
        const S = sRef.current;
        if (!liveRef.current || (S && S.fbf.hover >= 0)) setPaused((p) => !p);
        return;
      }
      const dx = e.clientX - x0;
      const base = Math.round(r0);
      if (!liveRef.current || reduced()) {                           // por corte: un paso si el gesto alcanzó
        if (Math.abs(dx) > 40) turnTo(base + (dx < 0 ? 1 : -1));
        return;
      }
      // proyección con la inercia del gesto, entre las dos caras vecinas de donde quedó el tambor (un tirón rápido no
      // salta dos); al menos un paso si se arrastró más de un 15 % de cara
      const v = rot.current.v;
      const proj = v - (vel * 120) / per();
      let tgt = Math.max(Math.floor(v), Math.min(Math.ceil(v), Math.round(proj)));
      const drag = -dx / per();
      if (tgt === base && Math.abs(drag) > 0.15) tgt = base + Math.sign(drag);
      turnTo(tgt, Math.min(1.0, 0.5 + 0.5 * Math.abs(tgt - rot.current.v)), 'power3.out');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    // canTurn/turnTo/writeRot sólo usan refs: estables para el efecto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- con la escena viva: visibilidad atada a la cámara; teclado durante la estadía ---------- */
  useEffect(() => {
    const section = ref.current, ring = ringRef.current;
    if (!section || !ring) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const zone = section.closest<HTMLElement>('.fbf-zone');
      const stage = section.querySelector<HTMLElement>('.fv-stage');
      const label = section.querySelector<HTMLElement>('.fv-label');
      if (!zone || !stage || !label) return;
      let S: Senal | null = null;
      const offSignal = onSignal((s) => {
        S = s; sRef.current = s;
        s.fbf.rot = rot.current.v; s.fbf.paused = paused; s.fbf.sound = sound; s.fbf.drag = false;
      });
      let chromeOn = false;
      let land = 1;
      // D-02: borde superior e inferior de la sección (px de página) para saber, sin escena viva, si los controles
      // (siempre encendidos en ese modo) están abajo en cuadro, donde vive el interruptor global de sonido
      let secTop = 0, secBot = 0;
      const measure = () => {
        const hz = document.querySelector<HTMLElement>('.transition-zone[data-section="hero"]');
        land = Math.max(1, (hz?.parentElement?.offsetTop ?? 0) + (hz?.offsetHeight ?? 0));
        const r = section.getBoundingClientRect();
        secTop = r.top + scrollY; secBot = r.bottom + scrollY;
      };
      measure();
      addEventListener('resize', measure);
      // F-01: L (el aterrizaje del About) cambia después del montaje (alto final de la zona del hero): se vuelve a medir en
      // cada refresh de ScrollTrigger (el mismo momento en que scene.js recalcula trig.end)
      ScrollTrigger.addEventListener('refresh', measure);
      const hidden = lazySet(section, [[label, { opacity: 0, y: 14 }]]);

      // ← → con el tambor frente a la cámara (no en campos de texto ni con modificadores)
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented) return;
        const tg = e.target as HTMLElement | null;
        if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
        if (!ring.hasAttribute('data-on')) return;
        e.preventDefault();
        goRef.current(e.key === 'ArrowRight' ? 1 : -1);
      };
      addEventListener('keydown', onKey);
      // teclado: el foco en la galería apagada lleva el scroll a la estadía (la cámara queda frente al tambor)
      // F-01: el foco dispara primero el scroll-into-view nativo (alinea .fv-ring con el borde de la sección, menos el
      // scroll-padding del nav: u ≈ 11,23). El salto propio va en el frame siguiente, después de ese scroll, y sólo si
      // los controles todavía no están encendidos.
      const onFocusIn = () => {
        if (!liveRef.current || !S || fbfCtrlWanted(S.state.gal)) return;
        requestAnimationFrame(() => {
          if (!liveRef.current || !S || fbfCtrlWanted(S.state.gal)) return;
          measure();                                          // siempre fresco antes de saltar
          window.scrollTo({ top: land + ((FBF_STAY[0] + FBF_STAY[1]) / 2) * innerHeight, behavior: 'instant' as ScrollBehavior });
        });
      };
      section.addEventListener('focusin', onFocusIn);

      let wideOpenRef: boolean | null = null;
      const tick = () => {
        if (!zone.hasAttribute('data-gallery')) return;
        const live = !!(zone.hasAttribute('data-see-through') && S && !S.dead && S.fbf.live);
        if (live !== liveRef.current) {
          liveRef.current = live;
          stage.classList.toggle('is-live', live);
          if (!live) { twRef.current?.kill(); rot.current.v = rot.current.target; }
        }
        if (S && S.fbf.rot !== rot.current.v) S.fbf.rot = rot.current.v;
        // Juan (2026-10-15, opción a): el título se ve al llegar y se funde recién cuando el 16:9 se abre
        const wo = live && S ? (S.fbf.wide || 0) > 0.3 : null;
        if (wo !== wideOpenRef) { wideOpenRef = wo; setWideOpen(wo); }
        const u = live && S ? S.state.gal : (scrollY - land) / innerHeight;
        const wantChrome = fbfChromeWanted(u);
        if (wantChrome !== chromeOn) {
          chromeOn = wantChrome;
          gsap.to(label, { opacity: wantChrome ? 1 : 0, y: wantChrome ? 0 : 14, duration: wantChrome ? 0.8 : 0.35, ease: 'expo.out', overwrite: true });
        }
        ring.toggleAttribute('data-on', !live || fbfCtrlWanted(u));
        const vit = live && fvVitWanted(u);
        if (vit !== html.classList.contains('fv-vit')) html.classList.toggle('fv-vit', vit);
        // D-02: con los controles del Tambor en cuadro, el interruptor global de sonido (SoundToggle) se retira: los
        // dos viven abajo a la derecha y el global le robaba el clic a «Sonido del video». Sin escena viva, los
        // controles están encendidos siempre: cuentan mientras el escenario fijo cubre el borde inferior.
        const ctrl = live ? fbfCtrlWanted(u) : scrollY > secTop - innerHeight * 0.15 && scrollY + innerHeight < secBot + innerHeight * 0.15;
        if (ctrl !== html.classList.contains('fv-drum-ui')) html.classList.toggle('fv-drum-ui', ctrl);
      };
      const html = document.documentElement;
      // a la vista o cerca (recarga a mitad de página, salto ?qa&u=, scroll rápido): se prepara YA y no en la cola ociosa
      // (con la escena dibujando, esa cola podía demorar 10–18 s; mismo arreglo que Projects en 14710fd). La salida de
      // Projects ya cuenta como cerca: ahí se enciende fv-vit.
      let prepared = false;
      const prep = () => {
        if (prepared) return;
        prepared = true;
        removeEventListener('scroll', onNear);
        hidden.ensure(); measure(); gsap.ticker.add(tick);
      };
      const near = () => { const r = section.getBoundingClientRect(); return r.top < innerHeight * 2 && r.bottom > -innerHeight; };
      function onNear() { if (near()) { cancelIdle(); prep(); } }
      addEventListener('scroll', onNear, { passive: true });
      let cancelIdle = () => {};
      if (near()) prep(); else cancelIdle = idleTask(prep);
      const cancelPrep = () => { cancelIdle(); removeEventListener('scroll', onNear); };

      return () => {
        cancelPrep();
        hidden.cancel();
        gsap.ticker.remove(tick);
        removeEventListener('resize', measure);
        ScrollTrigger.removeEventListener('refresh', measure);
        removeEventListener('keydown', onKey);
        section.removeEventListener('focusin', onFocusIn);
        twRef.current?.kill();
        if (S) { S.fbf.paused = false; S.fbf.sound = false; S.fbf.drag = false; }
        offSignal();
        sRef.current = null;
        liveRef.current = false;
        setWideOpen(null);
        rot.current.v = rot.current.target;
        stage.classList.remove('is-live');
        ring.setAttribute('data-on', '');
        document.documentElement.classList.remove('fv-hot', 'fv-vit', 'fv-drum-ui');
        gsap.set(label, { clearProps: 'opacity,transform' });
      };
    });
    return () => mm.revert();
    // paused/sound (valor inicial) sólo se leen al montar; el resto son refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fItem = VIDEOS[front];
  const fTitle = t(`items.${fItem.id}.title`);

  return (
    <section ref={ref} className="fv-gal" aria-labelledby="fv-h" style={{ height: `${FBF_SECTION_VH * 100}vh` }}>
      <div className="fv-stage">
        {/* el 16:9 abierto ocupa el margen izquierdo: el título se aparta (videos-senal.css). Con la escena viva, sólo
            mientras está abierto (al llegar con un horizontal de frente el título se ve); sin escena, con el horizontal */}
        <p className="fv-label" aria-hidden="true" data-land={(wideOpen ?? fItem.width > fItem.height) ? '' : undefined}><span className="fv-dot" />{t('label')}</p>
        <h2 id="fv-h" className="sr-only">{t('headline')}</h2>

        <div
          ref={ringRef}
          className="fv-ring"
          data-on=""
          role="region"
          aria-roledescription={t('gallery_role')}
          aria-label={t('headline')}
          tabIndex={0}
        >
          {/* sin escena viva: el póster de la cara de frente, con fundido al cambiar (con la escena, el tambor es 3D) */}
          <div className="fv-front" aria-hidden="true">
            {VIDEOS.map((item, k) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={item.id} src={item.poster} alt="" decoding="async" loading="lazy" width={item.width} height={item.height}
                data-land={item.width > item.height ? '' : undefined} data-on={k === front ? '' : undefined} />
            ))}
          </div>
          <div ref={dragRef} className="fv-drag" aria-hidden="true" />

          {/* el nombre de cada video, para lectores de pantalla */}
          <ol className="sr-only">
            {VIDEOS.map((item, k) => (
              <li key={item.id} aria-current={k === front ? 'true' : undefined}>
                {t('slide_aria', { n: k + 1, total: N, title: t(`items.${item.id}.title`) })}
              </li>
            ))}
          </ol>
          <p className="sr-only" aria-live="polite">{t('slide_aria', { n: front + 1, total: N, title: fTitle })}</p>

          <div className="fv-ctrl">
            <button type="button" className="fv-btn fv-arrow" onClick={() => go(-1)} aria-label={t('prev')}>
              <span aria-hidden="true">←</span>
            </button>
            <p className="fv-pos" aria-hidden="true"><b>{pad2(front + 1)}</b> / {total}</p>
            <button type="button" className="fv-btn fv-arrow" onClick={() => go(1)} aria-label={t('next')}>
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="fv-acts">
            <button type="button" className="fv-tgl fv-pause" onClick={() => setPaused((p) => !p)} data-on={paused ? '' : undefined} aria-label={paused ? t('resume') : t('pause')}>
              {paused
                ? <svg width="9" height="10" viewBox="0 0 14 16" fill="currentColor" aria-hidden="true"><path d="M0 0 L14 8 L0 16 Z" /></svg>
                : <svg width="9" height="10" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true"><path d="M0 0h3.5v12H0zM6.5 0H10v12H6.5z" /></svg>}
            </button>
            <button type="button" className="fv-tgl fv-snd" onClick={() => setSound((s) => !s)} aria-pressed={sound}>
              <span className="fv-bars" aria-hidden="true"><i /><i /><i /></span>
              {t('sound')}
            </button>
          </div>
          {fItem.creditHref && (
            <p className="fv-credit">
              {t.rich(`items.${fItem.id}.credit`, {
                license: (chunks) => <a href={fItem.creditHref} target="_blank" rel="noopener noreferrer license">{chunks}</a>,
              })}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
