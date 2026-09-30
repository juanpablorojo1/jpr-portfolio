'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSelector from '../ui/LanguageSelector';

export default function Navbar() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const cvHref = locale === 'es' ? '/CV_Juan_Pablo_Rojo_ES.pdf' : '/CV_Juan_Pablo_Rojo_EN.pdf';
  const navRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#projects', label: t('projects') },
    { href: '#videos', label: t('video') },
    { href: '#skills', label: t('skills') },
    { href: '#experience', label: t('experience') },
    { href: '#contact', label: t('contact') },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      ref={navRef}
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300
        border-b
        ${scrolled
          ? 'bg-bg/90 backdrop-blur-md border-border'
          : 'bg-transparent border-transparent'
        }
      `}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between h-16">
        <div />

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-5 lg:gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="
                font-ui font-bold text-sm text-off-white
                tracking-widest uppercase
                transition-colors duration-150
                hover:text-accent
                relative group
              "
            >
              {link.label}
              <span className="
                absolute -bottom-1 left-0 w-0 h-px bg-accent
                transition-all duration-200 group-hover:w-full
              " />
            </a>
          ))}
          <LanguageSelector />
          <a
            href={cvHref}
            target="_blank"
            rel="noopener noreferrer"
            className="
              font-ui font-bold text-xs text-white whitespace-nowrap
              border border-accent px-4 py-1.5
              tracking-widest uppercase
              transition-all duration-200
              hover:bg-accent hover:shadow-btn-hover
            "
          >
            {t('downloadCV')}
          </a>
        </div>

        {/* Mobile: lang selector + hamburger */}
        <div className="flex md:hidden items-center gap-4">
          <LanguageSelector />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-white w-8 h-8 flex flex-col items-center justify-center gap-1.5"
            aria-label="Toggle menu"
          >
            <span className={`block w-6 h-px bg-white transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-6 h-px bg-white transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-px bg-white transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-surface border-t border-border px-6 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="font-ui font-bold text-sm text-off-white tracking-widest uppercase hover:text-accent transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href={cvHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-ui font-bold text-xs text-accent tracking-widest uppercase"
          >
            {t('downloadCV')}
          </a>
        </div>
      )}
    </nav>
  );
}
