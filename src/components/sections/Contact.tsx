'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { SOCIAL_LINKS } from '../../lib/content';
import LogoMark from '../layout/LogoMark';
import ContactStage from './ContactStage';
import { whenNoGallery } from '../../lib/idle';
import { phoneReveal } from '../../lib/phoneMotion';
import './contact-phone.css';

const LINKEDIN_SHORT = SOCIAL_LINKS.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com/, '');
const GITHUB_SHORT = SOCIAL_LINKS.github.replace(/^https?:\/\//, '');
/** the signal of the close: flat, one beat, flat again into the point (the point sits at the right end) */
const CT_HZ = 'M0 32 H188 q6 -6 12 0 h10 l3 4 l6 -27 l6 33 l4 -10 h12 q9 -10 18 0 H400';

// Contact — two layouts in the same #contact block:
// - .ct-classic (this one): phones/tablets (<1024) and desktop without the 3D scene (reduced motion, ?static, no GPU).
// - ContactStage: desktop ≥1024 with the «Señal» scene — every line of the page converges on the beating point,
//   which is the CTA (convergence.js + contact-senal.css).
// Below 1024 (2026-10-14, mobile-senal): phone design in contact-phone.css (.ctm-*): the close of the page. The signal
// runs into the beating point (the email CTA), the links get rows of 60 px, and the CV in both languages is one tap away
// (the current language as the solid button, the other one under it). Phone-only pieces are display:none >= 1024 and
// the desktop blocks they replace are hidden < 1024 (.ctm-desk).

export default function Contact() {
  const t = useTranslations('contact');
  const locale = useLocale();
  const cvHref = locale === 'es' ? '/CV_Juan_Pablo_Rojo_ES.pdf' : '/CV_Juan_Pablo_Rojo_EN.pdf';
  const otherLang = locale === 'es' ? 'en' : 'es';
  const cvOtherHref = `/CV_Juan_Pablo_Rojo_${otherLang.toUpperCase()}.pdf`;
  const sectionRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(0);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  const copy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(SOCIAL_LINKS.email).then(() => {
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  };
  useEffect(() => (sectionRef.current ? phoneReveal(sectionRef.current) : undefined), []);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headline2Ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let cleanup = false;

    const animate = async () => {
      // Skip GSAP scrub animations on mobile — elements render visible
      if (typeof window !== 'undefined' && window.innerWidth < 1024) return;
      // Respect prefers-reduced-motion — elements render fully visible via CSS fallback
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      if (cleanup) return;

      if (headlineRef.current) {
        const lines = headlineRef.current.querySelectorAll('.headline-line');

        // Headline reveal — scrub-driven
        gsap.fromTo(
          lines,
          { clipPath: 'inset(100% 0 0 0)', opacity: 1 },
          {
            clipPath: 'inset(0% 0 0 0)',
            ease: 'none',
            stagger: 0.08,
            scrollTrigger: {
              trigger: headlineRef.current,
              start: 'top bottom',
              end: 'top 30%',
              scrub: 1.5,
            },
          }
        );

        // Pin removido — el card stack (TransitionZone) ya es sticky con overflow:hidden,
        // GSAP pin inserta un .pin-spacer que queda clippeado y hace invisible el headline.
      }

      // headline_2 color shift — off-white to accent red with scrub
      if (headline2Ref.current) {
        gsap.fromTo(
          headline2Ref.current,
          { color: '#E8E4DE' },
          {
            color: '#E8272A',
            ease: 'none',
            scrollTrigger: {
              trigger: headline2Ref.current,
              start: 'top bottom',
              end: 'top 40%',
              scrub: 2,
            },
          }
        );
      }

      if (contentRef.current) {
        // Content fade — scrub-driven.
        // immediateRender: false previene que GSAP aplique opacity:0 antes de que
        // el ScrollTrigger calcule si el trigger ya paso (evita flash invisible en reload).
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            ease: 'none',
            immediateRender: false,
            scrollTrigger: {
              trigger: contentRef.current,
              start: 'top bottom',
              end: 'top 40%',
              scrub: 1,
            },
          }
        );
      }
    };

    // con la galería de escritorio activa esta versión está oculta: sus animaciones esperan (D-01)
    const stopWait = whenNoGallery(headlineRef.current, () => { animate(); });
    return () => { cleanup = true; stopWait(); };
  }, []);

  return (
    <div id="contact">
    <section
      ref={sectionRef}
      className="ct-classic py-10 lg:py-32 bg-bg"
    >
      {/* Headline — alineado con el contenido */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-6 lg:mb-10 overflow-hidden">
        <p data-pm="rise" className="ctm-label font-mono text-xs text-accent tracking-widest uppercase mb-6">
          <span className="ctm-sq" aria-hidden="true" />{t('label')}
        </p>
        {/* h2 + spans (block): the same boxes as the former divs on every width */}
        <h2 ref={headlineRef} className="ctm-head block overflow-hidden" data-pm="lines" data-pm-d="0.1" aria-label={`${t('headline_1')} ${t('headline_2')}`}>
          <span className="block overflow-hidden">
            <span
              data-pm-lines
              className="headline-line block font-display text-white uppercase leading-none"
              style={{
                fontSize: 'clamp(2.8rem, 13vw, 11rem)',
              }}
            >
              {t('headline_1')}
            </span>
          </span>
          <span className="block overflow-hidden">
            <span
              ref={headline2Ref}
              data-pm-lines
              className="headline-line headline-line-accent block font-display uppercase leading-none"
              style={{
                fontSize: 'clamp(2.8rem, 13vw, 11rem)',
                color: '#E8E4DE',
              }}
            >
              {t('headline_2')}
            </span>
          </span>
        </h2>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Content */}
        <div ref={contentRef}>
          <p data-pm="rise" data-pm-d="0.2" className="ctm-sub font-ui text-off-white text-base lg:text-lg mb-6 lg:mb-10 max-w-xl">
            {t('subtitle')}
          </p>

          {/* ---------- phone only (display:none >= 1024) ---------- */}
          <div className="ctm">
            {/* the point that beats is the email CTA: the signal runs into it */}
            <div className="ctm-mail">
              <a className="ctm-mail-a" href={`mailto:${SOCIAL_LINKS.email}`}>
                <span className="ctm-sig" aria-hidden="true">
                  <svg className="ctm-hz" data-pm="draw" data-pm-d="0.1" viewBox="0 0 400 44" preserveAspectRatio="none" focusable="false">
                    <path className="pm-trace" pathLength={1} d={CT_HZ} />
                    <path className="pm-head" pathLength={1} d={CT_HZ} />
                  </svg>
                  <span className="ctm-dot" data-pm="on" data-pm-d="0.9"><span className="ctm-dot-css" /></span>
                </span>
                <span className="ctm-cta">{t('dot_cta')}</span>
                <span className="ctm-addr">{SOCIAL_LINKS.email}</span>
              </a>
              <button type="button" className="ctm-copy" aria-label={t('copy_aria')} onClick={copy} data-done={copied || undefined}>
                <span aria-hidden="true">{copied ? t('copied') : t('copy')}</span>
              </button>
              <p className="sr-only" aria-live="polite">{copied ? t('copied') : ''}</p>
            </div>

            <ul className="ctm-links" data-pm="group">
              <li data-pm-i>
                <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer">
                  <span className="ctm-k">{t('linkedin_label')}</span>
                  <span className="ctm-v">{LINKEDIN_SHORT}</span>
                  <i aria-hidden="true">↗</i>
                </a>
              </li>
              <li data-pm-i>
                <a href={SOCIAL_LINKS.github} target="_blank" rel="noopener noreferrer">
                  <span className="ctm-k">{t('github_label')}</span>
                  <span className="ctm-v">{GITHUB_SHORT}</span>
                  <i aria-hidden="true">↗</i>
                </a>
              </li>
              <li data-pm-i>
                <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer">
                  <span className="ctm-k">{t('phone_label')}</span>
                  <span className="ctm-v">{SOCIAL_LINKS.phone}</span>
                  <i aria-hidden="true">↗</i>
                </a>
              </li>
            </ul>

            {/* the close: the CV one tap away, in both languages */}
            <div className="ctm-cv">
              <p className="ctm-cv-k" data-pm="rise"><span>CV</span><span>PDF · {locale.toUpperCase()} / {otherLang.toUpperCase()}</span></p>
              <div className="ctm-cv-wrap">
                <span className="pm-cut" aria-hidden="true"><b /><i /></span>
                <a className="ctm-cv-a" data-pm="cut" data-pm-d="0.15" href={cvHref} target="_blank" rel="noopener noreferrer" hrefLang={locale}>
                  <span>{t('cv_cta')}</span>
                  <span className="ctm-cv-l" aria-hidden="true">{locale.toUpperCase()}</span>
                </a>
              </div>
              <a className="ctm-cv-alt" data-pm="rise" data-pm-d="0.35" href={cvOtherHref} target="_blank" rel="noopener noreferrer" hrefLang={otherLang}>
                <span className="ctm-cv-alt-l" aria-hidden="true">{otherLang.toUpperCase()}</span>
                <span>CV · {t('cv_other')}</span>
                <i aria-hidden="true">↓</i>
              </a>
            </div>
          </div>

          {/* Email — CTA primario */}
          <div className="ctm-desk mb-6 lg:mb-12">
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">
              {t('email_label')}
            </p>
            <a
              href={`mailto:${SOCIAL_LINKS.email}`}
              className="group flex items-center justify-between border-b border-border pb-4 hover:border-accent transition-colors duration-500"
            >
              <span
                className="font-display text-white uppercase transition-colors duration-300 group-hover:text-accent"
                style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)' }}
              >
                {SOCIAL_LINKS.email}
              </span>
              <span className="font-mono text-2xl text-muted group-hover:text-accent group-hover:translate-x-2 transition-all duration-300">
                →
              </span>
            </a>
          </div>

          {/* Numbered links — formato editorial */}
          <div className="ctm-desk flex flex-wrap gap-4 lg:gap-6 mb-4 lg:mb-8">
            <a
              href={`mailto:${SOCIAL_LINKS.email}`}
              className="group flex items-center gap-2 font-mono text-xs text-muted hover:text-accent transition-colors duration-150 tracking-widest uppercase"
            >
              <span className="text-accent transition-transform duration-150 group-hover:translate-x-1 inline-block">01</span>
              <span className="group-hover:text-accent">/ Email</span>
            </a>
            <a
              href={SOCIAL_LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 font-mono text-xs text-muted hover:text-accent transition-colors duration-150 tracking-widest uppercase"
            >
              <span className="text-accent transition-transform duration-150 group-hover:translate-x-1 inline-block">02</span>
              <span>/ LinkedIn</span>
            </a>
            <a
              href={SOCIAL_LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 font-mono text-xs text-muted hover:text-accent transition-colors duration-150 tracking-widest uppercase"
            >
              <span className="text-accent transition-transform duration-150 group-hover:translate-x-1 inline-block">03</span>
              <span>/ GitHub</span>
            </a>
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 font-mono text-xs text-muted hover:text-accent transition-colors duration-150 tracking-widest uppercase"
            >
              <span className="text-accent transition-transform duration-150 group-hover:translate-x-1 inline-block">04</span>
              <span>/ WhatsApp {SOCIAL_LINKS.phone}</span>
            </a>
          </div>

          {/* Secondary CTAs */}
          <div className="ctm-desk flex flex-wrap gap-4 mb-8 lg:mb-16">
            <a
              href={SOCIAL_LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="
                font-ui font-bold text-sm text-white
                border border-border px-6 py-3
                tracking-widest uppercase
                transition-all duration-200
                hover:border-accent hover:text-accent
              "
            >
              {t('linkedin_label')} ↗
            </a>
            <a
              href={SOCIAL_LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="
                font-ui font-bold text-sm text-white
                border border-border px-6 py-3
                tracking-widest uppercase
                transition-all duration-200
                hover:border-accent hover:text-accent
              "
            >
              {t('github_label')} ↗
            </a>
            <a
              href={cvHref}
              target="_blank"
              rel="noopener noreferrer"
              className="
                font-ui font-bold text-sm text-white
                bg-accent px-6 py-3
                tracking-widest uppercase
                transition-all duration-200
                hover:bg-accent-dark hover:shadow-btn-hover
              "
            >
              {t('cv_cta')}
            </a>
          </div>
        </div>

        {/* Logo-symbol ECG — bookend narrativo */}
        <div className="ctm-desk flex justify-center py-8 lg:py-16">
          <div
            style={{
              width: 80,
              height: 80,
              opacity: 0.25,
              filter: 'brightness(0) invert(1)',
            }}
          >
            <img
              src="/logos/logo-symbol.svg"
              alt=""
              aria-hidden="true"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>

        {/* Footer bottom */}
        <div className="ctm-foot border-t border-border pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* logo A «Asta» (el del menú), ids con sufijo propio */}
          <span role="img" aria-label={t('logo_alt')} className="inline-flex h-7 text-white opacity-60 [&>svg]:h-full [&>svg]:w-auto">
            <LogoMark idSuffix="-foot-classic" />
          </span>
          <p className="font-mono text-xs text-muted hidden sm:block">
            {t('built_with')}
          </p>
          <p className="font-mono text-xs text-muted">
            {t('copyright')}
          </p>
        </div>
      </div>
    </section>
    <ContactStage />
    </div>
  );
}
