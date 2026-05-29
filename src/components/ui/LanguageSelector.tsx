'use client';

import { useLocale } from 'next-intl';

export default function LanguageSelector() {
  const locale = useLocale();

  return (
    <div className="flex items-center gap-1 font-mono text-xs tracking-widest">
      <a
        href="/en"
        aria-label="Switch to English"
        className={`px-1 py-0.5 transition-colors duration-150 ${
          locale === 'en' ? 'text-accent' : 'text-muted hover:text-off-white'
        }`}
      >
        EN
      </a>
      <span className="text-border">|</span>
      <a
        href="/es"
        aria-label="Cambiar a Español"
        className={`px-1 py-0.5 transition-colors duration-150 ${
          locale === 'es' ? 'text-accent' : 'text-muted hover:text-off-white'
        }`}
      >
        ES
      </a>
    </div>
  );
}
