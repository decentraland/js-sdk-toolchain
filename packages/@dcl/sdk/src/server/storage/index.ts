import { createSceneStorage, ISceneStorage } from './scene'
import { createPlayerStorage, IPlayerStorage } from './player'

// Re-export interfaces
export { ISceneStorage } from './scene'
export { IPlayerStorage } from './player'

/**
 * Storage interface with methods for scene-scoped and player-scoped storage.
 */
export interface IStorage extends ISceneStorage {
  /** Player-scoped storage for key-value pairs */
  player: IPlayerStorage
}

/**
 * Creates the Storage module with scene-scoped and player-scoped storage.
 */
const createStorage = (): IStorage => {
  const sceneStorage = createSceneStorage()
  const playerStorage = createPlayerStorage()

  return {
    // Spread scene storage methods at top level
    get: sceneStorage.get,
    set: sceneStorage.set,
    delete: sceneStorage.delete,
    getKeys: sceneStorage.getKeys,
    getValues: sceneStorage.getValues,
    // Keep player as nested property
    player: playerStorage
  }
}

/**
 * Storage provides methods to store and retrieve key-value data from the
 * Server Side Storage service.
 *
 * - Use Storage.get/set/delete for scene-scoped storage
 * - Use Storage.player.get/set/delete for player-scoped storage
 *
 * This module only works when running on server-side scenes.
 */
export const Storage: IStorage = createStorage()
