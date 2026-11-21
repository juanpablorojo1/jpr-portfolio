import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  localePrefix: 'always',
  // Sin la cabecera HTTP `Link` con hreflang que el middleware agrega solo: contradecía el <head> y el sitemap
  // (EN/x-default en capacitaciones, que es solo ES; x-default `/` en la home y el caso). Los hreflang salen
  // únicamente de lib/routes.ts (geo-seo-aeo M1, 2026-11-21).
  alternateLinks: false
});
