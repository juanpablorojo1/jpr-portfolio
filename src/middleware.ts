import createMiddleware from 'next-intl/middleware';
import { routing } from '../i18n';

export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*|robots.txt|sitemap.xml|manifest.json).*)'],
};
