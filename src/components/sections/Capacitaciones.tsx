'use client';

/* Capacitaciones C1 «Línea de lectura» (Juan 2026-11-23: «Va C1»; maqueta bb71746). Entre el About y Projects, solo en /es.
   La recta roja es la línea de lectura: los 6 temas suben en Bebas grande y cada uno se enciende cuando su pie
   apoya en la recta (número en rojo, título blanco, resumen a plena luz); los que ya pasaron y los que vienen quedan
   en penumbra. Scroll nativo: sólo se lee la posición de las filas (sin scrub, sin pin, sin Lenis).
   - Escritorio con la escena viva: la sección es transparente y la recta es la del riel 3D, sostenida en la pose del
     About mientras pasa la sección (capShift.ts). El About se despide y la sección sube por encima del mismo vacío.
   - Celular, tablet y escritorio sin escena: fondo negro y la recta es propia (sticky, con el latido de la traza del
     hero), a la misma altura de lectura.
   Contenido real (2026-11-23, contenido/2026-11-23-capacitaciones-real.md): los temas de las capacitaciones y, después de
   la lista, «Quiénes ya confiaron en mí» (Fruitlosophy, Rufus, ICARO) como prueba social, en el mismo vocabulario. */

import { useEffect, useRef } from 'react';
import { CAPACITACIONES as C } from '../../content/capacitaciones';
import { SOCIAL_LINKS } from '../../lib/content';
import { railY, isLive, riseTitle, watchAboutFrame } from './capMotion';
import './capacitaciones.css';
import './capacitaciones-linea.css';

const pad2 = (n: number) => String(n).padStart(2, '0');
/* la traza del hero (static-trace en Hero.tsx / TRACE_D del menú), plana, viewBox 0 0 1000 120 */
const TRACE_D = 'M0 90 H340 l10 -6 l8 6 H372 l5 5 l9 -86 l9 96 l6 -15 H470 q22 -18 44 0 H1000';
/* el mismo latido (P, QRS, T) en 34 × 44 px, la recta en y 34 */
const BLIP_D = 'M0 34 H5 l2 -2 l2 2 H11 l1.5 1.5 l2.5 -27 l2.5 30 l1.5 -4.5 H23 q3 -4 6 0 H34';

export default function Capacitaciones({ pageHref }: { pageHref: string }) {
  const ref = useRef<HTMLElement>(null);
  const mail = `mailto:${SOCIAL_LINKS.email}?subject=${encodeURIComponent(C.cta.subject)}`;

  useEffect(() => {
    const sec = ref.current;
    if (!sec) return;
    const rows = Array.from(sec.querySelectorAll<HTMLElement>('.c1-row'));
    const titles = rows.map((r) => r.querySelector<HTMLElement>('.c1-t')!);
    const sums = rows.map((r) => r.querySelector<HTMLElement>('.c1-s')!);
    // < 1024 el resumen va debajo del título: la recta tiene que subrayar la fila entera, así que el encendido se mide
    // contra el pie del resumen (design-critic, re-pasada D-05). En escritorio el resumen va al costado: el pie del título.
    const narrow = matchMedia('(max-width: 1023px)');
    const offTitle = riseTitle(sec.querySelector<HTMLElement>('.c1-title')!);
    const offFrame = watchAboutFrame(sec);
    let rail = railY(isLive(sec));
    let lit = -2, raf = 0;
    const apply = () => {
      raf = 0;
      // se enciende la fila que la recta está leyendo, y sólo mientras la subraya: desde que la recta llega al pie del
      // título hasta media fila más abajo (design-critic D-05: no se enciende con la recta tachándolo). Mientras la
      // recta cruza el título siguiente no hay ninguna encendida.
      let k = -1;
      for (let i = 0; i < rows.length; i++) {
        const t = (narrow.matches ? sums[i] : titles[i]).getBoundingClientRect();
        const d = t.bottom - rail;                    // > 0: el pie todavía está debajo de la recta
        // Bebas (line-height 0,86) baja ~0,17 de su alto bajo el pie de las letras; el resumen, sólo su interlineado
        const tol = narrow.matches ? 2 : t.height * 0.2;
        if (d <= tol && d >= -rows[i].offsetHeight * 0.55) { k = i; break; }
      }
      if (k === lit) return;
      lit = k;
      const first = rows[0]?.getBoundingClientRect().bottom ?? 0;
      sec.toggleAttribute('data-reading', k >= 0 || first < rail);
      rows.forEach((row, i) => {
        row.toggleAttribute('data-lit', i === k);
        row.toggleAttribute('data-past', k >= 0 ? i < k : row.getBoundingClientRect().bottom < rail);
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const onResize = () => { rail = railY(isLive(sec)); sec.style.setProperty('--rail', `${rail}px`); onScroll(); };
    // la escena llega viva después de montar (hero-controller pone data-see-through): se vuelve a medir la recta
    const mo = new MutationObserver(onResize);
    mo.observe(sec, { attributes: true, attributeFilter: ['data-see-through'] });
    onResize();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize);
    return () => {
      offFrame();
      offTitle();
      mo.disconnect();
      cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <section
      ref={ref}
      id="capacitaciones"
      className="cap c1"
      data-section="capacitaciones"
      data-cap-hold=""
      aria-labelledby="c1-h"
      suppressHydrationWarning
    >
      <div className="c1-head">
        <div className="c1-top">
          <p className="cap-label"><span className="cap-sq" aria-hidden="true" />{C.label}</p>
          <p className="cap-meta"><b>{pad2(C.topics.length)}</b> temas</p>
        </div>

        {/* Juan 2026-11-23: «Capacito equipos y empresas en automatización e inteligencia artificial». Tres renglones en
            escritorio (blanco / rojo / rojo); en el celular el blanco se parte en dos, con «y empresas en» entero (.c1-nb,
            nowrap: SplitText parte las palabras en cajas y un espacio duro no alcanza). */}
        <h2 id="c1-h" className="c1-title" aria-label={C.h1}>
          <span className="c1-l1" data-split="" aria-hidden="true">Capacito equipos <span className="c1-nb">y empresas en</span></span>
          <span className="c1-l2" data-split="" aria-hidden="true">automatización e</span>
          <span className="c1-l2" data-split="" aria-hidden="true">inteligencia artificial</span>
        </h2>

        <div className="c1-intro">
          <p className="c1-lead">{C.lead}</p>
          <div className="cap-ctas">
            <a className="cap-btn cap-btn-solid" href={mail}><span>{C.cta.label}</span></a>
            <a className="cap-btn cap-btn-ghost" href={pageHref}><span>{C.more.label}</span></a>
          </div>
          <p className="c1-who">
            <span>{C.whoTitle}</span> {C.whoLine}
          </p>
        </div>
      </div>

      <div className="c1-body">
        <p className="c1-listhead" aria-hidden="true">
          <span>{C.topicsTitle}</span><span>N.° / tema</span>
        </p>
        {/* la recta propia (sin escena): sticky a la altura de lectura, con el latido de la traza del hero. Vive sólo
            sobre la lista (D-05: no tacha el rótulo de arriba ni el pie) */}
        <div className="c1-read">
          <div className="c1-scan" aria-hidden="true">
            <svg viewBox="0 0 1000 120" preserveAspectRatio="none" focusable="false"><path d={TRACE_D} /></svg>
            {/* < 1024: recta lisa y el latido chico en la canaleta del número, donde no corta texto */}
            <svg className="c1-blip" viewBox="0 0 34 44" focusable="false"><path d={BLIP_D} /></svg>
          </div>
          <ol className="c1-list" aria-label={C.topicsTitle}>
            {C.topics.map((p, i) => (
              <li key={p.slug}>
                <a className="c1-row" href={`${pageHref}#${p.slug}`}>
                  <span className="c1-n">{pad2(i + 1)}</span>
                  <span className="c1-t">{p.title}</span>
                  <span className="c1-s">{p.summary}</span>
                  <span className="c1-a" aria-hidden="true">
                    <svg viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M0 6h22M17 1l5 5-5 5" /></svg>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* Quiénes ya confiaron en mí: la prueba social, con el mismo peso que los temas (nombres en Bebas grande, la línea
            en Barlow). Sin logos ni colores de sus marcas. */}
        <div className="c1-trust" role="group" aria-labelledby="c1-trust-h">
          <p id="c1-trust-h" className="cap-label"><span className="cap-sq" aria-hidden="true" />{C.trustTitle}</p>
          <ul className="c1-trust-list">
            {C.trust.map((t) => (
              <li key={t.slug} className="c1-trust-item">
                <span className="c1-trust-name">{t.name}</span>
                <span className="c1-trust-line">{t.line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* remate: Escribime otra vez después del pico (design-critic D-04) */}
        <div className="c1-foot">
          <a className="cap-btn cap-btn-solid" href={mail}><span>{C.cta.label}</span></a>
          <a className="c1-more" href={pageHref}>
            <span>{C.more.label}</span>
            <svg viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M0 6h22M17 1l5 5-5 5" /></svg>
          </a>
        </div>
      </div>
    </section>
  );
}
