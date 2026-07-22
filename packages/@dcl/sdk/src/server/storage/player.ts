import { getStorageServerUrl } from '../storage-url'
import { assertIsServer, wrapSignedFetch } from '../utils'
import {
  createStorageConfig,
  GetOptions,
  GetValuesOptions,
  GetValuesResult,
  MODULE_NAME,
  SetOptions,
  StorageConfigState
} from './constants'
import { createValueCache, fingerprint } from './value-cache'

/**
 * Player-scoped storage interface for key-value pairs from the Server Side Storage service.
 * This is NOT filesystem storage - data is stored in the remote storage service.
 */
export interface IPlayerStorage {
  /**
   * Retrieves a value from a player's storage by key from the Server Side Storage service.
   *
   * By default (cacheReads), values read or written during the last cacheMaxAgeMs
   * are served from a local cache without a network request, including confirmed
   * "not found" results. Concurrent gets for the same player and key share one
   * request. Out-of-band writers (e.g. CLI storage commands) may not be visible
   * for up to cacheMaxAgeMs — pass { fresh: true } to force a network read.
   * @param address - The player's wallet address
   * @param key - The key to retrieve
   * @param options - Optional { fresh } to bypass the read cache
   * @returns A promise that resolves to the parsed JSON value, or null if not found
   */
  get<T = unknown>(address: string, key: string, options?: GetOptions): Promise<T | null>

  /**
   * Stores a value in a player's storage in the Server Side Storage service.
   * @param address - The player's wallet address
   * @param key - The key to store the value under
   * @param value - The value to store (will be JSON serialized)
   * @param options - Optional { skipIfUnchanged } to skip the network write when the value is already stored
   * @returns A promise that resolves to true if successful, false otherwise
   */
  set<T = unknown>(address: string, key: string, value: T, options?: SetOptions): Promise<boolean>

  /**
   * Deletes a value from a player's storage in the Server Side Storage service.
   * @param address - The player's wallet address
   * @param key - The key to delete
   * @returns A promise that resolves to true if deleted, false if not found
   */
  delete(address: string, key: string): Promise<boolean>

  /**
   * Returns key-value entries from a player's storage, optionally filtered by prefix.
   * Supports pagination via limit and offset.
   * @param address - The player's wallet address
   * @param options - Optional { prefix, limit, offset } for filtering and pagination.
   * @returns A promise that resolves to { data, pagination: { offset, total } } for pagination UI
   */
  getValues(address: string, options?: GetValuesOptions): Promise<GetValuesResult>
}

/**
 * Creates player-scoped storage that provides methods to interact with
 * player-specific key-value pairs from the Server Side Storage service.
 * This module only works when running on server-side scenes.
 */
export const createPlayerStorage = (config: StorageConfigState = createStorageConfig()): IPlayerStorage => {
  const cache = createValueCache(config)
  // Each in-flight GET is tracked by a wrapper object whose identity marks
  // ownership: set()/delete() drop the wrapper, detaching the pending GET so
  // its stale response cannot overwrite the newer cache entry.
  const inflightGets = new Map<string, { promise: Promise<unknown> }>()

  // Ethereum addresses are case-insensitive (checksum casing only), so
  // mixed-case callers must share the same cache entry. The NUL separator
  // cannot appear in an address, making the pair unambiguous.
  const cacheKey = (address: string, key: string) => `${address.toLowerCase()}\u0000${key}`

  return {
    async get<T = unknown>(address: string, key: string, options?: GetOptions): Promise<T | null> {
      assertIsServer(MODULE_NAME)

      const ck = cacheKey(address, key)

      if (config.cacheReads && !options?.fresh) {
        const entry = cache.get(ck)
        if (entry?.absent) return null
        // Parse per hit so each caller gets a fresh object (no shared mutation).
        if (entry?.body !== undefined) return JSON.parse(entry.body).value as T
      }

      // Coalesce concurrent gets (even fresh ones: an in-flight response is
      // milliseconds old, not TTL-stale) into a single network request.
      const joined = inflightGets.get(ck)
      if (joined) return joined.promise as Promise<T | null>

      const inflight = {} as { promise: Promise<T | null> }
      inflight.promise = (async () => {
        try {
          const baseUrl = await getStorageServerUrl()
          const url = `${baseUrl}/players/${encodeURIComponent(address)}/values/${encodeURIComponent(key)}`

          const [error, data, status] = await wrapSignedFetch<{ value: T }>({ url })

          const isOwner = inflightGets.get(ck) === inflight

          if (error) {
            // A confirmed 404 is a first-class "absent" outcome, not a failure.
            if (status === 404) {
              if (isOwner) cache.setAbsent(ck)
              return null
            }
            console.error(`Failed to get player storage value '${key}' for '${address}': ${error}`)
            return null
          }

          if (data && data.value !== undefined) {
            // Same serialization shape as set()'s PUT body, so a read followed by
            // an unchanged write can be skipped.
            const body = JSON.stringify({ value: data.value })
            if (isOwner) cache.set(ck, { print: fingerprint(body), body })
            return data.value
          }

          // 200 with a missing value is ambiguous: neither a confirmed value
          // nor a confirmed absence, so cache nothing.
          return null
        } finally {
          if (inflightGets.get(ck) === inflight) inflightGets.delete(ck)
        }
      })()

      inflightGets.set(ck, inflight)
      return inflight.promise
    },

    async set<T = unknown>(address: string, key: string, value: T, options?: SetOptions): Promise<boolean> {
      assertIsServer(MODULE_NAME)

      const ck = cacheKey(address, key)
      const body = JSON.stringify({ value })
      const print = fingerprint(body)
      const skipIfUnchanged = options?.skipIfUnchanged ?? config.skipIfUnchanged

      if (skipIfUnchanged && cache.get(ck)?.print === print) {
        return true
      }

      const baseUrl = await getStorageServerUrl()
      const url = `${baseUrl}/players/${encodeURIComponent(address)}/values/${encodeURIComponent(key)}`

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

      // Either way the entry changed server-side (or may have): detach any
      // overlapping in-flight GET so its stale response is not cached.
      inflightGets.delete(ck)

      if (error) {
        // The PUT may have reached the server, so the cached body and
        // fingerprint are no longer reliable.
        cache.delete(ck)
        console.error(`Failed to set player storage value '${key}' for '${address}': ${error}`)
        return false
      }

      cache.set(ck, { print, body })
      return true
    },

    async delete(address: string, key: string): Promise<boolean> {
      assertIsServer(MODULE_NAME)

      const ck = cacheKey(address, key)

      // Invalidate even if the request fails: the DELETE may have reached the
      // server, and a stale "unchanged" skip would lose a future write.
      cache.delete(ck)
      inflightGets.delete(ck)

      const baseUrl = await getStorageServerUrl()
      const url = `${baseUrl}/players/${encodeURIComponent(address)}/values/${encodeURIComponent(key)}`

      const [error, , status] = await wrapSignedFetch({
        url,
        init: {
          method: 'DELETE',
          headers: {}
        }
      })

      // Detach again: a GET may have started while the DELETE was in flight.
      inflightGets.delete(ck)

      if (error) {
        // A 404 still confirms the key is absent server-side.
        if (status === 404) cache.setAbsent(ck)
        console.error(`Failed to delete player storage value '${key}' for '${address}': ${error}`)
        return false
      }

      cache.setAbsent(ck)
      return true
    },

    async getValues(address: string, options?: GetValuesOptions): Promise<GetValuesResult> {
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
      const url = query
        ? `${baseUrl}/players/${encodeURIComponent(address)}/values?${query}`
        : `${baseUrl}/players/${encodeURIComponent(address)}/values`

      const [error, response] = await wrapSignedFetch<GetValuesResult>({ url })

      if (error) {
        console.error(`Failed to get player storage values for '${address}': ${error}`)
        return { data: [], pagination: { offset: 0, total: 0 } }
      }

      const data = response?.data ?? []

      // Seed the per-key cache so subsequent get()/set() on returned keys can
      // skip the network. Absence is never seeded (prefix/pagination make it
      // non-authoritative). A page larger than cacheMaxEntries churns the
      // cache; entries repopulate lazily.
      for (const entry of data) {
        if (entry.value !== undefined) {
          const body = JSON.stringify({ value: entry.value })
          cache.set(cacheKey(address, entry.key), { print: fingerprint(body), body })
        }
      }

      const requestedOffset = offset ?? 0
      const pagination = {
        offset: response?.pagination?.offset ?? requestedOffset,
        total: response?.pagination?.total ?? data.length
      }

      return { data, pagination }
    }
  }
}
