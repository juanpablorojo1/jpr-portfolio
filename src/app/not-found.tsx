import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import NotFoundMonitor from '../components/notfound/NotFoundMonitor';
import en from '../../messages/en.json';
import es from '../../messages/es.json';
import './globals.css';

/* 404 «Señal» (U7): un monitor en línea plana con un botón que lo reanima y vuelve al inicio.
   Toda ruta que no existe (/en/x, /es/x/y; /x redirige a /en/x) cae acá: Next sirve el not-found raíz con estado 404.
   El layout raíz no pinta <html> (lo pinta el de [locale]), así que esta página trae el suyo: idioma (del encabezado
   que pone el middleware de next-intl), fuentes, estilos y messages. Sin la escena 3D: canvas 2D (NotFoundMonitor). */

const bebasNeue = localFont({ src: [{ path: '../../public/fonts/BebasNeue-400.woff2', weight: '400', style: 'normal' }], variable: '--font-bebas-neue', display: 'swap' });
const barlowCondensed = localFont({
  src: [
    { path: '../../public/fonts/BarlowCondensed-400.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/BarlowCondensed-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-barlow-condensed', display: 'swap',
});
const jetBrainsMono = localFont({ src: [{ path: '../../public/fonts/JetBrainsMono-400.woff2', weight: '400', style: 'normal' }], variable: '--font-jetbrains-mono', display: 'swap' });

const localeOf = () => (headers().get('x-next-intl-locale') === 'es' ? 'es' : 'en');

export function generateMetadata(): Metadata {
  const m = localeOf() === 'es' ? es : en;
  return { title: m.notfound.meta_title, robots: { index: false, follow: false } };
}

export default function RootNotFound() {
  const locale = localeOf();
  const m = locale === 'es' ? es : en;
  // solo lo que usa la página (menos bytes en el payload)
  const messages = { notfound: m.notfound, hero: m.hero, nav: m.nav };
  return (
    <html lang={locale} className={`${bebasNeue.variable} ${barlowCondensed.variable} ${jetBrainsMono.variable}`}>
      <body className="bg-bg text-white font-ui">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <NotFoundMonitor />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
