import { Observable } from './Observable'

/**
 * @internal
 * Raw `localeChanged` events drained from the renderer by `pollEvents`.
 * Kept side-effect free so `observables` doesn't load `platform` for every scene.
 */
export const localeChangedEvents = new Observable<{ locale: string }>()
