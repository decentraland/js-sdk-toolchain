import { createStorageConfig, StorageOptions } from './constants'
import { createSceneStorage, ISceneStorage } from './scene'
import { createPlayerStorage, IPlayerStorage } from './player'

// Re-export interfaces and types
export { GetOptions, GetValuesOptions, GetValuesResult, SetOptions, StorageOptions } from './constants'
export { ISceneStorage } from './scene'
export { IPlayerStorage } from './player'

/**
 * Storage interface with methods for scene-scoped and player-scoped storage.
 */
export interface IStorage extends ISceneStorage {
  /** Player-scoped storage for key-value pairs */
  player: IPlayerStorage

  /**
   * Sets module-wide defaults for both scene-scoped and player-scoped storage.
   * Merges the given partial options into the current configuration.
   * Note: cacheMaxEntries applies per scope (scene and player each keep their
   * own cache) and bounds entry count, not bytes (entries hold serialized
   * value bodies).
   */
  configure(options: StorageOptions): void
}

/**
 * Creates the Storage module with scene-scoped and player-scoped storage.
 */
const createStorage = (): IStorage => {
  const config = createStorageConfig()
  const sceneStorage = createSceneStorage(config)
  const playerStorage = createPlayerStorage(config)

  return {
    // Spread scene storage methods at top level
    get: sceneStorage.get,
    set: sceneStorage.set,
    delete: sceneStorage.delete,
    getValues: sceneStorage.getValues,
    // Keep player as nested property
    player: playerStorage,
    configure(options: StorageOptions): void {
      Object.assign(config, options)
    }
  }
}

/**
 * Storage provides methods to store and retrieve key-value data from the
 * Server Side Storage service.
 *
 * - Use Storage.get/set/delete/getValues for scene-scoped storage
 * - Use Storage.player.get/set/delete/getValues for player-scoped storage
 * - Use Storage.configure to change module-wide defaults (e.g. skipIfUnchanged, cacheReads)
 *
 * Reads are cached by default: get() serves values known from a network
 * round-trip within the last cacheMaxAgeMs (including confirmed "not found"
 * results) without hitting the service, and concurrent gets for the same key
 * share one request. Writes are never deferred — set()/delete() always reach
 * the service; by default (skipIfUnchanged) an unchanged set is skipped, but
 * only when a previous confirmed round-trip proved the exact value is already
 * stored. Out-of-band writers (e.g. CLI storage commands)
 * may not be visible for up to cacheMaxAgeMs; use get(key, { fresh: true })
 * for an authoritative read or Storage.configure({ cacheReads: false }) to
 * disable read caching.
 *
 * This module only works when running on server-side scenes.
 */
export const Storage: IStorage = createStorage()
