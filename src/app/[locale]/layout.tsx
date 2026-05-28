import type { Metadata } from 'next';
import { Bebas_Neue, Barlow_Condensed, JetBrains_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
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
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Juan Pablo Rojo — Portfolio',
    },
    robots: {
      index: true,
      follow: true,
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

  // Provide messages to client components
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${bebasNeue.variable} ${barlowCondensed.variable} ${jetBrainsMono.variable}`}
    >
      <body className="bg-bg text-white font-ui">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
