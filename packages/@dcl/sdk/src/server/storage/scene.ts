import { getStorageServerUrl } from '../storage-url'
import { assertIsServer, wrapSignedFetch } from '../utils'
import {
  createStorageConfig,
  GetValuesOptions,
  GetValuesResult,
  MODULE_NAME,
  SetOptions,
  StorageConfigState
} from './constants'
import { createValueCache, fingerprint } from './value-cache'

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
   * @param options - Optional { skipIfUnchanged } to skip the network write when the value is already stored
   */
  set<T = unknown>(key: string, value: T, options?: SetOptions): Promise<boolean>

  /**
   * Deletes a value from scene storage in the Server Side Storage service.
   * @param key - The key to delete
   * @returns A promise that resolves to true if deleted, false if not found
   */
  delete(key: string): Promise<boolean>

  /**
   * Returns key-value entries from scene storage, optionally filtered by prefix.
   * Supports pagination via limit and offset.
   * @param options - Optional { prefix, limit, offset } for filtering and pagination.
   * @returns A promise that resolves to { data, pagination: { offset, total } } for pagination UI
   */
  getValues(options?: GetValuesOptions): Promise<GetValuesResult>
}

/**
 * Creates scene-scoped storage that provides methods to interact with
 * scene-specific key-value pairs from the Server Side Storage service.
 * This module only works when running on server-side scenes.
 */
export const createSceneStorage = (config: StorageConfigState = createStorageConfig()): ISceneStorage => {
  const cache = createValueCache(config)

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

      if (data && data.value !== undefined) {
        // Same serialization shape as set()'s PUT body, so a read followed by
        // an unchanged write can be skipped.
        cache.set(key, fingerprint(JSON.stringify({ value: data.value })))
      }

      return data?.value ?? null
    },

    async set<T = unknown>(key: string, value: T, options?: SetOptions): Promise<boolean> {
      assertIsServer(MODULE_NAME)

      const body = JSON.stringify({ value })
      const print = fingerprint(body)
      const skipIfUnchanged = options?.skipIfUnchanged ?? config.skipIfUnchanged

      if (skipIfUnchanged && cache.get(key) === print) {
        return true
      }

      const baseUrl = await getStorageServerUrl()
      const url = `${baseUrl}/values/${encodeURIComponent(key)}`

      const [error] = await wrapSignedFetch({
        url,
        init: {
          method: 'PUT',
          headers: {
            'content-type': 'application/json'
          },
          body
        }
      })

      if (error) {
        console.error(`Failed to set storage value '${key}': ${error}`)
        return false
      }

      cache.set(key, print)
      return true
    },

    async delete(key: string): Promise<boolean> {
      assertIsServer(MODULE_NAME)

      // Invalidate even if the request fails: the DELETE may have reached the
      // server, and a stale "unchanged" skip would lose a future write.
      cache.delete(key)

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

    async getValues(options?: GetValuesOptions): Promise<GetValuesResult> {
      assertIsServer(MODULE_NAME)

      const { prefix, limit, offset } = options ?? {}
      const baseUrl = await getStorageServerUrl()
      const parts: string[] = []

      if (!!prefix) {
        parts.push(`prefix=${encodeURIComponent(prefix)}`)
      }

      if (!!limit) {
        parts.push(`limit=${limit}`)
      }

      if (!!offset) {
        parts.push(`offset=${offset}`)
      }

      const query = parts.join('&')
      const url = query ? `${baseUrl}/values?${query}` : `${baseUrl}/values`

      const [error, response] = await wrapSignedFetch<GetValuesResult>({ url })

      if (error) {
        console.error(`Failed to get storage values: ${error}`)
        return { data: [], pagination: { offset: 0, total: 0 } }
      }

      const data = response?.data ?? []
      const requestedOffset = offset ?? 0
      const pagination = {
        offset: response?.pagination?.offset ?? requestedOffset,
        total: response?.pagination?.total ?? data.length
      }

      return { data, pagination }
    }
  }
}
