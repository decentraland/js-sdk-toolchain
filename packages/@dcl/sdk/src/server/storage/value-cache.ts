import { DEFAULT_STORAGE_CONFIG, StorageConfigState } from './constants'

/**
 * A cached fact about a key's server-side state.
 * @internal
 */
export interface CacheEntry {
  /**
   * Serialized `{ value }` body; absent for negative entries. Parsed per read
   * hit so callers never share object references, and compared verbatim for
   * write dedup (exact equality — no hash-collision risk).
   */
  body?: string
  /** True when the server confirmed the key does not exist (GET 404 or successful DELETE). */
  absent?: boolean
}

/**
 * Bounded, lazily-expiring cache of key states, backing both write dedup
 * (skip storage writes whose value is already known to be stored) and read
 * caching (serve get() without a network request within the TTL).
 * @internal
 */
export interface ValueCache {
  /** Returns the entry if present and fresh; lazily evicts expired entries. */
  get(key: string): CacheEntry | undefined
  /** Stores or refreshes a known value (serialized body); overwrites negative entries. */
  set(key: string, entry: { body: string }): void
  /** Stores a confirmed-absent (negative) entry, replacing any value entry. */
  setAbsent(key: string): void
  delete(key: string): void
}

export function createValueCache(config: StorageConfigState): ValueCache {
  const entries = new Map<string, CacheEntry & { storedAt: number }>()

  function insert(key: string, entry: CacheEntry): void {
    // Delete + re-insert moves refreshed keys to the end of the Map's
    // insertion order, so eviction below drops the least-recently-written.
    entries.delete(key)
    entries.set(key, { ...entry, storedAt: Date.now() })

    // Guard against misconfiguration: a negative bound would loop forever on
    // an empty map, and a NaN bound would silently disable eviction.
    const maxEntries = Number.isFinite(config.cacheMaxEntries)
      ? Math.max(0, config.cacheMaxEntries)
      : DEFAULT_STORAGE_CONFIG.cacheMaxEntries

    while (entries.size > maxEntries) {
      entries.delete(entries.keys().next().value!)
    }
  }

  return {
    get(key: string): CacheEntry | undefined {
      const entry = entries.get(key)
      if (!entry) return undefined

      // Lazy max-age expiry: storedAt is never refreshed on hits, so the age
      // bounds the time since the last actual network confirmation.
      if (Date.now() - entry.storedAt > config.cacheMaxAgeMs) {
        entries.delete(key)
        return undefined
      }

      return entry
    },

    set(key: string, entry: { body: string }): void {
      insert(key, entry)
    },

    setAbsent(key: string): void {
      insert(key, { absent: true })
    },

    delete(key: string): void {
      entries.delete(key)
    }
  }
}
