import { getStorageServerUrl } from '../storage-url'
import { assertIsServer, wrapSignedFetch } from '../utils'
import { MODULE_NAME } from './constants'

/**
 * Player-scoped storage interface for key-value pairs from the Server Side Storage service.
 * This is NOT filesystem storage - data is stored in the remote storage service.
 */
export interface IPlayerStorage {
  /**
   * Retrieves a value from a player's storage by key from the Server Side Storage service.
   * @param address - The player's wallet address
   * @param key - The key to retrieve
   * @returns A promise that resolves to the parsed JSON value, or null if not found
   */
  get<T = unknown>(address: string, key: string): Promise<T | null>

  /**
   * Stores a value in a player's storage in the Server Side Storage service.
   * @param address - The player's wallet address
   * @param key - The key to store the value under
   * @param value - The value to store (will be JSON serialized)
   * @returns A promise that resolves to true if successful, false otherwise
   */
  set<T = unknown>(address: string, key: string, value: T): Promise<boolean>

  /**
   * Deletes a value from a player's storage in the Server Side Storage service.
   * @param address - The player's wallet address
   * @param key - The key to delete
   * @returns A promise that resolves to true if deleted, false if not found
   */
  delete(address: string, key: string): Promise<boolean>

  /**
   * Returns all keys from a player's storage, optionally filtered by prefix.
   * @param address - The player's wallet address
   * @param prefix - Optional prefix; only keys that start with this string are returned. Omit to get all keys.
   * @returns A promise that resolves to an array of key strings
   */
  getKeys(address: string, prefix?: string): Promise<string[]>

  /**
   * Returns all key-value entries from a player's storage, optionally filtered by prefix.
   * @param address - The player's wallet address
   * @param prefix - Optional prefix; only entries whose key starts with this string are returned. Omit to get all.
   * @returns A promise that resolves to an array of { key, value } entries
   */
  getValues(address: string, prefix?: string): Promise<Array<{ key: string; value: unknown }>>
}

/**
 * Creates player-scoped storage that provides methods to interact with
 * player-specific key-value pairs from the Server Side Storage service.
 * This module only works when running on server-side scenes.
 */
export const createPlayerStorage = (): IPlayerStorage => {
  return {
    async get<T = unknown>(address: string, key: string): Promise<T | null> {
      assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      const url = `${baseUrl}/players/${encodeURIComponent(address)}/values/${encodeURIComponent(key)}`

      const [error, data] = await wrapSignedFetch<{ value: T }>({ url })

      if (error) {
        console.error(`Failed to get player storage value '${key}' for '${address}': ${error}`)
        return null
      }

      return data?.value ?? null
    },

    async set<T = unknown>(address: string, key: string, value: T): Promise<boolean> {
      assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      const url = `${baseUrl}/players/${encodeURIComponent(address)}/values/${encodeURIComponent(key)}`

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
        console.error(`Failed to set player storage value '${key}' for '${address}': ${error}`)
        return false
      }

      return true
    },

    async delete(address: string, key: string): Promise<boolean> {
      assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      const url = `${baseUrl}/players/${encodeURIComponent(address)}/values/${encodeURIComponent(key)}`

      const [error] = await wrapSignedFetch({
        url,
        init: {
          method: 'DELETE',
          headers: {}
        }
      })

      if (error) {
        console.error(`Failed to delete player storage value '${key}' for '${address}': ${error}`)
        return false
      }

      return true
    },

    async getKeys(address: string, prefix?: string): Promise<string[]> {
      assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      let url = `${baseUrl}/players/${encodeURIComponent(address)}/values`

      if (prefix !== undefined && prefix !== '') {
        url = `${url}?prefix=${encodeURIComponent(prefix)}`
      }

      const [error, data] = await wrapSignedFetch<{ data: Array<{ key: string; value: unknown }> }>({ url })

      if (error) {
        console.error(`Failed to get player storage keys for '${address}': ${error}`)
        return []
      }

      const entries = data?.data ?? []
      return entries.map((entry) => entry.key)
    },

    async getValues(address: string, prefix?: string): Promise<Array<{ key: string; value: unknown }>> {
      assertIsServer(MODULE_NAME)

      const baseUrl = await getStorageServerUrl()
      let url = `${baseUrl}/players/${encodeURIComponent(address)}/values`
      if (prefix !== undefined && prefix !== '') {
        url = `${url}?prefix=${encodeURIComponent(prefix)}`
      }

      const [error, data] = await wrapSignedFetch<{ data: Array<{ key: string; value: unknown }> }>({ url })

      if (error) {
        console.error(`Failed to get player storage values for '${address}': ${error}`)
        return []
      }

      return data?.data ?? []
    }
  }
}
