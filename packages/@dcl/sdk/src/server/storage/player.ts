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
import { serializeStorageValue } from './serialize'
import { createWriteQueue, SupersededWriteFailed } from './write-queue'

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
   * A read issued while a write to the same key is in flight waits for that
   * write to land first, so it never answers with a value older than what the
   * caller has already written. Writes issued after the read are not awaited.
   * @param address - The player's wallet address
   * @param key - The key to retrieve
   * @param options - Optional { fresh } to bypass the read cache
   * @returns A promise that resolves to the parsed JSON value, or null if not found
   * @throws Error if the read fails, so a failure is never mistaken for a missing key
   */
  get<T = unknown>(address: string, key: string, options?: GetOptions): Promise<T | null>

  /**
   * Stores a value in a player's storage in the Server Side Storage service.
   * @param address - The player's wallet address
   * @param key - The key to store the value under
   * @param value - The value to store (will be JSON serialized)
   * @param options - Optional { skipIfUnchanged } to skip the network write when the value is already stored
   * @returns A promise that resolves to true once the value is stored, or once a
   * newer write to the same key, issued before this one was sent, took its place
   * and landed (rapid writes coalesce). false when the write failed.
   * @throws TypeError if the value is undefined, a function or a symbol, contains a
   * function or a symbol at any depth, or is circular. Undefined properties inside
   * the value are dropped, as JSON.stringify does.
   */
  set<T = unknown>(address: string, key: string, value: T, options?: SetOptions): Promise<boolean>

  /**
   * Deletes a value from a player's storage in the Server Side Storage service.
   * @param address - The player's wallet address
   * @param key - The key to delete
   * @returns A promise that resolves to true once the delete is applied, or once a
   * newer write to the key, issued before this one was sent, took its place and
   * landed (rapid writes coalesce). false only when the service confirmed the key
   * was already absent (404); the delete is idempotent, so true is the usual
   * answer for a missing key.
   * @throws Error if the delete fails, so a failure is never reported as an absence
   */
  delete(address: string, key: string): Promise<boolean>

  /**
   * Returns key-value entries from a player's storage, optionally filtered by prefix.
   * Supports pagination via limit and offset.
   * @param address - The player's wallet address
   * @param options - Optional { prefix, limit, offset } for filtering and pagination.
   * @returns A promise that resolves to { data, pagination: { offset, total } } for pagination UI
   * @throws Error if the read fails, so a failure is never mistaken for an empty page
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
  // ownership: set()/delete() drop the wrapper, detaching the pending GET so
  // its stale response cannot overwrite the newer cache entry.
  const inflightGets = new Map<string, { promise: Promise<unknown> }>()

  // Ethereum addresses are case-insensitive (checksum casing only), so
  // mixed-case callers must share the same cache entry. The NUL separator
  // cannot appear in an address, making the pair unambiguous.
  const cacheKey = (address: string, key: string) => `${address.toLowerCase()}\u0000${key}`

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
      console.error(`Failed to set player storage value '${key}' for '${address}': ${error}`)
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
      console.error(`Failed to set player storage value '${key}' for '${address}': ${error}`)
      return false
    }

    // A newer write may be queued behind this one; caching this body would serve it until that lands.
    if (writes.pending(ck) === body) cache.set(ck, { body })
    return true
  }

  async function executeDelete(address: string, key: string, ck: string): Promise<boolean> {
    let baseUrl: string
    try {
      baseUrl = await getStorageServerUrl()
    } catch (error) {
      cache.delete(ck)
      throw new Error(`Failed to delete player storage value '${key}' for '${address}': ${error}`)
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
        if (writes.pending(ck) === null) cache.setAbsent(ck)
        return false
      }
      // The DELETE may have reached the server, so the cached body is unreliable.
      cache.delete(ck)
      throw new Error(`Failed to delete player storage value '${key}' for '${address}': ${error}`)
    }

    if (writes.pending(ck) === null) cache.setAbsent(ck)
    return true
  }

  return {
    async get<T = unknown>(address: string, key: string, options?: GetOptions): Promise<T | null> {
      assertIsServer(MODULE_NAME)

      const ck = cacheKey(address, key)

      // Writes issued before this read land first, so the read reflects them.
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
          const baseUrl = await getStorageServerUrl()
          const url = `${baseUrl}/players/${encodeURIComponent(address)}/values/${encodeURIComponent(key)}`

          const [error, data, status] = await wrapSignedFetch<{ value: T }>({ url })

          // A response that lands while a write is pending may predate that write; the write refreshes the cache when it completes.
          const cacheable = inflightGets.get(ck) === inflight && !writes.isPending(ck)

          if (error) {
            // A confirmed 404 is a first-class "absent" outcome, not a failure.
            if (status === 404) {
              if (cacheable) cache.setAbsent(ck)
              return null
            }
            throw new Error(`Failed to get player storage value '${key}' for '${address}': ${error}`)
          }

          // wrapSignedFetch parses an empty 2xx body as {}: a missing value is a fault, not an absence.
          if (!data || data.value === undefined) {
            console.error(`Failed to get player storage value '${key}' for '${address}': response carried no value`)
            throw new Error(`Failed to get player storage value '${key}' for '${address}': response carried no value`)
          }

          // Same serialization shape as set()'s PUT body, so a read followed by
          // an unchanged write can be skipped.
          const body = JSON.stringify({ value: data.value })
          if (cacheable) cache.set(ck, { body })
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

      const ck = cacheKey(address, key)
      const body = serializeStorageValue(value, `Storage.player.set('${address}', '${key}')`)
      const skipIfUnchanged = options?.skipIfUnchanged ?? config.skipIfUnchanged

      // Dedup against confirmed state only while no write is pending — a
      // pending write makes the cache momentarily stale; enqueue() coalesces
      // against pending writes instead.
      if (skipIfUnchanged && writes.pending(ck) === undefined && cache.get(ck)?.body === body) {
        return true
      }

      // Until the PUT lands, neither the old nor the new value can be served for this key.
      cache.delete(ck)
      inflightGets.delete(ck)

      return writes.enqueue(ck, body, (b) => executeSet(address, key, ck, b as string), skipIfUnchanged)
    },

    async delete(address: string, key: string): Promise<boolean> {
      assertIsServer(MODULE_NAME)

      const ck = cacheKey(address, key)

      // Invalidate immediately — even while the DELETE waits behind other
      // writes, reads must not serve the doomed value, and a stale
      // "unchanged" skip would lose a future write.
      cache.delete(ck)
      inflightGets.delete(ck)

      return writes
        .enqueue(ck, null, () => executeDelete(address, key, ck), true)
        .catch((error: unknown) => {
          if (error instanceof SupersededWriteFailed) {
            throw new Error(`Failed to delete player storage value '${key}' for '${address}': ${error.message}`)
          }
          throw error
        })
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

      const watcher = cache.watch()
      let error: string | null
      let response: GetValuesResult | null
      try {
        ;[error, response] = await wrapSignedFetch<GetValuesResult>({ url })
      } finally {
        watcher.stop()
      }

      if (error) {
        throw new Error(`Failed to get player storage values for '${address}': ${error}`)
      }

      const data = response?.data
      if (!Array.isArray(data)) {
        console.error(`Failed to get player storage values for '${address}': response carried no data array`)
        throw new Error(`Failed to get player storage values for '${address}': response carried no data array`)
      }
      if (data.some((entry) => typeof entry?.key !== 'string' || entry.value === undefined)) {
        console.error(`Failed to get player storage values for '${address}': response carried a malformed entry`)
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
        // A key mutated while the page was in flight must not be re-seeded from the snapshot.
        if (watcher.mutated(ck) || writes.isPending(ck) || inflightGets.has(ck)) continue
        if (cache.get(ck) === undefined) {
          cache.set(ck, { body: JSON.stringify({ value: entry.value }) })
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
