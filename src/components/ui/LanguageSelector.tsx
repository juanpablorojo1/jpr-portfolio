'use client';

import { useLocale } from 'next-intl';

/* Selector EN / ES del menú «Señal». Links planos a /en y /es (nunca router.replace ni usePathname).
   Estilos en components/layout/navbar.css (.jnav-lang). */
export default function LanguageSelector() {
  const locale = useLocale();

  return (
    <div className="jnav-lang">
      <a
        href="/en"
        hrefLang="en"
        lang="en"
        aria-label="Switch to English"
        aria-current={locale === 'en' ? 'true' : undefined}
      >
        EN
      </a>
      <span className="jnav-lang-sep" aria-hidden="true">/</span>
      <a
        href="/es"
        hrefLang="es"
        lang="es"
        aria-label="Cambiar a Español"
        aria-current={locale === 'es' ? 'true' : undefined}
      >
        ES
      </a>
    </div>
  );
}
