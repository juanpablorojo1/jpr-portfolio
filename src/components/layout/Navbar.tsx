'use client';

/* Menú «Señal» (rediseño 2026), frame en reposo sobre el hero. Estilos en ./navbar.css.
   El logo vive en <LogoSlot> (componente propio) para montar los conceptos sin tocar el menú.
   Provisorio hasta los próximos dispatches: estado al scrollear y panel de celular. */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSelector from '../ui/LanguageSelector';
import LogoSlot from './LogoSlot';
import './navbar.css';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function CvLink({ href, label }: { href: string; label: string }) {
  return (
    <a className="jnav-cv" href={href} target="_blank" rel="noopener noreferrer">
      <span>{label}</span>
      <svg viewBox="0 0 9 11" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
        <path d="M4.5 0v9M1 5.5l3.5 3.5L8 5.5M0 10.5h9" />
      </svg>
    </a>
  );
}

export default function Navbar() {
  const t = useTranslations('nav');
  const tHero = useTranslations('hero');
  const locale = useLocale();
  const cvHref = locale === 'es' ? '/CV_Juan_Pablo_Rojo_ES.pdf' : '/CV_Juan_Pablo_Rojo_EN.pdf';
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Estado al scrollear (provisorio): IntersectionObserver sobre un centinela en el tope del documento.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const closeMenu = useCallback((returnFocus: boolean) => {
    setMenuOpen(false);
    if (returnFocus) menuBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu(true); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, closeMenu]);

  const navLinks = [
    { href: '#projects', label: t('projects') },
    { href: '#videos', label: t('video') },
    { href: '#skills', label: t('skills') },
    { href: '#experience', label: t('experience') },
    { href: '#contact', label: t('contact') },
  ];

  const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';

  const handleNavClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMenuOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior });
  };

  const handleLogoClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior });
  };

  const links = navLinks.map((link) => (
    <li key={link.href}>
      <a className="jnav-link" href={link.href} onClick={(e) => handleNavClick(e, link.href)}>
        {link.label}
      </a>
    </li>
  ));

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 48, pointerEvents: 'none' }} />
      <header className={`jnav${scrolled || menuOpen ? ' is-scrolled' : ''}`}>
        <div className="jnav-bar">
          <div className="jnav-left">
            <LogoSlot
              href={`/${locale}`}
              label={`${tHero('title')} ${tHero('surname')}`}
              onClick={handleLogoClick}
            />
            <span className="jnav-rule" aria-hidden="true" />
            <nav aria-label={t('menu_aria')}>
              <ul className="jnav-links">{links}</ul>
            </nav>
            <span className="jnav-rule" aria-hidden="true" />
            <div className="jnav-lang-wide"><LanguageSelector /></div>
          </div>

          <div className="jnav-right">
            <div className="jnav-lang-compact"><LanguageSelector /></div>
            <CvLink href={cvHref} label={t('downloadCV')} />
            <button
              ref={menuBtnRef}
              type="button"
              className="jnav-menu"
              aria-label={t('menu_aria')}
              aria-expanded={menuOpen}
              aria-controls={panelId}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <i /><i />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id={panelId} className="jnav-panel" aria-label={t('menu_aria')}>
            <ul className="jnav-links" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>{links}</ul>
            <CvLink href={cvHref} label={t('downloadCV')} />
          </nav>
        )}
      </header>
    </>
  );
}
