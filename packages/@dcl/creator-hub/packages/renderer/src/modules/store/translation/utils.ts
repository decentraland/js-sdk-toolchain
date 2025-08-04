import { createIntl, createIntlCache, FormattedMessage } from 'react-intl';
import { flatten } from 'flat';

import type { Locale } from '/shared/types/translation';

import type { Translation, TranslationKeys, TranslationPath } from './types';
import * as languages from './locales';

export const locales = Object.keys(languages) as Locale[];

const cache = createIntlCache();
let currentLocale: ReturnType<typeof createIntl>;

export function setCurrentLocale(localeName: Locale, messages: Record<string, string>) {
  const locale = {
    en: 'en-EN',
    es: 'es-ES',
    zh: 'zh-CN',
  }[localeName];

  currentLocale = createIntl({ locale, messages }, cache);
}

export function getCurrentLocale() {
  return currentLocale;
}

export function t(id: TranslationPath, values?: any): string {
  return currentLocale.formatMessage({ id }, values as any);
}

export const T = FormattedMessage;

function _mergeTranslations<T extends { [key: string]: T | string }>(
  target: T = {} as T,
  source: T = {} as T,
) {
  const merged: T = Object.keys(source).reduce((result: T, key: string) => {
    // @ts-expect-error ???
    result[key] =
      typeof source[key] === 'object'
        ? _mergeTranslations(target[key] as T, source[key] as T)
        : source[key];
    return result;
  }, target);
  return merged;
}

export function mergeTranslations<T extends { [key: string]: T | string }>(
  target: T = {} as T,
  ...sources: (T | undefined)[]
) {
  return [target, ...sources].reduce<T>(
    (result, obj) => _mergeTranslations<T>(result, obj),
    {} as T,
  );
}

export function getKeys(locale: Locale) {
  const result = languages[locale] as any as Translation;
  const allTransalations = mergeTranslations<TranslationKeys>(flatten(result));
  setCurrentLocale(locale, allTransalations);
  return allTransalations;
}
