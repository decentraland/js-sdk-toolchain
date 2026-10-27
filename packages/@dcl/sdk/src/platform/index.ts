import { getExplorerInformation } from '~system/Runtime'
import { subscribe } from '~system/EngineApi'
import { Observable } from '../internal/Observable'
import { localeChangedEvents } from '../internal/language-events'

export type Platform = 'mobile' | 'desktop' | 'web'

const VALID_PLATFORMS: Set<string> = new Set<string>(['mobile', 'desktop', 'web'])

const DEFAULT_LANGUAGE = 'en'
const BCP47_TAG = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/

let platform: Platform | null = null
let language: string = DEFAULT_LANGUAGE
let languageSetByEvent = false

/**
 * Triggered when the player switches the client language mid-session.
 * Older clients never emit it.
 * @public
 */
export const onPlayerLanguageChanged = new Observable<{ language: string }>()

function normalizeLocale(locale: string | undefined): string {
  const tag = (locale ?? '').trim().replace(/_/g, '-')
  return BCP47_TAG.test(tag) ? tag : DEFAULT_LANGUAGE
}

function setLanguage(next: string) {
  if (next === language) return
  language = next
  onPlayerLanguageChanged.notifyObservers({ language })
}

localeChangedEvents.add((event) => {
  languageSetByEvent = true
  setLanguage(normalizeLocale(event.locale))
})
subscribe({ eventId: 'localeChanged' }).catch(console.error)

void getExplorerInformation({})
  .then((response) => {
    // a mid-session change that arrived first is more recent than this response
    if (!languageSetByEvent) {
      setLanguage(normalizeLocale(response.configurations?.['locale']))
    }
    const normalized = response.platform.toLowerCase()
    if (VALID_PLATFORMS.has(normalized)) {
      platform = normalized as Platform
    } else {
      console.error(`Unknown platform value: "${response.platform}"`)
    }
  })
  .catch((error) => {
    console.error('Failed to get explorer information:', error)
  })

export function getPlatform(): Platform | null {
  return platform
}

export function isMobile(): boolean {
  return getPlatform() === 'mobile'
}

export function isDesktop(): boolean {
  return getPlatform() === 'desktop'
}

export function isWeb(): boolean {
  return getPlatform() === 'web'
}

/**
 * Player's client language as a BCP-47 tag (e.g. `'es'`, `'pt-BR'`).
 * Returns `'en'` until the explorer responds, and on clients that don't report a locale.
 * Use `onPlayerLanguageChanged` to react to mid-session changes.
 * @public
 */
export function getPlayerLanguage(): string {
  return language
}
