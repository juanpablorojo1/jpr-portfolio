'use client';

/* Projects «Señal» · el negatoscopio (escritorio ≥1024 con la escena viva). Port de la maqueta A.
   La escena (corridor.js, dentro de la escena persistente) dibuja el pasillo y las placas; acá vive la capa HTML:
   - Rótulos en el espacio: lo esencial de cada proyecto (eyebrow, título, bajada, cifras y la entrada al caso),
     anclado a un punto 3D bajo su negatoscopio. La escena les escribe el transform en el mismo frame del render
     (S.neg.tags); este componente decide cuándo entran y salen (con la cámara: S.state.gal, con su damp).
     Entrada: el gesto del sitio (titular desde z −1100, expo.out 1,2 s; el resto 14 px, 1,0 s); salida 0,5 s.
     Los rótulos apagados siguen en el árbol de accesibilidad (opacidad 0): con Tab, el foco en la entrada de un
     caso lleva el scroll a su estadía y la cámara lo encara.
   - El caso completo (problema → mi rol → decisiones clave → resultado): diálogo modal que se abre con la entrada
     del rótulo o con clic en la placa (S.neg.hover), y se cierra con [ESC], el botón o un clic en la escena.
     La cámara empuja hacia la placa (S.neg.open) y la deja del lado opuesto al texto.
   Sin escena todavía (o sin GPU con data-gallery): los rótulos quedan en su posición de respaldo (CSS).
   El guion (estadías, alto de la sección) es gallery.ts, el mismo que usa la cámara. */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { onSignal, type Senal } from '../hero/senal/signal';
import { GAL_DWELLS, GAL_SECTION_VH, GAL_PROJECTS, tagWanted } from '../hero/senal/gallery';
import { TRAUMAVISION_STACK, ELEVEN_STACK, KIBBO_STACK, LEEX_STACK } from '../../lib/content';
import type { CaseStudyData } from './CaseStudy';
import ProjectDemo from '../ui/ProjectDemo';
import { idleTask, lazySet, setBatch } from '../../lib/idle';
import './projects-senal.css';

gsap.registerPlugin(SplitText);

type Props = {
  traumavision: CaseStudyData;
  eleven: CaseStudyData;
  kibbo: CaseStudyData;
  leex: CaseStudyData;
  kibboShotCount: number;
  openTraumavision: (i: number) => void;
  openEleven: (i: number) => void;
  openKibbo: (i: number) => void;
  openLeex: (i: number) => void;
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const LAST_OUT = GAL_DWELLS[GAL_DWELLS.length - 1][1];

type Stat = { label: string; value: string };
type Item = {
  title: string; eyebrow: string; caseEyebrow?: string; sub?: string; badge?: string; soon?: boolean;
  stats: Stat[]; note?: string; steps: string[]; body: ReactNode; demo?: CaseStudyData['demo'];
  /** los «stats» son datos en palabras, no cifras (Eleven): van como ficha rótulo / valor (D-08) */
  facts?: boolean;
};

export default function ProjectsGallery({ traumavision, eleven, kibbo, leex, kibboShotCount, openTraumavision, openEleven, openKibbo, openLeex }: Props) {
  const t = useTranslations('projects');
  const ref = useRef<HTMLElement>(null);
  const total = pad2(GAL_DWELLS.length);
  // video demo de las placas (plate-video.js): pausa del usuario, WCAG 2.2.2 (como la vista previa de Frame by Frame)
  const [platesPaused, setPlatesPaused] = useState(false);
  const pausedRef = useRef(false);
  const sRef = useRef<Senal | null>(null);
  useEffect(() => { pausedRef.current = platesPaused; if (sRef.current) sRef.current.neg.paused = platesPaused; }, [platesPaused]);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const zone = section.closest<HTMLElement>('.transition-zone');
      const stage = section.querySelector<HTMLElement>('.pj-stage');
      const label = section.querySelector<HTMLElement>('.pj-label');
      const count = section.querySelector<HTMLElement>('.pj-count');
      const countN = section.querySelector<HTMLElement>('.pj-count b');
      const vpause = section.querySelector<HTMLElement>('.pj-vpause');
      const tags = Array.from(section.querySelectorAll<HTMLElement>('.pj-tag'));
      const panels = Array.from(section.querySelectorAll<HTMLElement>('.pj-panel'));
      if (!zone || !stage || !label || !count || !countN || tags.length !== GAL_DWELLS.length) return;
      const html = document.documentElement;
      let S: Senal | null = null;
      const offSignal = onSignal((s) => { S = s; sRef.current = s; s.neg.tags = tags; s.neg.paused = pausedRef.current; });
      let alive = true;

      type T = { el: HTMLElement; title: HTMLElement; rest: HTMLElement[]; split: SplitText | null; on: boolean; tl: gsap.core.Timeline | null };
      const ts: T[] = tags.map((el) => ({
        el,
        title: el.querySelector<HTMLElement>('.pj-title')!,
        rest: Array.from(el.querySelectorAll<HTMLElement>('.pj-eyebrow, .pj-badge, .pj-sub, .pj-stats > div, .pj-mnote, .pj-open')),
        split: null, on: false, tl: null,
      }));
      let chromeOn = false;
      let cancelPrep = () => {};
      const hideJobs: Array<[HTMLElement | HTMLElement[] | null, gsap.TweenVars]> = [
        [[label, count], { opacity: 0, y: 14 }],
        [vpause, { autoAlpha: 0, y: 14 }],
        ...ts.flatMap((c): Array<[HTMLElement | HTMLElement[], gsap.TweenVars]> => [[c.rest, { opacity: 0, y: 14 }], [c.title, { opacity: 0 }]]),
      ];

      // L: el aterrizaje del About (su borde superior en el del viewport); el mismo que usa la cámara (trig.end)
      let land = 1;
      const measure = () => {
        const about = zone.previousElementSibling as HTMLElement | null;
        let y = zone.parentElement?.offsetTop ?? 0;
        for (let el = about?.previousElementSibling; el; el = el.previousElementSibling) y += (el as HTMLElement).offsetHeight;
        land = Math.max(1, y);
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
        if (c.split) c.tl.to(c.split.chars, { z: 0, y: 0, rotationX: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: 0.014 }, 0.12);
        c.tl.to(c.rest, { opacity: 1, y: 0, duration: 1.0, ease: 'expo.out', stagger: 0.07 }, 0);
      };
      const hide = (c: T) => {
        c.on = false;
        c.tl?.kill();
        c.tl = gsap.timeline({ onComplete: () => { c.el.removeAttribute('data-on'); } });
        if (c.split) c.tl.to(c.split.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0, duration: 0.5, ease: 'expo.out', stagger: 0.004 }, 0);
        c.tl.to(c.rest, { opacity: 0, y: 14, duration: 0.35, ease: 'expo.out' }, 0);
      };

      /* ---------- caso abierto ---------- */
      let openK = -1;
      let lastFocus: HTMLElement | null = null;
      let restoring = false;
      // dentro del panel se scrollea el panel; fuera, nada
      const blockScroll = (e: Event) => { if (openK >= 0 && !(e.target as HTMLElement).closest?.('.pj-panel')) e.preventDefault(); };
      const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);
      const otherModal = () => Array.from(document.querySelectorAll('[aria-modal="true"]')).some((d) => !d.classList.contains('pj-panel'));
      const openCase = (k: number) => {
        if (openK === k) return;
        if (openK >= 0) closeCase(true);
        openK = k;
        lastFocus = document.activeElement as HTMLElement | null;
        if (S) S.neg.open = k;
        // scroll de la página quieto mientras el caso está abierto. No con overflow:hidden en <html>: con el
        // overflow-x del body, el body pasa a ser contenedor de scroll y el escenario sticky se despega.
        addEventListener('wheel', blockScroll, { passive: false });
        addEventListener('touchmove', blockScroll, { passive: false });
        html.classList.add('pj-case-open');
        const p = panels[k];
        p.setAttribute('data-open', '');
        p.scrollTop = 0;
        const parts = p.querySelectorAll('.pj-c-head > *, .pj-c-demo, .pj-c-grid > *');
        gsap.fromTo(p, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'expo.out', overwrite: true });
        gsap.fromTo(parts, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.0, ease: 'expo.out', stagger: 0.06, delay: 0.25, overwrite: true });
        p.querySelector<HTMLElement>('.pj-close')?.focus({ preventScroll: true });
        if (ts[k].on) hide(ts[k]);
      };
      const closeCase = (silent = false) => {
        const k = openK;
        if (k < 0) return;
        openK = -1;
        if (S) S.neg.open = -1;
        removeEventListener('wheel', blockScroll);
        removeEventListener('touchmove', blockScroll);
        html.classList.remove('pj-case-open');
        const p = panels[k];
        gsap.to(p, { opacity: 0, duration: 0.35, ease: 'expo.out', overwrite: true, onComplete: () => { if (openK !== k) p.removeAttribute('data-open'); } });
        if (!silent) {
          // vuelve a donde estaba el foco; si se abrió con clic en la placa, a la entrada del caso en su rótulo
          const back = lastFocus && lastFocus !== document.body && document.contains(lastFocus) ? lastFocus : tags[k].querySelector<HTMLElement>('.pj-open');
          restoring = true; back?.focus({ preventScroll: true }); restoring = false;
        } else if (p.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
      };
      const onOpenClick = (e: Event) => {
        const b = (e.target as HTMLElement).closest<HTMLElement>('[data-open-case]');
        if (b) openCase(Number(b.dataset.openCase));
      };
      section.addEventListener('click', onOpenClick);
      const onClose = (e: Event) => { if ((e.target as HTMLElement).closest('.pj-close')) closeCase(); };
      section.addEventListener('click', onClose);
      // clic en la escena: sobre la placa encendida abre su caso; con un caso abierto, fuera del panel lo cierra
      const onDocClick = (e: MouseEvent) => {
        if (e.button !== 0) return;
        const tg = e.target as HTMLElement;
        if (tg.closest('a, button, input, [role="dialog"], .jnav')) return;
        if (openK >= 0) { closeCase(); return; }
        if (S && S.neg.hover >= 0 && ts[S.neg.hover].on) openCase(S.neg.hover);
      };
      document.addEventListener('click', onDocClick);
      const onKey = (e: KeyboardEvent) => {
        if (openK < 0) return;
        if (e.key === 'Escape') { if (otherModal()) return; e.preventDefault(); closeCase(); return; }
        if (SCROLL_KEYS.has(e.key) && !(e.target as HTMLElement).closest?.('.pj-panel') && !otherModal()) { e.preventDefault(); return; }
        if (e.key === 'Tab') {   // el foco no sale del caso abierto (con un visor de screens abierto, manda su trap: F-02)
          if (otherModal()) return;
          const f = Array.from(panels[openK].querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter((x) => x.offsetParent !== null);
          if (!f.length) return;
          const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      };
      addEventListener('keydown', onKey);
      // teclado: el foco en la entrada de un caso apagado lleva el scroll a su estadía (la cámara lo encara)
      const onFocusIn = (e: FocusEvent) => {
        const tag = (e.target as HTMLElement).closest<HTMLElement>('.pj-tag');
        if (!tag || openK >= 0 || restoring) return;
        const k = tags.indexOf(tag);
        if (k < 0 || ts[k].on) return;
        const [d0, d1] = GAL_DWELLS[k];
        window.scrollTo({ top: land + ((d0 + d1) / 2) * innerHeight, behavior: 'instant' as ScrollBehavior });
      };
      section.addEventListener('focusin', onFocusIn);

      const tick = () => {
        if (!zone.hasAttribute('data-gallery')) return;
        const raw = (scrollY - land) / innerHeight;
        const live = !!(zone.hasAttribute('data-see-through') && S && !S.dead && S.neg.live);
        const u = live && S ? S.state.gal : raw;            // con escena: el texto llega con la cámara
        stage.classList.toggle('is-anchored', live);
        const wantChrome = u >= 1.25 && u <= LAST_OUT + 0.2;
        if (wantChrome !== chromeOn) {
          chromeOn = wantChrome;
          gsap.to([label, count], { opacity: wantChrome ? 1 : 0, y: wantChrome ? 0 : 14, duration: wantChrome ? 0.8 : 0.35, ease: 'expo.out', overwrite: true });
          if (vpause) gsap.to(vpause, { autoAlpha: wantChrome ? 1 : 0, y: wantChrome ? 0 : 14, duration: wantChrome ? 0.8 : 0.35, ease: 'expo.out', overwrite: true });
        }
        const cur = GAL_DWELLS.reduce((a, d, i) => (u >= d[0] - 0.5 ? i : a), 0);
        const n = pad2(cur + 1);
        if (countN.textContent !== n) countN.textContent = n;
        ts.forEach((c, k) => {
          const want = openK < 0 && tagWanted(k, u);
          if (want && !c.on) show(c); else if (!want && c.on) hide(c);
        });
      };

      // titulares partidos fuera de la hidratación, en su propia tarea ociosa (D-01): partir, medir, preparar
      document.fonts.ready.then(() => {
        if (!alive) return;
        cancelPrep = idleTask(() => {
          if (!alive) return;
          hidden.ensure();
          ts.forEach((c) => { c.split = SplitText.create(c.title, { type: 'words,chars', wordsClass: 'word', charsClass: 'char', aria: 'none' }); });
          measure();
          setBatch([
            ...ts.map((c): [Element[], gsap.TweenVars] => [c.split!.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0 }]),
            ...ts.map((c): [HTMLElement, gsap.TweenVars] => [c.title, { opacity: 1 }]),
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
        removeEventListener('keydown', onKey);
        document.removeEventListener('click', onDocClick);
        section.removeEventListener('click', onOpenClick);
        section.removeEventListener('click', onClose);
        section.removeEventListener('focusin', onFocusIn);
        if (openK >= 0) closeCase(true);
        if (S) { S.neg.tags = []; S.neg.open = -1; S.neg.paused = false; }
        sRef.current = null;
        offSignal();
        stage.classList.remove('is-anchored');
        html.classList.remove('pj-hot');
        ts.forEach((c) => {
          c.tl?.kill();
          c.el.removeAttribute('data-on');
          c.el.style.transform = '';
          if (c.split) { gsap.killTweensOf(c.split.chars); c.split.revert(); }
          gsap.set([...c.rest, c.title], { clearProps: 'opacity,transform' });
        });
        panels.forEach((p) => { gsap.killTweensOf(p); p.removeAttribute('data-open'); gsap.set(p, { clearProps: 'opacity' }); });
        gsap.set([label, count], { clearProps: 'opacity,transform' });
        if (vpause) gsap.set(vpause, { clearProps: 'opacity,visibility,transform' });
      };
    });
    return () => mm.revert();
  }, []);

  const L = { problem: t('case.problem'), role: t('case.role'), decisions: t('case.decisions'), result: t('case.result'), stack: t('case.stack') };

  const screens = (n: number, open: (i: number) => void) => (
    <button type="button" className="pj-btn" onClick={() => open(0)}>{t('case.screens')} <span>{pad2(n)}</span></button>
  );
  const statsDl = (stats: Stat[], cls = 'pj-c-stats') => (
    <dl className={cls}>{stats.map((s) => (<div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>))}</dl>
  );
  // problema → mi rol → decisiones clave → resultado (los cuatro casos tienen el formato completo en el copy)
  const caseBody = (d: CaseStudyData, stack: readonly string[], actions: ReactNode, note?: string, pre?: ReactNode, facts = false) => (
    <>
      <div className="pj-c-block"><p className="pj-k"><b>01</b> / {L.problem}</p><p>{d.problem}</p></div>
      <div className="pj-c-block"><p className="pj-k"><b>02</b> / {L.role}</p><p>{d.role}</p></div>
      <div className="pj-c-block pj-c-wide">
        <p className="pj-k"><b>03</b> / {L.decisions}</p>
        <ol className="pj-dec">
          {d.decisions.map((x, i) => (
            <li key={x.title}><span aria-hidden="true">{pad2(i + 1)}</span><p><strong>{x.title}</strong> {x.body}</p></li>
          ))}
        </ol>
      </div>
      <div className="pj-c-block"><p className="pj-k"><b>04</b> / {L.result}</p><p>{d.result}</p>{statsDl(d.stats, facts ? 'pj-c-stats pj-facts' : 'pj-c-stats')}</div>
      <div className="pj-c-block">
        {pre}
        <p className="pj-k">{L.stack}</p><p className="pj-mono">{stack.join(' · ')}</p>
        <div className="pj-acts">{actions}</div>
        {note && <p className="pj-note">{note}</p>}
      </div>
    </>
  );

  // el pipeline de TraumaVision, con las flechas en rojo (la clave trae «→» como separador). Cada etapa lleva su
  // flecha al final y no se parte: si la línea corta, corta después de una flecha (nunca empieza con «→»)
  const tvSteps = t('traumavision.pipeline').split(' → ');
  const tvPipeline = tvSteps.map((x, i) => (
    <span key={x}><span className="pj-nb">{x}{i < tvSteps.length - 1 && <i> →</i>}</span>{i < tvSteps.length - 1 && ' '}</span>
  ));
  const steps4 = [L.problem, L.role, L.decisions, L.result];

  // mismo orden que GAL_PROJECTS (gallery.ts): TraumaVision, KIBBO, LEEX, Eleven
  const items: Item[] = [
    {
      title: traumavision.title, eyebrow: t('traumavision.label'), caseEyebrow: traumavision.eyebrow, sub: traumavision.subtitle,
      stats: traumavision.stats, note: t('traumavision.metrics_note'), steps: steps4, demo: traumavision.demo,
      body: caseBody(traumavision, TRAUMAVISION_STACK, screens(traumavision.shots.length, openTraumavision), undefined, (
        <><p className="pj-k">{t('traumavision.pipeline_label')}</p><p className="pj-mono">{tvPipeline}</p></>
      )),
    },
    {
      title: kibbo.title, eyebrow: kibbo.eyebrow, sub: kibbo.subtitle, stats: kibbo.stats,
      steps: steps4, demo: kibbo.demo,
      body: caseBody(kibbo, KIBBO_STACK, (
        <>
          {screens(kibboShotCount, openKibbo)}
          {kibbo.cta && <a className="pj-btn pj-cta" href={kibbo.cta.href} target="_blank" rel="noopener noreferrer">{kibbo.cta.label}</a>}
        </>
      )),
    },
    {
      title: leex.title, eyebrow: leex.eyebrow, sub: leex.subtitle, badge: leex.badge, soon: true, stats: leex.stats,
      steps: steps4, demo: leex.demo,
      body: caseBody(leex, LEEX_STACK, screens(leex.shots.length, openLeex), leex.shotsNote),
    },
    {
      title: eleven.title, eyebrow: t('eleven.subtitle'), caseEyebrow: eleven.eyebrow, sub: t('eleven.description'), stats: eleven.stats,
      steps: steps4, facts: true, demo: eleven.demo,
      body: caseBody(eleven, ELEVEN_STACK, (
        <>
          {screens(eleven.shots.length, openEleven)}
          {eleven.cta && <a className="pj-btn pj-cta" href={eleven.cta.href} target="_blank" rel="noopener noreferrer">{eleven.cta.label}</a>}
        </>
      ), undefined, undefined, true),
    },
  ];

  return (
    <section ref={ref} className="pj-gal" aria-label={t('label')} style={{ height: `${GAL_SECTION_VH * 100}vh` }}>
      <div className="pj-stage">
        <p className="pj-label"><span className="pj-dot" aria-hidden="true" />{t('label')}</p>
        <p className="pj-count" aria-hidden="true"><b>01</b> / {total}</p>
        {/* pausa del video demo de las placas (la escena lo respeta: S.neg.paused) */}
        <button type="button" className="pj-vpause" onClick={() => setPlatesPaused((p) => !p)}>
          {platesPaused
            ? <svg width="9" height="10" viewBox="0 0 14 16" fill="currentColor" aria-hidden="true"><path d="M0 0 L14 8 L0 16 Z" /></svg>
            : <svg width="9" height="10" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true"><path d="M0 0h3.5v12H0zM6.5 0H10v12H6.5z" /></svg>}
          {platesPaused ? t('case.demo_play') : t('case.demo_pause')}
        </button>

        {/* Lo esencial de cada proyecto, en el espacio (la escena lo ancla bajo su negatoscopio) */}
        {items.map((it, k) => (
          <article key={GAL_PROJECTS[k].id} className={`pj-tag${it.soon ? ' pj-soon' : ''}`} data-side={GAL_PROJECTS[k].side > 0 ? 'r' : 'l'} aria-label={t('case.plate_aria', { n: k + 1, total: GAL_DWELLS.length, title: it.title })}>
            <p className="pj-eyebrow"><b>{pad2(k + 1)}</b> / {total} · {it.eyebrow}</p>
            {it.badge && <p className="pj-badge"><span className="pj-dot" aria-hidden="true" />{it.badge}</p>}
            <h2 id={`pj-t-${k}`} className="pj-title font-display" aria-label={it.title}>{it.title}</h2>
            {it.sub && <p className="pj-sub">{it.sub}</p>}
            {statsDl(it.stats, it.facts ? 'pj-stats pj-facts' : 'pj-stats')}
            {it.note && <p className="pj-mnote">{it.note}</p>}
            <button type="button" className="pj-open" data-open-case={k} aria-haspopup="dialog" aria-controls={`pj-case-${k}`}>
              <span className="sr-only">{t('case.open_aria', { title: it.title })}: </span>
              {/* la flecha cierra el paso anterior y el + va pegado al último: si el botón parte en dos líneas,
                  ninguna empieza con «→» ni con «+» (U3: a 1200 en ES parte después de «Decisiones clave →») */}
              {it.steps.map((s, i) => (
                <span key={s} className="pj-step">
                  <span>{s}</span>
                  {i < it.steps.length - 1 ? <i aria-hidden="true">→</i> : <em aria-hidden="true">+</em>}
                </span>
              ))}
            </button>
          </article>
        ))}

        {/* El caso completo: se abre al entrar (clic en la placa o en la entrada del rótulo). */}
        {items.map((it, k) => (
          <section key={GAL_PROJECTS[k].id} id={`pj-case-${k}`} className={`pj-panel${it.soon ? ' pj-soon' : ''}`} data-side={GAL_PROJECTS[k].side < 0 ? 'r' : 'l'}
            role="dialog" aria-modal="true" aria-labelledby={`pj-c-${k}`}>
            <button type="button" className="pj-close" aria-label={t('case.close_case')}>{t('case.lightbox.close')}</button>
            <header className="pj-c-head">
              <p className="pj-eyebrow"><b>{pad2(k + 1)}</b> / {total} · {it.caseEyebrow ?? it.eyebrow}</p>
              {it.badge && <p className="pj-badge"><span className="pj-dot" aria-hidden="true" />{it.badge}</p>}
              <h3 id={`pj-c-${k}`} className="pj-c-title font-display">{it.title}</h3>
              {it.sub && <p className="pj-sub">{it.sub}</p>}
            </header>
            {it.demo && <ProjectDemo className="pj-c-demo" demo={it.demo.src} title={it.title} alt={it.demo.alt} />}
            <div className="pj-c-grid">{it.body}</div>
          </section>
        ))}
      </div>
    </section>
  );
}
