import { join } from 'path'
import arg from 'arg'
import i18next from 'i18next'
import Backend from 'i18next-fs-backend'

export enum Language {
  EN = 'en',
  ES = 'es',
  ZH = 'zh'
}

export function getLanguage(args: string[]): Language {
  try {
    const language = arg({ '--language': String }, { permissive: true, argv: args })['--language']
    return Language[language?.toUpperCase() as keyof typeof Language] || Language.EN
  } catch (e) {
    return Language.EN
  }
}

export function initLanguage(language: Language) {
  return i18next.use(Backend).init({
    lng: language,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    backend: {
      loadPath: join(__dirname, '../locales/{{lng}}.json')
    }
  })
}
