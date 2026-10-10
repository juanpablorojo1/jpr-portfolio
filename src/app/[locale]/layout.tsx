import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../../i18n';
import '../globals.css';

// Fuentes locales (public/fonts, las mismas woff2 que la maqueta «Señal»), mismas variables CSS de siempre.
const bebasNeue = localFont({
  src: [{ path: '../../../public/fonts/BebasNeue-400.woff2', weight: '400', style: 'normal' }],
  variable: '--font-bebas-neue',
  display: 'swap',
});

const barlowCondensed = localFont({
  src: [
    { path: '../../../public/fonts/BarlowCondensed-400.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/BarlowCondensed-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

const jetBrainsMono = localFont({
  src: [{ path: '../../../public/fonts/JetBrainsMono-400.woff2', weight: '400', style: 'normal' }],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const isEn = locale === 'en';
  const t = await getTranslations({ locale, namespace: 'meta' });
  const title = t('title');
  const description = t('description');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    title: title,
    description: description,
    metadataBase: new URL(siteUrl),
    // Iconos: convenciones de archivo en src/app (favicon.ico, icon.svg, apple-icon.png). Logo A «Asta».
    manifest: '/manifest.json',
    openGraph: {
      title: title,
      description: description,
      url: `${siteUrl}/${locale}`,
      siteName: 'Juan Pablo Rojo',
      type: 'website',
      locale: isEn ? 'en_US' : 'es_AR',
      images: [
        {
          url: '/og/og-image.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/og/og-image.png'],
      title: title,
      description: description,
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `${siteUrl}/${locale}`,
      languages: {
        'en': `${siteUrl}/en`,
        'es': `${siteUrl}/es`,
        // La raíz / redirige (307) a /en: es la versión por defecto.
        'x-default': `${siteUrl}/en`,
      },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params: { locale } }: Props) {
  // Validate locale
  if (!routing.locales.includes(locale as 'en' | 'es')) {
    notFound();
  }

  // Required by next-intl v4 so getMessages() and useTranslations() read the correct locale
  setRequestLocale(locale);

  // Provide messages to client components
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${bebasNeue.variable} ${barlowCondensed.variable} ${jetBrainsMono.variable}`}
    >
      <body className="bg-bg text-white font-ui">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
