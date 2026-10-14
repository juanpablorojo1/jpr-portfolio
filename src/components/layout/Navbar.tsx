'use client';

/* Menú «Señal» (rediseño 2026). Estilos en ./navbar.css.
   - En reposo sobre el hero: transparente (frame aprobado por Juan, 607f16a: «A, menú así»).
   - Al scrollear (cuando la tarjeta About llega al borde del menú): fondo sólido sin blur + borde de 1 px,
     y la sección activa con un punto rojo que late (IntersectionObserver, scroll nativo, aria-current).
   - Celular (<1200): menú a pantalla completa en un <dialog> modal (foco atrapado por el navegador, Escape cierra,
     el foco vuelve al botón), links grandes en Barlow Condensed y la traza del hero cruzando el fondo, plana.
     Entrada con @starting-style en navbar.css; sin soporte, abre sin animar.
   El logo vive en <LogoSlot> con <LogoMark> inline (logo A «Asta»): la barra lleva los ids canónicos (#jpr-*)
   y el menú de celular los lleva con sufijo «-menu». */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSelector from '../ui/LanguageSelector';
import LogoSlot from './LogoSlot';
import LogoMark from './LogoMark';
import './navbar.css';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Orden del documento. Las tarjetas del card stack quedan pegadas (sticky) debajo de la siguiente,
   así que varias pueden cortar la banda a la vez: manda la última en el orden del documento. */
const SECTION_IDS = ['projects', 'videos', 'skills', 'experience', 'contact'] as const;
type SectionKey = (typeof SECTION_IDS)[number];

/* Alto del menú en reposo (navbar.css: 80 px; 64 px por debajo de 1024, más el safe area de arriba, que en el navegador
   del teléfono en vertical es 0). */
const restBarHeight = () => (window.innerWidth < 1024 ? 64 : 80);

/* La misma traza que el hero (static-trace en Hero.tsx), plana y 2D. */
const TRACE_D = 'M0 90 H340 l10 -6 l8 6 H372 l5 5 l9 -86 l9 96 l6 -15 H470 q22 -18 44 0 H1000';

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
  const [active, setActive] = useState<SectionKey | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const dockBtnRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const dockCloseRef = useRef<HTMLButtonElement>(null);
  /* Celular: el menú se abre desde la barra de arriba (sobre el hero) o desde el dock de abajo (pasado el hero).
     Barre desde ese borde y el botón de cerrar queda en el mismo lugar que el que lo abrió. */
  const [openedFrom, setOpenedFrom] = useState<'top' | 'dock'>('top');
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();
  const closeLabel = t('close_aria');

  /* Estado al scrollear: la raíz del observer es la franja del menú (alto en reposo, arriba de todo).
     «Pasado el hero» = algo que no es el hero ocupa la franja. En desktop las tarjetas son sticky: el hero
     queda pegado debajo de About y About sigue en la franja hasta volver arriba. En celular (<900) las tarjetas
     son relative: el hero sale de la franja. Regla única: About en la franja, o el hero fuera de ella.
     Sin listener de scroll. */
  useEffect(() => {
    const hero = document.querySelector('[data-section="hero"]');
    const about = document.querySelector('[data-section="about"]');
    if (!hero || !about) return;
    const inBand = new Map<Element, boolean>([[hero, true], [about, false]]);
    let io: IntersectionObserver | null = null;
    const build = () => {
      io?.disconnect();
      // Celular (< 1024): la barra de arriba es transparente y no tiene fondo al scrollear (se va). Se va apenas el
      // nombre del hero llega a su franja (alto de la barra + 40 px), antes de que el texto pase por debajo; desde
      // ahí manda el dock de abajo.
      const name = window.innerWidth < 1024 ? document.querySelector('.senal .name') : null;
      if (name) {
        const band = restBarHeight() + 40;
        io = new IntersectionObserver(
          ([e]) => setScrolled(e.isIntersecting || e.boundingClientRect.top < 0),
          { root: document, rootMargin: `0px 0px -${Math.max(0, window.innerHeight - band)}px 0px` },
        );
        io.observe(name);
        return;
      }
      const bottom = Math.max(0, window.innerHeight - restBarHeight());
      // root: document = el viewport de ESTE documento (también dentro de un iframe), para que rootMargin
      // se mida contra el mismo innerHeight que lo calcula.
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) inBand.set(e.target, e.isIntersecting);
          setScrolled(!!inBand.get(about) || !inBand.get(hero));
        },
        { root: document, rootMargin: `0px 0px -${bottom}px 0px` },
      );
      io.observe(hero);
      io.observe(about);
    };
    build();
    let raf = 0;
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(build); };
    window.addEventListener('resize', onResize);
    return () => { io?.disconnect(); cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  /* Sección activa: una banda fina al 45% del alto. De las secciones que la cortan, la última del documento
     es la que está arriba de la pila. Hero y About no tienen link: sin activa.
     Contact en escritorio (D-17): su titular llega con la cámara, ≈0,3 viewport antes de que el borde de la
     sección cruce la banda. ContactStage marca `data-ct-head` en <html> mientras el titular está en pantalla
     (evento 'ct-head'); con esa marca, CONTACT se activa con el titular. */
  useEffect(() => {
    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const inBand = new Set<string>();
    const html = document.documentElement;
    let top: SectionKey | null = null;
    const apply = () => setActive(html.hasAttribute('data-ct-head') ? 'contact' : top);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inBand.add(e.target.id);
          else inBand.delete(e.target.id);
        }
        top = [...SECTION_IDS].reverse().find((id) => inBand.has(id)) ?? null;
        apply();
      },
      { root: document, rootMargin: '-45% 0px -54% 0px' },
    );
    els.forEach((el) => io.observe(el));
    window.addEventListener('ct-head', apply);
    return () => { io.disconnect(); window.removeEventListener('ct-head', apply); };
  }, []);

  /* ---------- menú de celular ---------- */
  const unlockScroll = useCallback(() => {
    const html = document.documentElement;
    html.style.overflow = '';
    html.style.paddingRight = '';
  }, []);

  const closeSheet = useCallback(() => {
    sheetRef.current?.close(); // dispara 'close': ahí se sincroniza el estado y vuelve el foco
    unlockScroll();
  }, [unlockScroll]);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || !menuOpen || sheet.open) return;
    const html = document.documentElement;
    const gutter = window.innerWidth - html.clientWidth; // sin salto de layout al sacar la barra de scroll
    html.style.overflow = 'hidden';
    if (gutter > 0) html.style.paddingRight = `${gutter}px`;
    sheet.showModal();
    (openedFrom === 'dock' ? dockCloseRef : closeBtnRef).current?.focus();
  }, [menuOpen, openedFrom]);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    // Escape (cancel → close), el botón de cerrar o un link: siempre pasa por acá.
    const onClose = () => {
      setMenuOpen(false);
      unlockScroll();
      (openerRef.current ?? menuBtnRef.current)?.focus({ preventScroll: true });
    };
    sheet.addEventListener('close', onClose);
    // Si la ventana pasa a ≥1200 con el menú abierto, el botón desaparece: se cierra.
    const mq = window.matchMedia('(min-width: 1200px)');
    const onMq = () => { if (mq.matches && sheet.open) sheet.close(); };
    mq.addEventListener('change', onMq);
    return () => {
      sheet.removeEventListener('close', onClose);
      mq.removeEventListener('change', onMq);
      unlockScroll();
    };
  }, [unlockScroll]);

  const navLinks: { id: SectionKey; label: string }[] = [
    { id: 'projects', label: t('projects') },
    { id: 'videos', label: t('video') },
    { id: 'skills', label: t('skills') },
    { id: 'experience', label: t('experience') },
    { id: 'contact', label: t('contact') },
  ];

  const scrollToSection = (id: string) => {
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
    document.getElementById(id)?.scrollIntoView({ behavior });
  };

  const handleNavClick = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    scrollToSection(id);
  };

  const handleSheetNavClick = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    closeSheet();
    scrollToSection(id);
  };

  const handleLogoClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (sheetRef.current?.open) closeSheet();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const logoLabel = `${tHero('title')} ${tHero('surname')}`;

  const openMenu = (from: 'top' | 'dock') => {
    openerRef.current = from === 'dock' ? dockBtnRef.current : menuBtnRef.current;
    setOpenedFrom(from);
    setMenuOpen(true);
  };
  const activeIdx = active ? navLinks.findIndex((l) => l.id === active) : -1;

  return (
    <header className={`jnav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="jnav-bar">
        <div className="jnav-left">
          <LogoSlot href={`/${locale}`} label={logoLabel} onClick={handleLogoClick} svg={<LogoMark animated />} />
          <span className="jnav-rule" aria-hidden="true" />
          <nav aria-label={t('menu_aria')}>
            <ul className="jnav-links">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <a
                    className="jnav-link"
                    href={`#${link.id}`}
                    aria-current={active === link.id ? 'location' : undefined}
                    onClick={(e) => handleNavClick(e, link.id)}
                  >
                    <span className="jnav-dot" aria-hidden="true" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
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
            aria-expanded={menuOpen && openedFrom === 'top'}
            aria-controls={panelId}
            onClick={() => openMenu('top')}
          >
            <i /><i />
          </button>
        </div>
      </div>

      {/* Dock de celular (< 1024, navbar.css): pasado el hero la navegación baja al pulgar. Lectura del canal (la sección
          en pantalla, con el punto que late), el CV y el menú. Sobre el hero no está: ahí manda la barra de arriba. */}
      <div className="jnav-dock" data-shown={scrolled ? '' : undefined}>
        <p className="jnav-dock-ch" aria-hidden="true">
          <span className="jnav-dock-dot" />
          <span className="jnav-dock-num">{activeIdx >= 0 ? String(activeIdx + 1).padStart(2, '0') : '00'}</span>
          <span className="jnav-dock-label" key={active ?? 'none'}>{activeIdx >= 0 ? navLinks[activeIdx].label : logoLabel}</span>
        </p>
        <a className="jnav-dock-cv" href={cvHref} target="_blank" rel="noopener noreferrer" aria-label={t('downloadCV')}>
          <span aria-hidden="true">CV</span>
          <svg viewBox="0 0 9 11" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
            <path d="M4.5 0v9M1 5.5l3.5 3.5L8 5.5M0 10.5h9" />
          </svg>
        </a>
        <button
          ref={dockBtnRef}
          type="button"
          className="jnav-menu jnav-dock-menu"
          aria-label={t('menu_aria')}
          aria-expanded={menuOpen && openedFrom === 'dock'}
          aria-controls={panelId}
          onClick={() => openMenu('dock')}
        >
          <i /><i />
        </button>
      </div>

      {/* Menú de celular. Modal: el resto de la página queda inerte mientras está abierto. */}
      <dialog ref={sheetRef} id={panelId} className="jnav-sheet" data-from={openedFrom} aria-label={t('menu_aria')}>
        <div className="jnav-bar jnav-sheet-bar">
          <LogoSlot href={`/${locale}`} label={logoLabel} onClick={handleLogoClick} svg={<LogoMark idSuffix="-menu" />} />
          <div className="jnav-right">
            <LanguageSelector />
            <button ref={closeBtnRef} type="button" className="jnav-menu jnav-close" aria-label={closeLabel} onClick={closeSheet}>
              <i /><i />
            </button>
          </div>
        </div>

        <div className="jnav-sheet-signal" aria-hidden="true">
          <svg viewBox="0 0 1000 120" preserveAspectRatio="none" focusable="false">
            <path d={TRACE_D} />
          </svg>
        </div>

        <nav className="jnav-sheet-nav" aria-label={t('menu_aria')}>
          <ol className="jnav-sheet-links">
            {navLinks.map((link, i) => (
              <li key={link.id} style={{ ['--i' as string]: i }}>
                <a
                  className="jnav-sheet-link"
                  href={`#${link.id}`}
                  aria-current={active === link.id ? 'location' : undefined}
                  onClick={(e) => handleSheetNavClick(e, link.id)}
                >
                  <span className="jnav-sheet-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span className="jnav-sheet-label">{link.label}</span>
                  <span className="jnav-dot" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="jnav-sheet-foot">
          <CvLink href={cvHref} label={t('downloadCV')} />
          {/* celular, abierto desde el dock: cerrar abajo, donde estaba el botón que lo abrió */}
          <button ref={dockCloseRef} type="button" className="jnav-menu jnav-close jnav-close-dock" aria-label={closeLabel} onClick={closeSheet}>
            <i /><i />
          </button>
        </div>
      </dialog>
    </header>
  );
}
