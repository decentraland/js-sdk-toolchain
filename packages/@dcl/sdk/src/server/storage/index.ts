import { createWorldStorage, IWorldStorage } from './world'
import { createPlayerStorage, IPlayerStorage } from './player'

// Re-export interfaces
export { IWorldStorage } from './world'
export { IPlayerStorage } from './player'

/**
 * Storage interface containing all storage scopes.
 */
export interface IStorage {
  /** World-scoped storage for key-value pairs */
  world: IWorldStorage
  /** Player-scoped storage for key-value pairs */
  player: IPlayerStorage
}

/**
 * Creates the Storage module with all storage scopes.
 */
const createStorage = (): IStorage => {
  return {
    world: createWorldStorage(),
    player: createPlayerStorage()
  }
}

/**
 * Storage provides methods to store and retrieve key-value data from the
 * Server Side Storage service. This module only works when running
 * on server-side scenes.
 */
export const Storage: IStorage = createStorage()
