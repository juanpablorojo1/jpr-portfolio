'use client';

/* Projects «Señal»: la galería espacial (frame crudo del momento protagonista, escritorio ≥1024 con la escena viva).
   Los proyectos son planos en la escena 3D (scene.js), parados sobre el riel que deja el About; el cabezal de la señal
   camina por el riel y es la única luz que los enciende. Acá vive sólo la capa HTML: el texto de cada caso, nítido y
   accesible, en la columna izquierda sobre el piso de la galería (la recta cae en GAL_LINE; el texto nunca la cruza).
   - El caso entra y sale con la cámara (S.state.gal, con su damp), con el gesto del sitio: titular desde la profundidad
     (expo.out 1,2 s) y el resto 14 px hacia arriba; sale con el mismo gesto, más corto.
   - Dentro de cada estadía, el cuerpo (problema → mi rol → decisiones clave → resultado) avanza con el scroll real,
     sin damp: se lee al ritmo del dedo, en una ventana con los bordes fundidos.
   El guion (tramos, alto de la sección) es gallery.ts, el mismo que usa la cámara. */

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { onSignal, type Senal } from '../hero/senal/signal';
import { GAL_DWELLS, GAL_SECTION_VH } from '../hero/senal/gallery';
import {
  TRAUMAVISION_METRICS, TRAUMAVISION_STACK, TRAUMAVISION_SCREENSHOTS,
  ELEVEN_STACK, ELEVEN_SCREENSHOTS, KIBBO_STACK, LEEX_STACK,
} from '../../lib/content';
import type { CaseStudyData } from './CaseStudy';
import './projects-senal.css';

gsap.registerPlugin(SplitText);

type Props = {
  kibbo: CaseStudyData;
  leex: CaseStudyData;
  kibboShotCount: number;
  openTraumavision: (i: number) => void;
  openEleven: (i: number) => void;
  openKibbo: (i: number) => void;
  openLeex: (i: number) => void;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function ProjectsGallery({ kibbo, leex, kibboShotCount, openTraumavision, openEleven, openKibbo, openLeex }: Props) {
  const t = useTranslations('projects');
  const ref = useRef<HTMLElement>(null);
  const total = pad2(GAL_DWELLS.length);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const zone = section.closest<HTMLElement>('.transition-zone');
      const label = section.querySelector<HTMLElement>('.pj-label');
      const cases = Array.from(section.querySelectorAll<HTMLElement>('.pj-case'));
      if (!zone || !label || !cases.length) return;
      let S: Senal | null = null;
      const offSignal = onSignal((s) => { S = s; });
      let alive = true;

      type C = { el: HTMLElement; title: HTMLElement; rest: HTMLElement[]; win: HTMLElement; body: HTMLElement; split: SplitText | null; on: boolean; tl: gsap.core.Timeline | null; over: number };
      const cs: C[] = cases.map((el) => ({
        el,
        title: el.querySelector<HTMLElement>('.pj-title')!,
        rest: Array.from(el.querySelectorAll<HTMLElement>('.pj-eyebrow, .pj-badge, .pj-sub, .pj-win, .pj-foot > *')),
        win: el.querySelector<HTMLElement>('.pj-win')!,
        body: el.querySelector<HTMLElement>('.pj-body')!,
        split: null, on: false, tl: null, over: 0,
      }));
      let labelOn = false;
      gsap.set(label, { opacity: 0, y: 14 });
      cs.forEach((c) => { gsap.set(c.rest, { opacity: 0, y: 14 }); gsap.set(c.title, { visibility: 'hidden' }); });

      // L: el aterrizaje del About (su borde superior en el del viewport); el mismo que usa la cámara (trig.end)
      let land = 1;
      const measure = () => {
        const about = zone.previousElementSibling as HTMLElement | null;
        let y = zone.parentElement?.offsetTop ?? 0;
        for (let el = about?.previousElementSibling; el; el = el.previousElementSibling) y += (el as HTMLElement).offsetHeight;
        land = Math.max(1, y);
        cs.forEach((c) => { c.over = Math.max(0, c.body.scrollHeight - c.win.clientHeight); });
      };
      measure();
      addEventListener('resize', measure);

      const show = (c: C) => {
        c.on = true;
        c.tl?.kill();
        gsap.set(c.el, { visibility: 'visible' });
        c.tl = gsap.timeline();
        if (c.split) c.tl.to(c.split.chars, { z: 0, y: 0, rotationX: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: 0.012 }, 0);
        c.tl.to(c.rest, { opacity: 1, y: 0, duration: 1.0, ease: 'expo.out', stagger: 0.06 }, 0.2);
      };
      const hide = (c: C) => {
        c.on = false;
        c.tl?.kill();
        c.tl = gsap.timeline({ onComplete: () => { gsap.set(c.el, { visibility: 'hidden' }); } });
        if (c.split) c.tl.to(c.split.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0, duration: 0.5, ease: 'expo.out', stagger: 0.004 }, 0);
        c.tl.to(c.rest, { opacity: 0, y: 14, duration: 0.35, ease: 'expo.out' }, 0);
      };

      const tick = () => {
        if (!zone.hasAttribute('data-gallery')) return;
        const raw = (scrollY - land) / innerHeight;
        const live = zone.hasAttribute('data-see-through') && S && !S.dead && S.state.gal >= 0;
        const u = live && S ? S.state.gal : raw;            // con escena: el texto llega con la cámara
        const lastOut = GAL_DWELLS[GAL_DWELLS.length - 1][1] + 0.2;
        const wantLabel = u >= 1.0 && u <= lastOut;
        if (wantLabel !== labelOn) {
          labelOn = wantLabel;
          gsap.to(label, { opacity: wantLabel ? 1 : 0, y: wantLabel ? 0 : 14, duration: wantLabel ? 1.0 : 0.35, ease: 'expo.out', overwrite: true });
        }
        cs.forEach((c, k) => {
          const [d0, d1] = GAL_DWELLS[k];
          if (!c.on && u >= d0 - 0.22 && u <= d1 + 0.12) show(c);
          else if (c.on && (u < d0 - 0.27 || u > d1 + 0.17)) hide(c);
          // el cuerpo avanza con el scroll real dentro de la estadía (sin damp)
          if (c.over > 0) {
            const pr = Math.min(1, Math.max(0, (raw - (d0 + 0.05)) / (d1 - d0 - 0.1)));
            c.body.style.transform = `translate3d(0, ${(-pr * c.over).toFixed(1)}px, 0)`;
          }
        });
      };

      document.fonts.ready.then(() => {
        if (!alive) return;
        cs.forEach((c) => {
          c.split = SplitText.create(c.title, { type: 'words,chars', wordsClass: 'word', charsClass: 'char', aria: 'none' });
          gsap.set(c.split.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0 });
          gsap.set(c.title, { visibility: 'visible' });
        });
        measure();
        gsap.ticker.add(tick);
      });

      return () => {
        alive = false;
        gsap.ticker.remove(tick);
        removeEventListener('resize', measure);
        offSignal();
        cs.forEach((c) => {
          c.tl?.kill();
          if (c.split) { gsap.killTweensOf(c.split.chars); c.split.revert(); }
          gsap.set([...c.rest, c.el, c.title], { clearProps: 'opacity,transform,visibility' });
          c.body.style.transform = '';
        });
        gsap.set(label, { clearProps: 'opacity,transform' });
      };
    });
    return () => mm.revert();
  }, []);

  const caseLabels = { problem: t('case.problem'), role: t('case.role'), decisions: t('case.decisions'), result: t('case.result') };

  // problema → mi rol → decisiones clave → resultado (KIBBO y LEEX tienen el formato completo en el copy)
  const caseBody = (d: CaseStudyData) => (
    <>
      <div className="pj-block"><p className="pj-k"><b>01</b> / {caseLabels.problem}</p><p>{d.problem}</p></div>
      <div className="pj-block"><p className="pj-k"><b>02</b> / {caseLabels.role}</p><p>{d.role}</p></div>
      <div className="pj-block">
        <p className="pj-k"><b>03</b> / {caseLabels.decisions}</p>
        <ol className="pj-dec">
          {d.decisions.map((x, i) => (
            <li key={x.title}><span className="pj-n" aria-hidden="true">{pad2(i + 1)}</span><p><strong>{x.title}</strong> {x.body}</p></li>
          ))}
        </ol>
      </div>
      <div className="pj-block">
        <p className="pj-k"><b>04</b> / {caseLabels.result}</p>
        <p>{d.result}</p>
        <dl className="pj-stats">
          {d.stats.map((s) => (<div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>))}
        </dl>
      </div>
    </>
  );

  const metricLabels: Record<string, string> = {
    auc: t('traumavision.metric_auc'), map50: t('traumavision.metric_map50'),
    recall: t('traumavision.metric_recall'), specificity: t('traumavision.metric_specificity'),
  };
  const screens = (n: number, open: (i: number) => void) => (
    <button type="button" className="pj-btn" onClick={() => open(0)}>{t('case.screens')} <span>{pad2(n)}</span></button>
  );

  return (
    <section ref={ref} className="pj-gal" aria-label={t('label')} style={{ height: `${GAL_SECTION_VH * 100}vh` }}>
      <div className="pj-stage">
        <p className="pj-label"><span className="pj-dot" aria-hidden="true" />{t('label')}</p>

        {/* 01 · TraumaVision */}
        <article className="pj-case" aria-labelledby="pj-t-0">
          <div className="pj-col">
            <p className="pj-eyebrow"><b>01</b> / {total} · {t('traumavision.label')}</p>
            <h2 id="pj-t-0" className="pj-title font-display" aria-label={t('traumavision.title')}>{t('traumavision.title')}</h2>
            <p className="pj-sub">{t('traumavision.subtitle')}</p>
            <div className="pj-win"><div className="pj-body">
              <div className="pj-block"><p>{t('traumavision.description')}</p></div>
              <dl className="pj-stats pj-stats-4">
                {TRAUMAVISION_METRICS.map((m) => (
                  <div key={m.key}><dt>{metricLabels[m.key]}</dt><dd>{m.value.toFixed(m.decimals)}{m.suffix}</dd></div>
                ))}
              </dl>
              <div className="pj-block">
                <p className="pj-k">{t('traumavision.pipeline_label')}</p>
                <p className="pj-mono">DICOM <i>→</i> CLAHE <i>→</i> YOLOv8m <i>→</i> Detection <i>→</i> Report</p>
              </div>
            </div></div>
          </div>
          <div className="pj-foot">
            <p className="pj-tech"><span>{t('traumavision.stack_label')}</span> {TRAUMAVISION_STACK.join(' · ')}</p>
            <div className="pj-acts">{screens(TRAUMAVISION_SCREENSHOTS.length, openTraumavision)}</div>
          </div>
        </article>

        {/* 02 · KIBBO */}
        <article className="pj-case" aria-labelledby="pj-t-1">
          <div className="pj-col">
            <p className="pj-eyebrow"><b>02</b> / {total} · {kibbo.eyebrow}</p>
            <h2 id="pj-t-1" className="pj-title font-display" aria-label={kibbo.title}>{kibbo.title}</h2>
            <p className="pj-sub">{kibbo.subtitle}</p>
            <div className="pj-win"><div className="pj-body">{caseBody(kibbo)}</div></div>
          </div>
          <div className="pj-foot">
            <p className="pj-tech"><span>{t('case.stack')}</span> {KIBBO_STACK.join(' · ')}</p>
            <div className="pj-acts">
              {screens(kibboShotCount, openKibbo)}
              {kibbo.cta && <a className="pj-btn pj-cta" href={kibbo.cta.href} target="_blank" rel="noopener noreferrer">{kibbo.cta.label}</a>}
            </div>
          </div>
        </article>

        {/* 03 · LEEX: todavía no salió — desenfocada en la escena, con el panel «launching soon» */}
        <article className="pj-case pj-soon" aria-labelledby="pj-t-2">
          <div className="pj-col">
            <p className="pj-eyebrow"><b>03</b> / {total} · {leex.eyebrow}</p>
            {leex.badge && <p className="pj-badge"><span className="pj-dot" aria-hidden="true" />{leex.badge}</p>}
            <h2 id="pj-t-2" className="pj-title font-display" aria-label={leex.title}>{leex.title}</h2>
            <p className="pj-sub">{leex.subtitle}</p>
            <div className="pj-win"><div className="pj-body">{caseBody(leex)}</div></div>
          </div>
          <div className="pj-foot">
            <p className="pj-tech"><span>{t('case.stack')}</span> {LEEX_STACK.join(' · ')}</p>
            <div className="pj-acts">
              {screens(leex.shots.length, openLeex)}
              {leex.shotsNote && <span className="pj-note">{leex.shotsNote}</span>}
            </div>
          </div>
        </article>

        {/* 04 · Eleven */}
        <article className="pj-case" aria-labelledby="pj-t-3">
          <div className="pj-col">
            <p className="pj-eyebrow"><b>04</b> / {total} · {t('eleven.subtitle')}</p>
            <h2 id="pj-t-3" className="pj-title font-display" aria-label={t('eleven.title')}>{t('eleven.title')}</h2>
            <div className="pj-win"><div className="pj-body">
              <div className="pj-block"><p>{t('eleven.description_expanded')}</p></div>
              <dl className="pj-stats">
                {[
                  { value: t('eleven.stat_founded'), label: t('eleven.stat_founded_label') },
                  { value: t('eleven.stat_sites'), label: t('eleven.stat_sites_label') },
                  { value: t('eleven.stat_approach'), label: t('eleven.stat_approach_label') },
                ].map((s) => (<div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>))}
              </dl>
            </div></div>
          </div>
          <div className="pj-foot">
            <p className="pj-tech"><span>{t('case.stack')}</span> {ELEVEN_STACK.join(' · ')}</p>
            <div className="pj-acts">
              {screens(ELEVEN_SCREENSHOTS.length, openEleven)}
              <a className="pj-btn pj-cta" href="https://eleven-pagina.vercel.app" target="_blank" rel="noopener noreferrer">{t('eleven.cta')}</a>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
