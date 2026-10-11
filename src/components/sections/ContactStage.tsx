'use client';

/* Contact «Señal» · la convergencia (escritorio ≥1024 con la escena viva). U7.
   La escena (convergence.js, enganchada al pasillo después de ecg.js) dibuja todas las líneas del recorrido
   convergiendo en el punto rojo que dejó Experience; el punto late con el reloj del hero. Acá vive la capa HTML:
   - Rótulo de la sección y titular (el gesto del sitio: SplitText desde z −1100, expo.out 1,2 s).
   - La ficha de contacto: email (enlace + copiar), LinkedIn, GitHub, WhatsApp y el CV.
   - El CTA: un enlace mailto encima de la proyección del punto (la escena le escribe la posición en el mismo frame del
     render: S.ctc.dot) con un tick vertical y su rótulo debajo. Hover / press se los pasa a la escena (S.ctc).
   - El pie: logo, copyright, «hecho con» e idioma, en la línea del interruptor de sonido.
   Sin escena viva (todavía armándose): el punto es CSS, en una posición fija, y late con el mismo reloj (S.pulse).
   El guion (umbrales, alto de la sección) es contact.ts, el mismo que usa la cámara. */

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { onSignal, type Senal } from '../hero/senal/signal';
import { CTC, CTC_VH } from '../hero/senal/contact';
import { SOCIAL_LINKS } from '../../lib/content';
import LogoMark from '../layout/LogoMark';
import LanguageSelector from '../ui/LanguageSelector';
import './contact-senal.css';

gsap.registerPlugin(SplitText);

const LINKEDIN_SHORT = SOCIAL_LINKS.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com/, '');
const GITHUB_SHORT = SOCIAL_LINKS.github.replace(/^https?:\/\//, '');

export default function ContactStage() {
  const t = useTranslations('contact');
  const tHero = useTranslations('hero');
  const locale = useLocale();
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(0);
  const cvHref = locale === 'es' ? '/CV_Juan_Pablo_Rojo_ES.pdf' : '/CV_Juan_Pablo_Rojo_EN.pdf';
  const mailto = `mailto:${SOCIAL_LINKS.email}`;
  const h1 = t('headline_1'), h2 = t('headline_2');

  useEffect(() => () => clearTimeout(copyTimer.current), []);
  const copy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(SOCIAL_LINKS.email).then(() => {
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  };
  const toTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const zone = section.closest<HTMLElement>('.transition-zone');
      const main = zone?.parentElement as HTMLElement | null;
      const stage = section.querySelector<HTMLElement>('.ct-stage');
      const head = section.querySelector<HTMLElement>('.ct-head');
      const label = section.querySelector<HTMLElement>('.ct-label');
      const dotPos = section.querySelector<HTMLElement>('.ct-dotpos');
      const dot = section.querySelector<HTMLAnchorElement>('.ct-dot');
      const rest = Array.from(section.querySelectorAll<HTMLElement>('.ct-sub, .ct-mail, .ct-links > li, .ct-foot'));
      if (!zone || !main || !stage || !head || !label || !dotPos || !dot) return;
      let S: Senal | null = null;
      const offSignal = onSignal((s) => { S = s; s.ctc.dot = dotPos; });
      let alive = true;

      // aterrizaje del About (el mismo L que usa la cámara) y v0: u en que Contact asoma por abajo.
      // Las zonas de la página son sticky: el borde de Contact en el flujo es el final de <main> menos su alto.
      let land = 1, v0 = NaN, top = 0;
      const measure = () => {
        const hz = document.querySelector<HTMLElement>('.transition-zone[data-section="hero"]');
        land = Math.max(1, (hz?.parentElement?.offsetTop ?? 0) + (hz?.offsetHeight ?? 0));
        top = main.getBoundingClientRect().bottom + scrollY - zone.offsetHeight;
        v0 = (top - land) / innerHeight - 1;
        if (S) S.ctc.v0 = v0;
      };
      measure();
      addEventListener('resize', measure);
      const ro = new ResizeObserver(measure);
      ro.observe(main);

      let split: SplitText | null = null;
      let headOn = false, bodyOn = false, wasLive = false, wasIn = false, cNow = -1;
      let headTl: gsap.core.Timeline | null = null, bodyTl: gsap.core.Timeline | null = null;
      gsap.set(label, { opacity: 0, y: 14 });
      gsap.set(head, { opacity: 0 });
      gsap.set([...rest, dot], { opacity: 0, y: 14 });

      const showHead = (on: boolean) => {
        headOn = on;
        headTl?.kill();
        headTl = gsap.timeline();
        headTl.to(label, { opacity: on ? 1 : 0, y: on ? 0 : 14, duration: on ? 0.8 : 0.35, ease: 'expo.out' }, 0);
        if (split) {
          if (on) headTl.to(split.chars, { z: 0, y: 0, rotationX: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: 0.012 }, 0.1);
          else headTl.to(split.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0, duration: 0.5, ease: 'expo.out', stagger: 0.003 }, 0);
        }
      };
      const showBody = (on: boolean) => {
        bodyOn = on;
        stage.toggleAttribute('data-on', on);
        bodyTl?.kill();
        bodyTl = gsap.timeline();
        if (on) bodyTl.to([...rest, dot], { opacity: 1, y: 0, duration: 1.0, ease: 'expo.out', stagger: 0.06 }, 0.05);
        else bodyTl.to([...rest, dot], { opacity: 0, y: 14, duration: 0.35, ease: 'expo.out' }, 0);
      };

      const tick = () => {
        if (!zone.hasAttribute('data-gallery')) return;
        if (S && S.ctc.v0 !== v0) S.ctc.v0 = v0;
        const see = zone.hasAttribute('data-see-through');
        const live = !!(see && S && !S.dead && S.ctc.live);
        if (live !== wasLive) {
          // relevo de dueño de la posición del punto: sin escena, el CSS; con escena, la proyección del punto 3D
          wasLive = live;
          stage.classList.toggle('is-live', live);
          dotPos.style.transform = '';
          dotPos.removeAttribute('data-vis');
        }
        const raw = (scrollY - land) / innerHeight;
        const c = (live && S ? S.state.gal : raw) - v0;      // con escena: el texto llega con la cámara
        cNow = c;
        // Contact transparente: lo que queda pegado de Experience (su zona es sticky) no se pinta detrás
        const cIn = see && c > 0.02;
        if (cIn !== wasIn) { wasIn = cIn; document.documentElement.toggleAttribute('data-ct-in', cIn); }
        if (!headOn && c >= CTC.head[1]) showHead(true); else if (headOn && c < CTC.head[0]) showHead(false);
        if (!bodyOn && c >= CTC.body[1]) showBody(true); else if (bodyOn && c < CTC.body[0]) showBody(false);
        // sin escena viva, el punto CSS late con el reloj del hero
        if (!live && S && !S.dead) stage.style.setProperty('--beat', S.pulse(S.now()).toFixed(3));
      };

      // teclado: el foco en un enlace de Contact antes de que la sección llegue lleva el scroll a su lugar
      const onFocus = () => { if (cNow < CTC.arrive - 0.05) window.scrollTo({ top, behavior: 'auto' }); };
      section.addEventListener('focusin', onFocus);
      // el puntero sobre el punto: la escena lo agranda (hover) o lo comprime (press)
      const set = (k: 'hover' | 'press', v: boolean) => () => { if (S) S.ctc[k] = v; };
      const evs: Array<[string, () => void]> = [
        ['pointerenter', set('hover', true)], ['pointerleave', set('hover', false)],
        ['focus', set('hover', true)], ['blur', set('hover', false)],
        ['pointerdown', set('press', true)], ['pointerup', set('press', false)],
        ['pointerleave', set('press', false)], ['pointercancel', set('press', false)],
      ];
      evs.forEach(([e, f]) => dot.addEventListener(e, f));

      document.fonts.ready.then(() => {
        if (!alive) return;
        split = SplitText.create(head.querySelectorAll('.ct-l'), { type: 'words,chars', wordsClass: 'word', charsClass: 'char', aria: 'none' });
        gsap.set(split.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0 });
        gsap.set(head, { opacity: 1 });
        measure();
        gsap.ticker.add(tick);
      });

      return () => {
        alive = false;
        gsap.ticker.remove(tick);
        removeEventListener('resize', measure);
        ro.disconnect();
        section.removeEventListener('focusin', onFocus);
        evs.forEach(([e, f]) => dot.removeEventListener(e, f));
        if (S) { S.ctc.dot = null; S.ctc.v0 = NaN; S.ctc.hover = false; S.ctc.press = false; }
        offSignal();
        headTl?.kill(); bodyTl?.kill();
        if (split) { gsap.killTweensOf(split.chars); split.revert(); }
        stage.classList.remove('is-live');
        stage.removeAttribute('data-on');
        stage.style.removeProperty('--beat');
        dotPos.style.transform = '';
        dotPos.removeAttribute('data-vis');
        gsap.set([label, head, ...rest, dot], { clearProps: 'opacity,transform' });
        document.documentElement.removeAttribute('data-ct-in');
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={ref} className="ct-gal" aria-labelledby="ct-h" style={{ height: `${CTC_VH * 100}vh` }}>
      <div className="ct-stage">
        <p className="ct-label" aria-hidden="true"><span className="ct-sq" />{t('label')}</p>

        <div className="ct-copy">
          <h2 id="ct-h" className="ct-head" aria-label={`${h1} ${h2}`}>
            <span className="ct-l">{h1}</span>
            <span className="ct-l">{h2}</span>
          </h2>
          <p className="ct-sub">{t('subtitle')}</p>

          <div className="ct-mail">
            <p className="ct-k">{t('email_label')}</p>
            <div className="ct-mail-row">
              <a className="ct-mail-a" href={mailto}>{SOCIAL_LINKS.email}</a>
              <button type="button" className="ct-copy-b" aria-label={t('copy_aria')} onClick={copy} data-done={copied || undefined}>
                <span aria-hidden="true">{copied ? t('copied') : t('copy')}</span>
              </button>
            </div>
            <p className="sr-only" aria-live="polite">{copied ? t('copied') : ''}</p>
          </div>

          <ul className="ct-links">
            <li>
              <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer">
                <span className="ct-k">{t('linkedin_label')}</span>
                <span className="ct-v">{LINKEDIN_SHORT}<i aria-hidden="true">↗</i></span>
              </a>
            </li>
            <li>
              <a href={SOCIAL_LINKS.github} target="_blank" rel="noopener noreferrer">
                <span className="ct-k">{t('github_label')}</span>
                <span className="ct-v">{GITHUB_SHORT}<i aria-hidden="true">↗</i></span>
              </a>
            </li>
            <li>
              <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer">
                <span className="ct-k">{t('phone_label')}</span>
                <span className="ct-v">{SOCIAL_LINKS.phone}<i aria-hidden="true">↗</i></span>
              </a>
            </li>
            <li>
              <a href={cvHref} target="_blank" rel="noopener noreferrer">
                <span className="ct-k">PDF</span>
                <span className="ct-v">{t('cv_cta')}</span>
              </a>
            </li>
          </ul>
        </div>

        {/* el CTA: encima del punto 3D (capa fija, en coordenadas del viewport como el canvas) */}
        <div className="ct-dotlayer">
          <div className="ct-dotpos">
            <a className="ct-dot" href={mailto} aria-label={t('dot_aria')}>
              <span className="ct-dot-hit" aria-hidden="true"><span className="ct-dot-css" /></span>
              <span className="ct-dot-tick" aria-hidden="true" />
              <span className="ct-dot-t">{t('dot_cta')}</span>
            </a>
          </div>
        </div>

        <footer className="ct-foot">
          <a className="ct-foot-logo" href={`/${locale}`} onClick={toTop} aria-label={`${tHero('title')} ${tHero('surname')}`}>
            <LogoMark idSuffix="-foot" />
          </a>
          <p>{t('copyright')}</p>
          <p>{t('built_with')}</p>
          <LanguageSelector />
        </footer>
      </div>
    </section>
  );
}
