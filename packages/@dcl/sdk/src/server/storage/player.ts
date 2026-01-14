import { signedFetch } from '~system/SignedFetch'
import { getStorageServerUrl } from '../storage-url'
import { assertIsServer } from '../utils'
import { MODULE_NAME } from './constants'

/**
 * Player-scoped storage interface for key-value pairs.
 */
export interface IPlayerStorage {
  /**
   * Retrieves a value from a player's storage by key.
   * @param address - The player's wallet address
   * @param key - The key to retrieve
   * @returns A promise that resolves to the parsed JSON value, or null if not found
   */
  get<T = unknown>(address: string, key: string): Promise<T | null>

  /**
   * Stores a value in a player's storage.
   * @param address - The player's wallet address
   * @param key - The key to store the value under
   * @param value - The value to store (will be JSON serialized)
   * @returns A promise that resolves to true if successful, false otherwise
   */
  set<T = unknown>(address: string, key: string, value: T): Promise<boolean>

  /**
   * Deletes a value from a player's storage.
   * @param address - The player's wallet address
   * @param key - The key to delete
   * @returns A promise that resolves to true if deleted, false if not found
   */
  delete(address: string, key: string): Promise<boolean>
}

/**
 * Creates player-scoped storage for key-value pairs.
 * This module only works when running on server-side scenes.
 */
export const createPlayerStorage = (): IPlayerStorage => {
  return {
    async get<T = unknown>(address: string, key: string): Promise<T | null> {
      await assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      const url = `${baseUrl}/players/${encodeURIComponent(address)}/values/${encodeURIComponent(key)}`

      const response = await signedFetch({ url })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        console.error(
          `Failed to get player storage value '${key}' for '${address}': ${response.status} ${response.statusText}`
        )
        return null
      }

      try {
        return JSON.parse(response.body) as T
      } catch {
        console.error(`Failed to parse player storage value '${key}' for '${address}' as JSON`)
        return null
      }
    },

    async set<T = unknown>(address: string, key: string, value: T): Promise<boolean> {
      await assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      const url = `${baseUrl}/players/${encodeURIComponent(address)}/values/${encodeURIComponent(key)}`

      const response = await signedFetch({
        url,
        init: {
          method: 'PUT',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify(value)
        }
      })

      if (!response.ok) {
        console.error(
          `Failed to set player storage value '${key}' for '${address}': ${response.status} ${response.statusText}`
        )
        return false
      }

      return true
    },

    async delete(address: string, key: string): Promise<boolean> {
      await assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      const url = `${baseUrl}/players/${encodeURIComponent(address)}/values/${encodeURIComponent(key)}`

      const response = await signedFetch({
        url,
        init: {
          method: 'DELETE',
          headers: {}
        }
      })

      if (response.status === 404) {
        return false
      }

      if (!response.ok) {
        console.error(
          `Failed to delete player storage value '${key}' for '${address}': ${response.status} ${response.statusText}`
        )
        return false
      }

      return true
    }
  }
}
