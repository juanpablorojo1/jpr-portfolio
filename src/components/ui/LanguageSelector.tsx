'use client';

import { useLocale, useTranslations } from 'next-intl';

/* Selector EN / ES del menú «Señal». Links planos a /en y /es (nunca router.replace ni usePathname).
   Estilos en components/layout/navbar.css (.jnav-lang). */
export default function LanguageSelector() {
  const locale = useLocale();
  const t = useTranslations('nav');

  return (
    <div className="jnav-lang">
      <a
        href="/en"
        hrefLang="en"
        aria-label={t('lang_en_aria')}
        aria-current={locale === 'en' ? 'true' : undefined}
      >
        <span lang="en">EN</span>
      </a>
      <span className="jnav-lang-sep" aria-hidden="true">/</span>
      <a
        href="/es"
        hrefLang="es"
        aria-label={t('lang_es_aria')}
        aria-current={locale === 'es' ? 'true' : undefined}
      >
        <span lang="es">ES</span>
      </a>
    </div>
  );
}
