'use client';

/* Stack «Señal» · la red por capas (escritorio ≥1024 con la escena viva). U5.
   La escena (network.js, enganchada al pasillo de corridor.js) dibuja la red: cuatro arborizaciones en pila, una por
   capa del stack, y la señal que las atraviesa. Acá vive la capa HTML:
   - Rótulo de sección y contador de capa (el sistema de Projects y Frame by Frame).
   - Plano de situación: titular e idiomas, mientras la señal sale de la nube de puntos de Frame by Frame.
   - Una cabecera por capa (índice, título; en IA, la cifra de TraumaVision) del lado contrario a sus nodos.
   - Un rótulo por nodo con nombre (cada tecnología de messages skills.<capa>.items). La escena les escribe la
     posición del nodo y data-on cuando la onda lo alcanza, en el mismo frame del render (S.stk.items).
   Entradas con el gesto del sitio (titulares desde z −1100, expo.out 1,2 s; el resto 14 px, 1,0 s); salen en 0,5 s.
   No hay controles: nada que enfocar. Los textos siguen en el árbol de accesibilidad aunque estén apagados.
   Sin escena viva (todavía armándose): los rótulos en una grilla del lado de los nodos.
   El guion (estadías, alto de la sección) es stack.ts, el mismo que usa la cámara. */

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { onSignal, type Senal } from '../hero/senal/signal';
import {
  STK_LAYERS, STK_SECTION_VH, stkLayerWanted, stkIntroWanted, stkChromeWanted, stkCurrent,
} from '../hero/senal/stack';
import { idleTask, lazySet, setBatch } from '../../lib/idle';
import './stack-senal.css';

gsap.registerPlugin(SplitText);

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function StackStage() {
  const t = useTranslations('skills');
  const ref = useRef<HTMLElement>(null);
  const total = pad2(STK_LAYERS.length);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const zone = section.closest<HTMLElement>('.stack-zone');
      const stage = section.querySelector<HTMLElement>('.sk-stage');
      const label = section.querySelector<HTMLElement>('.sk-label');
      const count = section.querySelector<HTMLElement>('.sk-count');
      const countN = section.querySelector<HTMLElement>('.sk-count b');
      const intro = section.querySelector<HTMLElement>('.sk-intro');
      const head = section.querySelector<HTMLElement>('.sk-head');
      const layers = Array.from(section.querySelectorAll<HTMLElement>('.sk-layer'));
      if (!zone || !stage || !label || !count || !countN || !intro || !head || layers.length !== STK_LAYERS.length) return;
      const items = layers.map((l) => Array.from(l.querySelectorAll<HTMLElement>('.sk-item')));
      let S: Senal | null = null;
      const offSignal = onSignal((s) => { S = s; s.stk.items = items; });
      let alive = true;

      type T = { el: HTMLElement; title: HTMLElement; rest: HTMLElement[]; split: SplitText | null; on: boolean; tl: gsap.core.Timeline | null };
      const mk = (el: HTMLElement, title: HTMLElement, rest: HTMLElement[]): T => ({ el, title, rest, split: null, on: false, tl: null });
      const ls: T[] = layers.map((el) => mk(el, el.querySelector<HTMLElement>('.sk-title')!, Array.from(el.querySelectorAll<HTMLElement>('.sk-eyebrow, .sk-metric'))));
      const it: T = mk(intro, head, Array.from(intro.querySelectorAll<HTMLElement>('.sk-langs')));
      const all = [...ls, it];
      let chromeOn = false, wasLive = false;
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
        c.tl = gsap.timeline({ onComplete: () => { c.el.removeAttribute('data-on'); } });
        if (c.split) c.tl.to(c.split.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0, duration: 0.5, ease: 'expo.out', stagger: 0.003 }, 0);
        c.tl.to(c.rest, { opacity: 0, y: 14, duration: 0.35, ease: 'expo.out' }, 0);
      };

      const tick = () => {
        if (!zone.hasAttribute('data-gallery')) return;
        const raw = (scrollY - land) / innerHeight;
        const live = !!(zone.hasAttribute('data-see-through') && S && !S.dead && S.stk.live);
        const u = live && S ? S.state.gal : raw;            // con escena: el texto llega con la cámara
        if (live !== wasLive) {
          // relevo de dueño de los rótulos: sin escena los enciende el HTML (por capa); con escena, la onda
          wasLive = live;
          stage.classList.toggle('is-live', live);
          items.forEach((l) => l.forEach((el) => { el.removeAttribute('data-on'); el.style.transform = ''; }));
        }
        const wantChrome = stkChromeWanted(u);
        if (wantChrome !== chromeOn) {
          chromeOn = wantChrome;
          gsap.to([label, count], { opacity: wantChrome ? 1 : 0, y: wantChrome ? 0 : 14, duration: wantChrome ? 0.8 : 0.35, ease: 'expo.out', overwrite: true });
        }
        const n = pad2(stkCurrent(u) + 1);
        if (countN.textContent !== n) countN.textContent = n;
        const wi = stkIntroWanted(u);
        if (wi && !it.on) show(it); else if (!wi && it.on) hide(it);
        ls.forEach((c, k) => {
          const want = stkLayerWanted(k, u);
          if (want && !c.on) show(c); else if (!want && c.on) hide(c);
          if (!live) items[k].forEach((el) => el.toggleAttribute('data-on', want));
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
        if (S) { S.stk.items = []; }
        offSignal();
        stage.classList.remove('is-live');
        items.forEach((l) => l.forEach((el) => { el.removeAttribute('data-on'); el.style.transform = ''; }));
        all.forEach((c) => {
          c.tl?.kill();
          c.el.removeAttribute('data-on');
          if (c.split) { gsap.killTweensOf(c.split.chars); c.split.revert(); }
          gsap.set([...c.rest, c.title], { clearProps: 'opacity,transform' });
        });
        gsap.set([label, count], { clearProps: 'opacity,transform' });
      };
    });
    return () => mm.revert();
  }, []);

  const headline = t('headline');

  return (
    <section ref={ref} className="sk-gal" aria-labelledby="sk-h" style={{ height: `${STK_SECTION_VH * 100}vh` }}>
      <div className="sk-stage">
        <p className="sk-label"><span className="sk-dot" aria-hidden="true" />{t('label')}</p>
        <p className="sk-count" aria-hidden="true"><b>01</b> / {total}</p>
        <p className="sr-only">{t('network_aria')}</p>

        {/* plano de situación: la señal sale de la nube de puntos */}
        <div className="sk-intro">
          <h2 id="sk-h" className="sk-head font-display" aria-label={headline}>{headline}</h2>
          <dl className="sk-langs">
            <div><dt>{t('lang_en_label')}</dt><dd>{t('lang_en_value')}</dd></div>
            <div><dt>{t('lang_es_label')}</dt><dd>{t('lang_es_value')}</dd></div>
          </dl>
        </div>

        {/* una capa por grupo del stack; la cabecera del lado contrario a sus nodos (stack.ts: side) */}
        {STK_LAYERS.map(({ key, side }, k) => {
          const title = t(`${key}.title`);
          const list = t.raw(`${key}.items`) as string[];
          return (
            <article key={key} className="sk-layer" data-side={side < 0 ? 'l' : 'r'} data-cols={list.length > 10 ? 3 : 2} aria-labelledby={`sk-t-${k}`}>
              <div className="sk-lhead">
                <p className="sk-eyebrow"><b>{pad2(k + 1)}</b> / {total}</p>
                <h3 id={`sk-t-${k}`} className="sk-title font-display" aria-label={title}>{title}</h3>
                {key === 'cluster_ai' && <p className="sk-metric">{t('ai_metrics')}</p>}
              </div>
              <ul className="sk-items">
                {list.map((item) => (
                  <li key={item} className="sk-item"><span className="sk-name">{item}</span></li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
