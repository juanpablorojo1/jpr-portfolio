import { getRequestConfig } from 'next-intl/server';
import { routing } from '../../i18n';
import en from '../../messages/en.json';
import es from '../../messages/es.json';

const messages = { en, es } as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Ensure the locale is valid
  if (!locale || !routing.locales.includes(locale as 'en' | 'es')) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: messages[locale as 'en' | 'es'],
  };
});
