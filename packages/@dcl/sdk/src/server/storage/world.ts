import { signedFetch } from '~system/SignedFetch'
import { getStorageServerUrl } from '../storage-url'
import { assertIsServer } from '../utils'
import { MODULE_NAME } from './constants'

/**
 * World-scoped storage interface for key-value pairs.
 */
export interface IWorldStorage {
  /**
   * Retrieves a value from world storage by key.
   * @param key - The key to retrieve
   * @returns A promise that resolves to the parsed JSON value, or null if not found
   */
  get<T = unknown>(key: string): Promise<T | null>

  /**
   * Stores a value in world storage.
   * @param key - The key to store the value under
   * @param value - The value to store (will be JSON serialized)
   */
  set<T = unknown>(key: string, value: T): Promise<boolean>

  /**
   * Deletes a value from world storage.
   * @param key - The key to delete
   * @returns A promise that resolves to true if deleted, false if not found
   */
  delete(key: string): Promise<boolean>
}

/**
 * Creates world-scoped storage for key-value pairs.
 * This module only works when running on server-side scenes.
 */
export const createWorldStorage = (): IWorldStorage => {
  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      const url = `${baseUrl}/values/${encodeURIComponent(key)}`

      const response = await signedFetch({ url })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        console.error(`Failed to get storage value '${key}': ${response.status} ${response.statusText}`)
        return null
      }

      try {
        return JSON.parse(response.body).value as T
      } catch {
        console.error(`Failed to parse storage value '${key}' as JSON`)
        return null
      }
    },

    async set<T = unknown>(key: string, value: T): Promise<boolean> {
      assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      const url = `${baseUrl}/values/${encodeURIComponent(key)}`

      const response = await signedFetch({
        url,
        init: {
          method: 'PUT',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({ value })
        }
      })

      if (!response.ok) {
        console.error(`Failed to set storage value '${key}': ${response.status} ${response.statusText}`)
        return false
      }

      return true
    },

    async delete(key: string): Promise<boolean> {
      assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      const url = `${baseUrl}/values/${encodeURIComponent(key)}`

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
        console.error(`Failed to delete storage value '${key}': ${response.status} ${response.statusText}`)
        return false
      }

      return true
    }
  }
}
