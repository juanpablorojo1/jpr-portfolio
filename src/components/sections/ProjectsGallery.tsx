'use client';

/* Projects «Señal» · la vitrina en el vacío (escritorio ≥1024 con la escena viva). Port de la maqueta A (2026-10-12).
   La escena (vitrina.js dentro de corridor.js, en la escena persistente) dibuja las cuatro laptops; acá vive la capa HTML:
   - El bloque de cada proyecto (folio N.º, eyebrow, nombre, línea técnica, cifra y «Ver proyecto»), del lado opuesto a
     la laptop. Es la capa más cercana: la escena le escribe el transform (parallax opuesto a la órbita) en el mismo frame
     del render (S.neg.tags); este componente decide cuándo entra y sale (con la cámara: S.state.gal, con su damp).
     Entrada: el gesto del sitio (titular desde z −1100, expo.out 1,2 s; el resto 14 px, 1,0 s); salida 0,5 s.
     Los bloques apagados siguen en el árbol de accesibilidad (opacidad 0): con Tab, el foco en «Ver proyecto» lleva el
     scroll a su estadía.
   - La ficha técnica (qué es · 01 componentes · 02 stack · 03 logros): diálogo modal que se abre con «Ver proyecto» o
     con clic en la pantalla de la laptop (S.neg.hover), y se cierra con [ESC], el botón o un clic en la escena. Cubre el
     lado del texto; la laptop queda a la vista.
   Sin escena todavía (o sin GPU con data-gallery): los bloques quedan en su posición de respaldo (CSS).
   El guion (estadías, alto de la sección) es gallery.ts, el mismo que usa la cámara. */

import { useEffect, useRef, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { onSignal, type Senal } from '../hero/senal/signal';
import { GAL_DWELLS, GAL_SECTION_VH, GAL_PROJECTS, GAL_TAG_Y, tagWanted } from '../hero/senal/gallery';
import { TRAUMAVISION_STACK, ELEVEN_STACK, KIBBO_STACK, LEEX_STACK, TRAUMAVISION_METRICS } from '../../lib/content';
import { hasLongStat, type CaseStudyData } from './CaseStudy';
import ProjectDemo from '../ui/ProjectDemo';
import { idleTask, lazySet, setBatch } from '../../lib/idle';
import { playSound } from '../../lib/sound';
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
/** la cifra del bloque: número, unidad (el «%» va en rojo) y rótulo; la nota junta las otras cifras del sitio */
type Fig = { num: string; unit?: string; label: string; note?: string };
type Item = {
  title: string; eyebrow: string; caseEyebrow?: string; sub?: string; line: string; badge?: string; soon?: boolean;
  stats: Stat[]; fig: Fig; body: ReactNode; demo?: CaseStudyData['demo'];
};

export default function ProjectsGallery({ traumavision, eleven, kibbo, leex, kibboShotCount, openTraumavision, openEleven, openKibbo, openLeex }: Props) {
  const t = useTranslations('projects');
  const locale = useLocale();
  const ref = useRef<HTMLElement>(null);
  const total = pad2(GAL_DWELLS.length);

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
      const tags = Array.from(section.querySelectorAll<HTMLElement>('.pj-tag'));
      const panels = Array.from(section.querySelectorAll<HTMLElement>('.pj-panel'));
      if (!zone || !stage || !label || !count || !countN || tags.length !== GAL_DWELLS.length) return;
      const html = document.documentElement;
      let S: Senal | null = null;
      const offSignal = onSignal((s) => { S = s; s.neg.tags = tags; });
      let alive = true;

      type T = { el: HTMLElement; title: HTMLElement; rest: HTMLElement[]; split: SplitText | null; on: boolean; tl: gsap.core.Timeline | null };
      const ts: T[] = tags.map((el) => ({
        el,
        title: el.querySelector<HTMLElement>('.pj-title')!,
        rest: Array.from(el.querySelectorAll<HTMLElement>('.pj-folio, .pj-eyebrow, .pj-badge, .pj-line, .pj-fig, .pj-view')),
        split: null, on: false, tl: null,
      }));
      let chromeOn = false;
      let cancelPrep = () => {};
      const hideJobs: Array<[HTMLElement | HTMLElement[] | null, gsap.TweenVars]> = [
        [[label, count], { opacity: 0, y: 14 }],
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
      let hoverQuiet = 0;   // sonido: al abrir o cerrar el caso el panel se mueve bajo el puntero quieto (S-01)
      // dentro del panel se scrollea el panel; fuera, nada
      const blockScroll = (e: Event) => { if (openK >= 0 && !(e.target as HTMLElement).closest?.('.pj-panel')) e.preventDefault(); };
      const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);
      const otherModal = () => Array.from(document.querySelectorAll('[aria-modal="true"]')).some((d) => !d.classList.contains('pj-panel'));
      const openCase = (k: number) => {
        if (openK === k) return;
        playSound('ui-open'); hoverQuiet = performance.now() + 400;
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
          playSound('ui-close'); hoverQuiet = performance.now() + 400;
          // vuelve a donde estaba el foco; si se abrió con clic en la placa, a la entrada del caso en su rótulo
          const back = lastFocus && lastFocus !== document.body && document.contains(lastFocus) ? lastFocus : tags[k].querySelector<HTMLElement>('.pj-view');
          restoring = true; back?.focus({ preventScroll: true }); restoring = false;
        } else if (p.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
      };
      const onOpenClick = (e: Event) => {
        const b = (e.target as HTMLElement).closest<HTMLElement>('[data-open-case]');
        if (b) openCase(Number(b.dataset.openCase));
      };
      section.addEventListener('click', onOpenClick);
      // sonido (lib/sound.ts): el puntero fino que entra en «Ver proyecto» (no el foco de teclado)
      const onViewOver = (e: PointerEvent) => {
        const v = e.pointerType === 'mouse' && performance.now() > hoverQuiet ? (e.target as HTMLElement).closest('.pj-view') : null;
        if (v && !v.contains(e.relatedTarget as Node | null)) playSound('ui-hover');
      };
      section.addEventListener('pointerover', onViewOver);
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
        // la vitrina tiene su propio negro, grano y viñeta en la escena: el grano DOM del hero (fijo, z 30) y la barra
        // sólida del nav lo levantaban a #080808 plano (design-critic D-06)
        const vit = live && u > 0.3 && u < LAST_OUT + 0.9;
        if (vit !== html.classList.contains('pj-vit')) html.classList.toggle('pj-vit', vit);
        const wantChrome = u >= 1.25 && u <= LAST_OUT + 0.2;
        if (wantChrome !== chromeOn) {
          chromeOn = wantChrome;
          gsap.to([label, count], { opacity: wantChrome ? 1 : 0, y: wantChrome ? 0 : 14, duration: wantChrome ? 0.8 : 0.35, ease: 'expo.out', overwrite: true });
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
      // Si la sección ya está a la vista o cerca (recarga a mitad de página, salto ?qa, scroll rápido), se prepara YA y
      // no en la cola ociosa: con la escena dibujando, esa cola (de a una tarea por sección, hasta 1,5 s cada una) podía
      // demorar 10–18 s y los bloques no entraban (LEEX tras el salto ?qa, ronda 3)
      let prepared = false;
      /* D-01: cada bloque tiene que entrar en la franja GAL_TAG_Y (en 1536×730 el de LEEX en ES medía 661 px y el
         «Ver proyecto» quedaba cortado). Si no entra, se compacta en proporción (--fit escala el título, la línea, la
         cifra y los aires; projects-senal.css) lo justo para que entre: búsqueda binaria del --fit más grande que entra
         (los cortes de línea no son lineales). Sin cambio cuando entra. Se mide con el texto que haya, así que aguanta
         un copy más largo. */
      const FIT_MIN = 0.6;
      const fitTags = () => {
        const avail = innerHeight - GAL_TAG_Y.top - GAL_TAG_Y.foot;
        for (const el of tags) {
          el.style.removeProperty('--fit');
          if (el.offsetHeight <= avail) continue;
          let lo = FIT_MIN, hi = 1;
          for (let i = 0; i < 7; i++) {
            const mid = (lo + hi) / 2;
            el.style.setProperty('--fit', mid.toFixed(3));
            if (el.offsetHeight <= avail) lo = mid; else hi = mid;
          }
          el.style.setProperty('--fit', lo.toFixed(3));
        }
      };
      let fitRaf = 0;
      const onFitResize = () => { if (!prepared) return; cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitTags); };
      addEventListener('resize', onFitResize);
      const prep = () => {
        if (!alive || prepared) return;
        prepared = true;
        removeEventListener('scroll', onNear);
        hidden.ensure();
        ts.forEach((c) => { c.split = SplitText.create(c.title, { type: 'words,chars', wordsClass: 'word', charsClass: 'char', aria: 'none' }); });
        fitTags();
        measure();
        setBatch([
          ...ts.map((c): [Element[], gsap.TweenVars] => [c.split!.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0 }]),
          ...ts.map((c): [HTMLElement, gsap.TweenVars] => [c.title, { opacity: 1 }]),
        ]);
        gsap.ticker.add(tick);
      };
      const near = () => { const r = section.getBoundingClientRect(); return r.top < innerHeight * 2 && r.bottom > -innerHeight; };
      let fontsOk = false;
      function onNear() { if (fontsOk && near()) { cancelPrep(); prep(); } }
      addEventListener('scroll', onNear, { passive: true });
      document.fonts.ready.then(() => {
        if (!alive) return;
        fontsOk = true;
        if (near()) prep(); else cancelPrep = idleTask(prep);
      });

      return () => {
        alive = false;
        cancelPrep();
        removeEventListener('scroll', onNear);
        hidden.cancel();
        gsap.ticker.remove(tick);
        removeEventListener('resize', measure);
        removeEventListener('resize', onFitResize);
        cancelAnimationFrame(fitRaf);
        removeEventListener('keydown', onKey);
        document.removeEventListener('click', onDocClick);
        section.removeEventListener('click', onOpenClick);
        section.removeEventListener('pointerover', onViewOver);
        section.removeEventListener('click', onClose);
        section.removeEventListener('focusin', onFocusIn);
        if (openK >= 0) closeCase(true);
        if (S) { S.neg.tags = []; S.neg.open = -1; }
        offSignal();
        stage.classList.remove('is-anchored');
        html.classList.remove('pj-hot', 'pj-vit');
        ts.forEach((c) => {
          c.tl?.kill();
          c.el.removeAttribute('data-on');
          c.el.style.transform = '';
          c.el.style.removeProperty('--fit');
          if (c.split) { gsap.killTweensOf(c.split.chars); c.split.revert(); }
          gsap.set([...c.rest, c.title], { clearProps: 'opacity,transform' });
        });
        panels.forEach((p) => { gsap.killTweensOf(p); p.removeAttribute('data-open'); gsap.set(p, { clearProps: 'opacity' }); });
        gsap.set([label, count], { clearProps: 'opacity,transform' });
      };
    });
    return () => mm.revert();
  }, []);

  const L = { parts: t('case.parts'), stack: t('case.stack'), achievements: t('case.achievements') };

  const screens = (n: number, open: (i: number) => void) => (
    <button type="button" className="pj-btn" onClick={() => open(0)}>{t('case.screens')} <span>{pad2(n)}</span></button>
  );
  const statsDl = (stats: Stat[], cls = 'pj-c-stats') => (
    <dl className={cls}>{stats.map((s) => (<div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>))}</dl>
  );
  // la ficha (Juan, 2026-10-14): 01 componentes → 02 stack → 03 logros → nota → acciones; cada bloque a lo ancho
  // (los logros dobles, «96,7% · 93,1%», no entran de a dos en media columna). Valores largos: pj-long (2 columnas
  // parejas, el rótulo a lo ancho de su columna), a la misma letra.
  const caseBody = (d: CaseStudyData, stack: readonly string[], actions: ReactNode, note?: string, facts = false) => (
    <>
      <div className="pj-c-block pj-c-wide">
        <p className="pj-k"><b>01</b> / {L.parts}</p>
        <ul className="pj-parts">{d.parts.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
      <div className="pj-c-block pj-c-wide"><p className="pj-k"><b>02</b> / {L.stack}</p><p className="pj-mono">{stack.join(' · ')}</p></div>
      <div className="pj-c-block pj-c-wide">
        <p className="pj-k"><b>03</b> / {L.achievements}</p>
        {statsDl(d.stats, `pj-c-stats${facts ? ' pj-facts' : ''}${hasLongStat(d.stats) ? ' pj-long' : ''}`)}
        {d.note && <p className="pj-note">{d.note}</p>}
        <div className="pj-acts">{actions}</div>
        {note && <p className="pj-note">{note}</p>}
      </div>
    </>
  );

  // la cifra del bloque: la primera del sitio en grande; la nota junta las dos siguientes (sin texto nuevo)
  const num = (v: number, d: number) => new Intl.NumberFormat(locale, { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
  const noteOf = (stats: Stat[]) => stats.slice(1, 3).map((s) => `${s.value} ${s.label}`).join(' · ');
  const recall = TRAUMAVISION_METRICS.find((m) => m.key === 'recall')!;
  // la cifra de Eleven en la vitrina sigue con sus datos (fundación, clientes, enfoque); la ficha usa eleven.stats
  const elevenFig: Stat[] = [
    { value: t('eleven.stat_founded'), label: t('eleven.stat_founded_label') },
    { value: t('eleven.stat_sites'), label: t('eleven.stat_sites_label') },
    { value: t('eleven.stat_approach'), label: t('eleven.stat_approach_label') },
  ];

  // mismo orden que GAL_PROJECTS (gallery.ts): TraumaVision, KIBBO, Eleven, LEEX
  const items: Item[] = [
    {
      title: traumavision.title, eyebrow: t('traumavision.label'), caseEyebrow: traumavision.eyebrow, sub: traumavision.line,
      line: traumavision.line, stats: traumavision.stats, demo: traumavision.demo,
      fig: { num: num(recall.value, recall.decimals), unit: recall.suffix, label: t('traumavision.metric_recall'), note: t('traumavision.metrics_note') },
      body: caseBody(traumavision, TRAUMAVISION_STACK, screens(traumavision.shots.length, openTraumavision)),
    },
    {
      title: kibbo.title, eyebrow: kibbo.eyebrow, sub: kibbo.line, line: kibbo.line, stats: kibbo.stats, demo: kibbo.demo,
      fig: { num: kibbo.stats[0].value, label: kibbo.stats[0].label, note: noteOf(kibbo.stats) },
      body: caseBody(kibbo, KIBBO_STACK, (
        <>
          {screens(kibboShotCount, openKibbo)}
          {kibbo.cta && <a className="pj-btn pj-cta" href={kibbo.cta.href} target="_blank" rel="noopener noreferrer">{kibbo.cta.label}</a>}
        </>
      )),
    },
    {
      title: eleven.title, eyebrow: eleven.eyebrow, sub: eleven.line, line: eleven.line, stats: eleven.stats, demo: eleven.demo,
      fig: { num: elevenFig[0].value, label: elevenFig[0].label, note: elevenFig.slice(1).map((s) => `${s.label} ${s.value}`).join(' · ') },
      body: caseBody(eleven, ELEVEN_STACK, (
        <>
          {screens(eleven.shots.length, openEleven)}
          {eleven.cta && <a className="pj-btn pj-cta" href={eleven.cta.href} target="_blank" rel="noopener noreferrer">{eleven.cta.label}</a>}
        </>
      ), undefined, true),
    },
    {
      title: leex.title, eyebrow: leex.eyebrow, sub: leex.line, line: leex.line, badge: leex.badge, soon: true, stats: leex.stats, demo: leex.demo,
      // los logros de LEEX no son cifras (Juan, 2026-10-14): la vitrina lleva su propio dato (alcance nacional)
      fig: { num: t('leex.fig_value'), label: t('leex.fig_label'), note: t('leex.fig_note') },
      body: caseBody(leex, LEEX_STACK, screens(leex.shots.length, openLeex), leex.shotsNote),
    },
  ];

  return (
    <section ref={ref} className="pj-gal" aria-label={t('label')} style={{ height: `${GAL_SECTION_VH * 100}vh` }}>
      <div className="pj-stage">
        <p className="pj-label"><span className="pj-dot" aria-hidden="true" />{t('label')}</p>
        <p className="pj-count" aria-hidden="true"><b>01</b> / {total}</p>

        {/* Lo esencial de cada proyecto, del lado opuesto a su laptop (la escena le escribe el parallax) */}
        {items.map((it, k) => (
          <article key={GAL_PROJECTS[k].id} className={`pj-tag${it.soon ? ' pj-soon' : ''}`} data-side={GAL_PROJECTS[k].side > 0 ? 'r' : 'l'} aria-labelledby={`pj-t-${k}`}>
            {/* cabecera editorial (maqueta C): filete rojo + folio */}
            <p className="pj-folio" aria-hidden="true"><span className="pj-rule" />{t('case.folio')} {pad2(k + 1)} / {total}</p>
            <p className="pj-eyebrow">{it.eyebrow}</p>
            {it.badge && <p className="pj-badge"><span className="pj-dot" aria-hidden="true" />{it.badge}</p>}
            <h2 id={`pj-t-${k}`} className="pj-title font-display" aria-label={it.title}>{it.title}</h2>
            <p className="pj-line">{it.line}</p>
            <div className="pj-fig">
              <p className="pj-num">{it.fig.num}{it.fig.unit && <small>{it.fig.unit}</small>}</p>
              <p className="pj-lab"><strong>{it.fig.label}</strong>{it.fig.note && <span>{it.fig.note}</span>}</p>
            </div>
            <button type="button" className="pj-view" data-open-case={k} aria-haspopup="dialog" aria-controls={`pj-case-${k}`}>
              <span className="sr-only">{t('case.open_aria', { title: it.title })}: </span>
              <span className="pj-lbl">{t('case.view_project')}</span>
              <span className="pj-arr" aria-hidden="true">→</span>
            </button>
          </article>
        ))}

        {/* El caso completo: se abre con «Ver proyecto» o con clic en la pantalla; cubre el lado del texto. */}
        {items.map((it, k) => (
          <section key={GAL_PROJECTS[k].id} id={`pj-case-${k}`} className={`pj-panel${it.soon ? ' pj-soon' : ''}`} data-side={GAL_PROJECTS[k].side > 0 ? 'r' : 'l'}
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
