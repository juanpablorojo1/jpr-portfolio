import { SITE_URL } from './site';
import type { Locale } from './person';

/* Mapa de rutas públicas (fase C, 2026-11-20): una sola lista para sitemap.xml, llms.txt y los hreflang.
   `locales` dice en qué idiomas EXISTE la página: el hreflang se emite solo si hay par (03-mapa-de-paginas §Idioma).
   Capacitaciones es solo ES: /en/capacitaciones* redirige a /es (next.config.mjs).
   Al sumar una ruta nueva, agregala acá con la fecha en que cambió su contenido. */

export type SiteRoute = {
  /** Ruta sin el prefijo de idioma ('' = home). */
  path: string;
  locales: readonly Locale[];
  /** Fecha del último cambio real del contenido (AAAA-MM-DD), no la del build. */
  updated: string;
  priority: number;
  changeFrequency: 'weekly' | 'monthly' | 'yearly';
};

export const SITE_ROUTES: readonly SiteRoute[] = [
  { path: '', locales: ['en', 'es'], updated: '2026-11-23', priority: 1, changeFrequency: 'monthly' },
  // Capacitaciones C1 (2026-11-23): solo ES (sin hreflang; /en/capacitaciones redirige con 308).
  { path: '/capacitaciones', locales: ['es'], updated: '2026-11-23', priority: 0.9, changeFrequency: 'monthly' },
  // Solo las rutas que EXISTEN. Se suman cuando se construya cada página: '/capacitaciones/ia-para-marketing' (es, 0.8),
  // '/proyectos/traumavision' (es + en, 0.8). Ninguna URL a 404 en el sitemap ni en llms.txt.
];

export const urlFor = (locale: Locale, path: string) => `${SITE_URL}/${locale}${path}`;

/** hreflang de una ruta: solo con par; x-default a EN (la raíz / redirige a /en). Sin par: undefined. */
export function languagesFor(route: SiteRoute): Record<string, string> | undefined {
  if (route.locales.length < 2) return undefined;
  const langs: Record<string, string> = {};
  for (const l of route.locales) langs[l] = urlFor(l, route.path);
  langs['x-default'] = urlFor(route.locales.includes('en') ? 'en' : route.locales[0], route.path);
  return langs;
}
