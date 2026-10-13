'use client';

/* Experience «Señal» · el electrocardiograma vertical (escritorio ≥1024 con la escena viva). U6.
   La escena (ecg.js, enganchada al pasillo de corridor.js) dibuja la traza: cada rol es un latido con su tick rojo,
   detrás dos derivaciones fantasma y el papel milimetrado, y al final las tres convergen en un punto. Acá vive la
   capa HTML:
   - Rótulo del grupo (Trabajo / Educación / Reconocimientos) y contador de rol (el sistema de las otras secciones).
   - Plano de situación: titular y el índice de la traza (cuántos latidos tiene cada grupo).
   - Una ficha por rol (fecha, empresa, cargo, descripción), anclada al tick de su latido: la escena le escribe la
     posición en el mismo frame del render (S.exp.tags) y la ficha queda del lado contrario al pico.
   - Educación y reconocimientos: un rótulo corto por latido, anclado igual, con el título del grupo arriba.
   Entradas con el gesto del sitio (titulares desde z −1100, expo.out 1,2 s; el resto 14 px, 1,0 s); salen en 0,5 s.
   No hay controles: nada que enfocar. Los textos siguen en el árbol de accesibilidad aunque estén apagados.
   Sin escena viva (todavía armándose): las fichas en posiciones fijas del mismo lado.
   El guion (estadías, alto de la sección) es experience.ts, el mismo que usa la cámara. */

import { useEffect, useRef, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { onSignal, type Senal } from '../hero/senal/signal';
import {
  expPlan, expRoleSide, EXP_EDU_SIDE, EXP_REC_SIDE,
  expIntroWanted, expRoleWanted, expEduWanted, expRecWanted, expChromeWanted, expCurrent,
} from '../hero/senal/experience';
import { idleTask, lazySet, setBatch } from '../../lib/idle';
import './experience-senal.css';

gsap.registerPlugin(SplitText);

type ExperienceItem = { year: string; company: string; role: string; description: string };
type EducationItem = { year: string; institution: string; degree: string; detail: string };

const pad2 = (n: number) => String(n).padStart(2, '0');
const sideOf = (s: number) => (s < 0 ? 'l' : 'r');

export default function ExperienceStage() {
  const t = useTranslations('experience');
  const ref = useRef<HTMLElement>(null);
  const roles = t.raw('items') as ExperienceItem[];
  const edu = t.raw('education') as EducationItem[];
  const rec = t.raw('recognition') as EducationItem[];
  const plan = expPlan(roles.length);
  const total = pad2(roles.length);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const zone = section.closest<HTMLElement>('.transition-zone');
      const stage = section.querySelector<HTMLElement>('.ex-stage');
      const label = section.querySelector<HTMLElement>('.ex-label');
      const count = section.querySelector<HTMLElement>('.ex-count');
      const countN = section.querySelector<HTMLElement>('.ex-count b');
      const intro = section.querySelector<HTMLElement>('.ex-intro');
      const head = section.querySelector<HTMLElement>('.ex-head');
      const roleEls = Array.from(section.querySelectorAll<HTMLElement>('.ex-role'));
      const groups = Array.from(section.querySelectorAll<HTMLElement>('.ex-group'));
      const anchors = Array.from(section.querySelectorAll<HTMLElement>('.ex-anchor'));
      if (!zone || !stage || !label || !count || !countN || !intro || !head || roleEls.length !== roles.length || groups.length !== 2) return;
      const P = expPlan(roles.length);
      let S: Senal | null = null;
      const boxes = anchors.map(() => ({ w: 0, h: 0 }));
      const offSignal = onSignal((s) => {
        S = s;
        s.exp.tags = anchors;
        s.exp.box = boxes;
        s.exp.counts = [roles.length, edu.length, rec.length];
      });
      let alive = true;

      type T = { el: HTMLElement; title: HTMLElement | null; rest: HTMLElement[]; split: SplitText | null; on: boolean; tl: gsap.core.Timeline | null; stagger: number };
      const mk = (el: HTMLElement, title: HTMLElement | null, rest: HTMLElement[], stagger = 0.07): T => ({ el, title, rest, split: null, on: false, tl: null, stagger });
      const rs: T[] = roleEls.map((el) => mk(el, el.querySelector<HTMLElement>('.ex-co'), Array.from(el.querySelectorAll<HTMLElement>('.ex-date, .ex-role-t, .ex-desc'))));
      // educación y reconocimientos: los rótulos entran en el orden en que el cabezal dispara sus latidos
      const gs: T[] = groups.map((el) => mk(el, null, Array.from(el.querySelectorAll<HTMLElement>('.ex-mcard')), 0.16));
      const it: T = mk(intro, head, Array.from(intro.querySelectorAll<HTMLElement>('.ex-index')));
      const all = [...rs, ...gs, it];
      let chromeOn = false, wasLive = false, wasIn = false;
      let cancelPrep = () => {};
      const hideJobs: Array<[HTMLElement | HTMLElement[] | null, gsap.TweenVars]> = [
        [[label, count], { opacity: 0, y: 14 }],
        ...all.flatMap((c): Array<[HTMLElement | HTMLElement[] | null, gsap.TweenVars]> => [[c.rest, { opacity: 0, y: 14 }], [c.title, { opacity: 0 }]]),
      ];

      // aterrizaje del About (el mismo L que usa la cámara) y v0: u en que Experience entra por abajo
      let land = 1, v0 = NaN;
      const measure = () => {
        const hz = document.querySelector<HTMLElement>('.transition-zone[data-section="hero"]');
        land = Math.max(1, (hz?.parentElement?.offsetTop ?? 0) + (hz?.offsetHeight ?? 0));
        const prev = zone.previousElementSibling as HTMLElement | null;
        const top = prev ? prev.getBoundingClientRect().bottom + scrollY : NaN;
        v0 = (top - land) / innerHeight - 1;
        if (S) S.exp.v0 = v0;
        anchors.forEach((a, i) => {
          const c = a.firstElementChild as HTMLElement | null;
          boxes[i].w = c ? c.offsetWidth : 0; boxes[i].h = c ? c.offsetHeight : 0;
        });
      };
      measure();
      addEventListener('resize', measure);
      // F-01: L (el aterrizaje del About) cambia después del montaje (alto final de la zona del hero): se vuelve a medir en
      // cada refresh de ScrollTrigger (el mismo momento en que scene.js recalcula trig.end)
      ScrollTrigger.addEventListener('refresh', measure);
      // estado inicial (todo apagado): ya si la sección está cerca de la vista; si no, en su tarea ociosa o al primer
      // scroll, fuera de la hidratación (D-01). Lejos no se ve: el resultado es el mismo.
      const hidden = lazySet(section, hideJobs);
      // Stack (y su alto) puede cambiar después del montaje: fuentes, imágenes, su propio escenario
      const ro = new ResizeObserver(measure);
      if (zone.previousElementSibling) ro.observe(zone.previousElementSibling);
      ro.observe(zone);

      const show = (c: T) => {
        c.on = true;
        c.tl?.kill();
        c.el.setAttribute('data-on', '');
        c.tl = gsap.timeline();
        if (c.split) c.tl.to(c.split.chars, { z: 0, y: 0, rotationX: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: 0.012 }, 0.12);
        c.tl.to(c.rest, { opacity: 1, y: 0, duration: 1.0, ease: 'expo.out', stagger: c.stagger }, 0.05);
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
        if (S && S.exp.v0 !== v0) S.exp.v0 = v0;
        const raw = (scrollY - land) / innerHeight;
        const live = !!(zone.hasAttribute('data-see-through') && S && !S.dead && S.exp.live);
        const e = (live && S ? S.state.gal : raw) - v0;      // con escena: el texto llega con la cámara
        if (live !== wasLive) {
          // relevo de dueño de la posición: sin escena, el CSS; con escena, el tick de cada latido
          wasLive = live;
          stage.classList.toggle('is-live', live);
          anchors.forEach((a) => { a.style.transform = ''; a.removeAttribute('data-vis'); });
        }
        // con Experience transparente, lo que quedó pegado de About y Projects (sus zonas son sticky) se vería
        // detrás de la traza: desde que Experience entra, esas dos zonas no se pintan (las tapaba Stack)
        const expIn = live && e > -0.02;
        if (expIn !== wasIn) { wasIn = expIn; document.documentElement.toggleAttribute('data-exp-in', expIn); }
        const wantChrome = expChromeWanted(P, e);
        if (wantChrome !== chromeOn) {
          chromeOn = wantChrome;
          gsap.to([label, count], { opacity: wantChrome ? 1 : 0, y: wantChrome ? 0 : 14, duration: wantChrome ? 0.8 : 0.35, ease: 'expo.out', overwrite: true });
        }
        // contador de rol sólo durante los roles (educación y reconocimientos tienen su propio título en el cuadro)
        count.toggleAttribute('data-off', e > P.roles[P.roles.length - 1][1] + 0.2);
        const n = pad2(expCurrent(P, e) + 1);
        if (countN.textContent !== n) countN.textContent = n;
        const wi = expIntroWanted(P, e);
        if (wi && !it.on) show(it); else if (!wi && it.on) hide(it);
        rs.forEach((c, k) => {
          const want = expRoleWanted(P, k, e);
          if (want && !c.on) show(c); else if (!want && c.on) hide(c);
        });
        [expEduWanted(P, e), expRecWanted(P, e)].forEach((want, k) => {
          const c = gs[k];
          if (want && !c.on) show(c); else if (!want && c.on) hide(c);
        });
      };

      // titulares partidos fuera de la hidratación, en su propia tarea ociosa (D-01): partir, medir, preparar
      document.fonts.ready.then(() => {
        if (!alive) return;
        cancelPrep = idleTask(() => {
          if (!alive) return;
          hidden.ensure();
          const titled = [...rs, it].filter((c) => c.title);
          titled.forEach((c) => { c.split = SplitText.create(c.title!, { type: 'words,chars', wordsClass: 'word', charsClass: 'char', aria: 'none' }); });
          measure();
          setBatch([
            ...titled.map((c): [Element[], gsap.TweenVars] => [c.split!.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0 }]),
            ...titled.map((c): [HTMLElement | null, gsap.TweenVars] => [c.title, { opacity: 1 }]),
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
        ScrollTrigger.removeEventListener('refresh', measure);
        ro.disconnect();
        if (S) { S.exp.tags = []; S.exp.box = []; S.exp.v0 = NaN; }
        offSignal();
        stage.classList.remove('is-live');
        anchors.forEach((a) => { a.style.transform = ''; a.removeAttribute('data-vis'); });
        all.forEach((c) => {
          c.tl?.kill();
          c.el.removeAttribute('data-on');
          if (c.split) { gsap.killTweensOf(c.split.chars); c.split.revert(); }
          gsap.set(c.title ? [...c.rest, c.title] : c.rest, { clearProps: 'opacity,transform' });
        });
        gsap.set([label, count], { clearProps: 'opacity,transform' });
        count.removeAttribute('data-off');
        document.documentElement.removeAttribute('data-exp-in');
      };
    });
    return () => mm.revert();
    // los textos vienen de messages (estables por locale; el componente se remonta al cambiar de idioma)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headline = t('label');

  return (
    <section ref={ref} className="ex-gal" aria-labelledby="ex-h" style={{ height: `${plan.vh * 100}vh` }}>
      <div className="ex-stage">
        <p className="ex-label" aria-hidden="true"><span className="ex-dot" />{t('label')}</p>
        <p className="ex-count" aria-hidden="true"><b>01</b> / {total}</p>

        {/* plano de situación: la recta de Stack se vuelve electrocardiograma */}
        <div className="ex-intro">
          <h2 id="ex-h" className="ex-head font-display" aria-label={headline}>{headline}</h2>
          <ol className="ex-index">
            <li><b>{pad2(roles.length)}</b>{t('work_label')}</li>
            <li><b>{pad2(edu.length)}</b>{t('education_label')}</li>
            <li><b>{pad2(rec.length)}</b>{t('recognition_label')}</li>
          </ol>
        </div>

        {/* un latido por rol: la ficha anclada a su tick, del lado contrario al pico (experience.ts: expRoleSide) */}
        <h3 className="sr-only">{t('work_label')}</h3>
        <ol className="ex-roles">
          {roles.map((it, k) => (
            <li key={`${it.company}-${k}`} className="ex-role ex-anchor" data-side={sideOf(expRoleSide(k))} style={{ '--i': k } as CSSProperties}>
              <article className="ex-card" aria-labelledby={`ex-co-${k}`}>
                <p className="ex-date"><span className="ex-tick" aria-hidden="true" />{it.year}</p>
                <h4 id={`ex-co-${k}`} className="ex-co font-display" aria-label={it.company} data-long={it.company.length > 26 || undefined}>{it.company}</h4>
                <p className="ex-role-t">{it.role}</p>
                <p className="ex-desc">{it.description}</p>
              </article>
            </li>
          ))}
        </ol>

        {/* educación y reconocimientos: latidos más juntos, un rótulo corto por latido */}
        {[
          { key: 'edu', label: t('education_label'), items: edu, side: EXP_EDU_SIDE },
          { key: 'rec', label: t('recognition_label'), items: rec, side: EXP_REC_SIDE },
        ].map((g) => (
          <section key={g.key} className="ex-group" data-kind={g.key} data-side={sideOf(g.side)} aria-labelledby={`ex-g-${g.key}`}>
            <ol>
              {g.items.map((it, i) => (
                <li key={`${it.institution}-${i}`} className="ex-anchor ex-mini" data-side={sideOf(g.side)} style={{ '--i': i } as CSSProperties}>
                  <div className="ex-mcard">
                    {i === 0 && <h3 id={`ex-g-${g.key}`} className="ex-ghead"><span className="ex-dot" aria-hidden="true" />{g.label}</h3>}
                    <p className="ex-date"><span className="ex-tick" aria-hidden="true" />{it.year}</p>
                    <p className="ex-inst">{it.institution}</p>
                    <p className="ex-deg">{it.degree}</p>
                    {it.detail && <p className="ex-det">{it.detail}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}
