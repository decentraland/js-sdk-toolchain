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
import { createValueCache } from './value-cache'
import { errorMessage } from './error-message'
import { assertPlayerAddress, assertStorageKey, serializeStorageValue } from './serialize'
import { createWriteQueue, SupersedingWriteFailed } from './write-queue'

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
   * A read first waits for writes to the same key that were pending when it was
   * issued, so it reflects every write issued before it.
   * @param address - The player's wallet address
   * @param key - The key to retrieve
   * @param options - Optional { fresh } to bypass the read cache
   * @returns A promise that resolves to the parsed JSON value, or null if not found
   * @throws Error if the read fails, so a failure is never mistaken for a missing key
   * @throws TypeError if the address or key is invalid
   */
  get<T = unknown>(address: string, key: string, options?: GetOptions): Promise<T | null>

  /**
   * Stores a value in a player's storage in the Server Side Storage service.
   * @param address - The player's wallet address
   * @param key - The key to store the value under
   * @param value - The value to store (will be JSON serialized)
   * @param options - Optional { skipIfUnchanged } to skip the network write when the value is already stored
   * @returns true once stored, or once a newer write that replaced this one lands
   * (rapid writes coalesce); false if the write, or its replacement, fails
   * @throws TypeError if the address or key is invalid, or the value cannot be stored unchanged: undefined,
   * circular, a BigInt, or containing a function, a symbol, a non-finite number, an undefined array
   * element or hole, a Map, Set, typed array or other built-in with no JSON form, or text with an
   * unpaired surrogate or a NUL character. An undefined object property is dropped; a Date is
   * stored as its ISO string and a class instance as its own enumerable data.
   */
  set<T = unknown>(address: string, key: string, value: T, options?: SetOptions): Promise<boolean>

  /**
   * Deletes a value from a player's storage in the Server Side Storage service.
   * @param address - The player's wallet address
   * @param key - The key to delete
   * @returns true once applied, or once a newer write that replaced it lands;
   * false only for a confirmed 404
   * @throws Error if the delete, or its replacement, fails; a failure is never reported as absence
   * @throws TypeError if the address or key is invalid
   */
  delete(address: string, key: string): Promise<boolean>

  /**
   * Returns key-value entries from a player's storage, optionally filtered by prefix.
   * Supports pagination via limit and offset.
   * @param address - The player's wallet address
   * @param options - Optional { prefix, limit, offset } for filtering and pagination.
   * @returns A promise that resolves to { data, pagination: { offset, total } } for pagination UI
   * @throws Error if the read fails, so a failure is never mistaken for an empty page
   * @throws TypeError if the address is invalid
   */
  getValues(address: string, options?: GetValuesOptions): Promise<GetValuesResult>
}

/**
 * Creates player-scoped storage that provides methods to interact with
 * player-specific key-value pairs from the Server Side Storage service.
 * This module only works when running on server-side scenes.
 * @internal
 */
export const createPlayerStorage = (config: StorageConfigState = createStorageConfig()): IPlayerStorage => {
  const cache = createValueCache(config)
  // Each in-flight GET is tracked by a wrapper object whose identity marks
  // ownership: a landed write detaches the pending GET so its stale response is not cached.
  const inflightGets = new Map<string, { promise: Promise<unknown> }>()

  // Lowercased so checksummed callers share an entry; a JSON pair cannot collide.
  const cacheKey = (address: string, key: string) => JSON.stringify([address.toLowerCase(), key])

  // Writes to the same player key are serialized (and rapid ones coalesced to
  // the latest value) so the service commits them in issue order — overlapping
  // PUTs would otherwise leave both the kept value and the cached value to
  // response-order chance. Keyed by the same case-insensitive cache key.
  const writes = createWriteQueue()

  async function executeSet(address: string, key: string, ck: string, body: string): Promise<boolean> {
    let baseUrl: string
    try {
      baseUrl = await getStorageServerUrl()
    } catch (error) {
      cache.delete(ck)
      console.error(`Failed to set player storage value '${key}' for '${address}': ${errorMessage(error)}`)
      return false
    }
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
      // The PUT may have reached the server, so the cached body is no
      // longer reliable.
      cache.delete(ck)
      return false
    }

    cache.set(ck, { body })
    return true
  }

  async function executeDelete(address: string, key: string, ck: string): Promise<boolean> {
    let baseUrl: string
    try {
      baseUrl = await getStorageServerUrl()
    } catch (error) {
      cache.delete(ck)
      throw new Error(`Failed to delete player storage value '${key}' for '${address}': ${errorMessage(error)}`)
    }
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
      if (status === 404) {
        cache.setAbsent(ck)
        return false
      }
      // The DELETE may have reached the server, so the cached body is unreliable.
      cache.delete(ck)
      throw new Error(`Failed to delete player storage value '${key}' for '${address}': ${errorMessage(error)}`)
    }

    cache.setAbsent(ck)
    return true
  }

  return {
    async get<T = unknown>(address: string, key: string, options?: GetOptions): Promise<T | null> {
      assertIsServer(MODULE_NAME)
      assertPlayerAddress(address, 'Storage.player.get()')
      assertStorageKey(key, 'Storage.player.get()')

      const ck = cacheKey(address, key)

      if (writes.isPending(ck)) await writes.settled(ck)

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
          let baseUrl: string
          try {
            baseUrl = await getStorageServerUrl()
          } catch (error) {
            throw new Error(`Failed to get player storage value '${key}' for '${address}': ${errorMessage(error)}`)
          }
          const url = `${baseUrl}/players/${encodeURIComponent(address)}/values/${encodeURIComponent(key)}`

          const [error, data, status] = await wrapSignedFetch<{ value: T }>({ url })

          const isOwner = inflightGets.get(ck) === inflight

          if (error) {
            // A confirmed 404 is a first-class "absent" outcome, not a failure.
            if (status === 404) {
              if (isOwner) cache.setAbsent(ck)
              return null
            }
            throw new Error(`Failed to get player storage value '${key}' for '${address}': ${errorMessage(error)}`)
          }

          // wrapSignedFetch parses an empty 2xx body as {}: a missing value is a fault, not an absence.
          if (!data || data.value === undefined) {
            throw new Error(`Failed to get player storage value '${key}' for '${address}': response carried no value`)
          }

          // Same serialization shape as set()'s PUT body, so a read followed by
          // an unchanged write can be skipped.
          const body = JSON.stringify({ value: data.value })
          if (isOwner) cache.set(ck, { body })
          return data.value
        } finally {
          if (inflightGets.get(ck) === inflight) inflightGets.delete(ck)
        }
      })()

      inflightGets.set(ck, inflight)
      return inflight.promise
    },

    async set<T = unknown>(address: string, key: string, value: T, options?: SetOptions): Promise<boolean> {
      assertIsServer(MODULE_NAME)
      assertPlayerAddress(address, 'Storage.player.set()')
      assertStorageKey(key, 'Storage.player.set()')

      const ck = cacheKey(address, key)
      const body = serializeStorageValue(value, `Storage.player.set('${address}', '${key}')`)
      const skipIfUnchanged = options?.skipIfUnchanged ?? config.skipIfUnchanged

      // Dedup against confirmed state only while no write is pending — a
      // pending write makes the cache momentarily stale; enqueue() coalesces
      // against pending writes instead.
      if (skipIfUnchanged && writes.pending(ck) === undefined && cache.get(ck)?.body === body) {
        return true
      }

      return writes.enqueue(ck, body, (b) => executeSet(address, key, ck, b as string), skipIfUnchanged)
    },

    async delete(address: string, key: string): Promise<boolean> {
      assertIsServer(MODULE_NAME)
      assertPlayerAddress(address, 'Storage.player.delete()')
      assertStorageKey(key, 'Storage.player.delete()')

      const ck = cacheKey(address, key)

      return writes
        .enqueue(ck, null, () => executeDelete(address, key, ck), true)
        .catch((error: unknown) => {
          if (error instanceof SupersedingWriteFailed) {
            throw new Error(`Failed to delete player storage value '${key}' for '${address}': ${error.message}`)
          }
          throw error
        })
    },

    async getValues(address: string, options?: GetValuesOptions): Promise<GetValuesResult> {
      assertIsServer(MODULE_NAME)
      assertPlayerAddress(address, 'Storage.player.getValues()')

      const { prefix, limit, offset } = options ?? {}
      let baseUrl: string
      try {
        baseUrl = await getStorageServerUrl()
      } catch (error) {
        throw new Error(`Failed to get player storage values for '${address}': ${errorMessage(error)}`)
      }
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

      const watcher = cache.watch()
      const [error, response] = await wrapSignedFetch<GetValuesResult>({ url })
      watcher.stop()

      if (error) {
        throw new Error(`Failed to get player storage values for '${address}': ${errorMessage(error)}`)
      }

      const data = response?.data
      if (!Array.isArray(data)) {
        throw new Error(`Failed to get player storage values for '${address}': response carried no data array`)
      }
      if (data.some((entry) => typeof entry?.key !== 'string' || entry.value === undefined)) {
        throw new Error(`Failed to get player storage values for '${address}': response carried a malformed entry`)
      }

      // Seed the per-key cache so subsequent get()/set() on returned keys can
      // skip the network. Only keys with no live entry and no pending write
      // are seeded: existing per-key state comes from a confirmed operation
      // that this page snapshot — whose request started earlier — must not
      // clobber with stale data. Absence is never seeded (prefix/pagination
      // make it non-authoritative). A page larger than cacheMaxEntries churns
      // the cache; entries repopulate lazily.
      for (const entry of data) {
        const ck = cacheKey(address, entry.key)
        if (watcher.mutated(ck) || writes.isPending(ck) || inflightGets.has(ck)) continue
        if (cache.get(ck) === undefined) {
          cache.set(ck, { body: JSON.stringify({ value: entry.value }) })
        }
      }

      const requestedOffset = offset ?? 0
      const pagination = {
        offset: response!.pagination?.offset ?? requestedOffset,
        total: response!.pagination?.total ?? data.length
      }

      return { data, pagination }
    }
  }
}
