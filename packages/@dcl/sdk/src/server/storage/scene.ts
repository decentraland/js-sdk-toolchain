import { getStorageServerUrl } from '../storage-url'
import { assertIsServer, wrapSignedFetch } from '../utils'
import { MODULE_NAME } from './constants'

/**
 * Scene-scoped storage interface for key-value pairs from the Server Side Storage service.
 * This is NOT filesystem storage - data is stored in the remote storage service.
 */
export interface ISceneStorage {
  /**
   * Retrieves a value from scene storage by key from the Server Side Storage service.
   * @param key - The key to retrieve
   * @returns A promise that resolves to the parsed JSON value, or null if not found
   */
  get<T = unknown>(key: string): Promise<T | null>

  /**
   * Stores a value in scene storage in the Server Side Storage service.
   * @param key - The key to store the value under
   * @param value - The value to store (will be JSON serialized)
   */
  set<T = unknown>(key: string, value: T): Promise<boolean>

  /**
   * Deletes a value from scene storage in the Server Side Storage service.
   * @param key - The key to delete
   * @returns A promise that resolves to true if deleted, false if not found
   */
  delete(key: string): Promise<boolean>

  /**
   * Returns all keys from scene storage, optionally filtered by prefix.
   * @param prefix - Optional prefix; only keys that start with this string are returned. Omit to get all keys.
   * @returns A promise that resolves to an array of key strings
   */
  getKeys(prefix?: string): Promise<string[]>

  /**
   * Returns all key-value entries from scene storage, optionally filtered by prefix.
   * @param prefix - Optional prefix; only entries whose key starts with this string are returned. Omit to get all.
   * @returns A promise that resolves to an array of { key, value } entries
   */
  getValues(prefix?: string): Promise<Array<{ key: string; value: unknown }>>
}

/**
 * Creates scene-scoped storage that provides methods to interact with
 * scene-specific key-value pairs from the Server Side Storage service.
 * This module only works when running on server-side scenes.
 */
export const createSceneStorage = (): ISceneStorage => {
  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      const url = `${baseUrl}/values/${encodeURIComponent(key)}`

      const [error, data] = await wrapSignedFetch<{ value: T }>({ url })

      if (error) {
        console.error(`Failed to get storage value '${key}': ${error}`)
        return null
      }

      return data?.value ?? null
    },

    async set<T = unknown>(key: string, value: T): Promise<boolean> {
      assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      const url = `${baseUrl}/values/${encodeURIComponent(key)}`

      const [error] = await wrapSignedFetch({
        url,
        init: {
          method: 'PUT',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({ value })
        }
      })

      if (error) {
        console.error(`Failed to set storage value '${key}': ${error}`)
        return false
      }

      return true
    },

    async delete(key: string): Promise<boolean> {
      assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      const url = `${baseUrl}/values/${encodeURIComponent(key)}`

      const [error] = await wrapSignedFetch({
        url,
        init: {
          method: 'DELETE',
          headers: {}
        }
      })

      if (error) {
        console.error(`Failed to delete storage value '${key}': ${error}`)
        return false
      }

      return true
    },

    async getKeys(prefix?: string): Promise<string[]> {
      assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      let url = `${baseUrl}/values`

      if (prefix !== undefined && prefix !== '') {
        url = `${url}?prefix=${encodeURIComponent(prefix)}`
      }

      const [error, data] = await wrapSignedFetch<{ data: Array<{ key: string; value: unknown }> }>({ url })

      if (error) {
        console.error(`Failed to get storage keys: ${error}`)
        return []
      }

      const entries = data?.data ?? []
      return entries.map((entry) => entry.key)
    },

    async getValues(prefix?: string): Promise<Array<{ key: string; value: unknown }>> {
      assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      let url = `${baseUrl}/values`

      if (prefix !== undefined && prefix !== '') {
        url = `${url}?prefix=${encodeURIComponent(prefix)}`
      }

      const [error, data] = await wrapSignedFetch<{ data: Array<{ key: string; value: unknown }> }>({ url })

      if (error) {
        console.error(`Failed to get storage values: ${error}`)
        return []
      }

      return data?.data ?? []
    }
  }
}
