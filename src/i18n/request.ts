import { getRequestConfig } from 'next-intl/server';
import { routing } from '../../i18n';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Ensure the locale is valid
  if (!locale || !routing.locales.includes(locale as 'en' | 'es')) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
