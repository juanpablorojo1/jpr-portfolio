// URL pública del sitio: una sola fuente para canonical, hreflang, Open Graph, sitemap, robots y JSON-LD.
// NEXT_PUBLIC_SITE_URL manda (Vercel: el dominio real); sin ella, la URL de producción actual, nunca localhost.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://jpr-web-mu.vercel.app').replace(/\/+$/, '');
