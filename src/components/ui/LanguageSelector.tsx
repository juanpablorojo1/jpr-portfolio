'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

export default function LanguageSelector() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: 'en' | 'es') => {
    if (newLocale === locale) return;
    // Replace /en or /es prefix in pathname
    const newPath = pathname.replace(/^\/(en|es)/, `/${newLocale}`);
    startTransition(() => {
      router.replace(newPath);
    });
  };

  return (
    <div className="flex items-center gap-1 font-mono text-xs tracking-widest">
      <button
        onClick={() => switchLocale('en')}
        disabled={isPending}
        className={`px-1 py-0.5 transition-colors duration-150 ${
          locale === 'en'
            ? 'text-accent'
            : 'text-muted hover:text-off-white'
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <span className="text-border">|</span>
      <button
        onClick={() => switchLocale('es')}
        disabled={isPending}
        className={`px-1 py-0.5 transition-colors duration-150 ${
          locale === 'es'
            ? 'text-accent'
            : 'text-muted hover:text-off-white'
        }`}
        aria-label="Cambiar a Español"
      >
        ES
      </button>
    </div>
  );
}
