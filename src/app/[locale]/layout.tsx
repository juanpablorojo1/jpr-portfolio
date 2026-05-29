import type { Metadata } from 'next';
import { Bebas_Neue, Barlow_Condensed, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../../i18n';
import '../globals.css';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas-neue',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const isEn = locale === 'en';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    title: isEn
      ? 'Juan Pablo Rojo — Biomedical Engineer · AI Developer · Founder'
      : 'Juan Pablo Rojo — Ingeniero Biomédico · AI Developer · Fundador',
    description: isEn
      ? 'From Fracture Detection to Full-Stack. End-to-End.'
      : 'De la Detección de Fracturas al Full-Stack. End-to-End.',
    metadataBase: new URL(siteUrl),
    openGraph: {
      title: isEn
        ? 'Juan Pablo Rojo — Biomedical Engineer · AI Developer · Founder'
        : 'Juan Pablo Rojo — Ingeniero Biomédico · AI Developer · Fundador',
      description: isEn
        ? 'From Fracture Detection to Full-Stack. End-to-End.'
        : 'De la Detección de Fracturas al Full-Stack. End-to-End.',
      url: `${siteUrl}/${locale}`,
      siteName: 'Juan Pablo Rojo',
      type: 'website',
      locale: isEn ? 'en_US' : 'es_AR',
      images: [
        {
          url: `/og/og-${locale}.png`,
          width: 1200,
          height: 630,
          alt: isEn
            ? 'Juan Pablo Rojo — Biomedical Engineer · AI Developer · Founder'
            : 'Juan Pablo Rojo — Ingeniero Biomédico · AI Developer · Fundador',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`/og/og-${locale}.png`],
      title: isEn
        ? 'Juan Pablo Rojo — Biomedical Engineer · AI Developer · Founder'
        : 'Juan Pablo Rojo — Ingeniero Biomédico · AI Developer · Fundador',
      description: isEn
        ? 'From Fracture Detection to Full-Stack. End-to-End.'
        : 'De la Detección de Fracturas al Full-Stack. End-to-End.',
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
