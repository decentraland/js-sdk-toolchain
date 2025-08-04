import type { Locale } from '/shared/types/translation';

export function getPreferredLocale(availableLocales: Locale[]): Locale | null {
  if (!availableLocales) {
    throw new Error('Failed to get preferred locale: Missing locale list');
  }

  const { navigator } = window;

  const navigatorLocale = (navigator.languages && navigator.languages[0]) || navigator.language;

  const locale: Locale = navigatorLocale.slice(0, 2) as Locale;

  if (!availableLocales.includes(locale)) {
    return null;
  }

  return locale;
}
