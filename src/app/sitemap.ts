import { MetadataRoute } from 'next'
import { SITE_ROUTES, languagesFor, urlFor } from '../lib/routes'

// Todas las rutas públicas (lib/routes.ts), una entrada por idioma existente; hreflang solo donde hay par.
export default function sitemap(): MetadataRoute.Sitemap {
  return SITE_ROUTES.flatMap((route) => {
    const languages = languagesFor(route)
    return route.locales.map((locale) => ({
      url: urlFor(locale, route.path),
      lastModified: new Date(`${route.updated}T00:00:00Z`),
      changeFrequency: route.changeFrequency,
      priority: route.path === '' && locale === 'es' ? 0.9 : route.priority,
      ...(languages ? { alternates: { languages } } : {}),
    }))
  })
}
