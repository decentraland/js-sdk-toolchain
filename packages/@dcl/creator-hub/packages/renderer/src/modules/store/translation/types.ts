// Import the English translations type for type checking
import type enTranslations from './locales/en.json';

export interface TranslationKeys {
  [key: string]: string;
}

export interface Translation {
  [locale: string]: TranslationKeys | null;
}

type DotNotation<T> = T extends string | number | boolean
  ? never
  : T extends object
    ? {
        [K in keyof T]: K extends string
          ? T[K] extends object
            ? K | `${K}.${DotNotation<T[K]>}`
            : K
          : never;
      }[keyof T]
    : never;

// Generate the type-safe translation keys
export type TranslationPath = DotNotation<typeof enTranslations>;
