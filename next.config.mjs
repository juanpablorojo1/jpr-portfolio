import createNextIntlPlugin from 'next-intl/plugin';
import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';
import { assertUnchanged, immutableHeaders } from './scripts/immutable-assets.mjs';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // videos, pósters, imágenes, sonidos y fuentes de public/: un año, immutable (scripts/immutable-assets.mjs)
      ...immutableHeaders(),
    ]
  },
};

// el build falla si un archivo con caché immutable cambió de contenido con el mismo nombre
export default (phase) => {
  if (phase === PHASE_PRODUCTION_BUILD) assertUnchanged();
  return withNextIntl(nextConfig);
};
