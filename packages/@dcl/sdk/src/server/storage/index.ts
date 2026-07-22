import { createStorageConfig, StorageOptions } from './constants'
import { createSceneStorage, ISceneStorage } from './scene'
import { createPlayerStorage, IPlayerStorage } from './player'

// Re-export interfaces and types
export { GetValuesOptions, GetValuesResult, SetOptions, StorageOptions } from './constants'
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
   * Note: cacheMaxEntries applies per scope (scene and player each keep their own cache).
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
 * - Use Storage.configure to change module-wide defaults (e.g. skipIfUnchanged)
 *
 * This module only works when running on server-side scenes.
 */
export const Storage: IStorage = createStorage()
