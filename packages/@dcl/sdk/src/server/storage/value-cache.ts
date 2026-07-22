import { DEFAULT_STORAGE_CONFIG, StorageConfigState } from './constants'

/**
 * 32-bit FNV-1a hash over a string. The scene runtime (QuickJS) has no native
 * crypto, so a cheap JS hash is used to fingerprint serialized values.
 * @internal
 */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * Cheap fingerprint of a serialized body: fnv1a hash plus length. The length
 * guards against hash collisions between same-key values.
 * @internal
 */
export function fingerprint(serialized: string): string {
  return `${fnv1a(serialized).toString(16)}:${serialized.length}`
}

/**
 * A cached fact about a key's server-side state.
 * @internal
 */
export interface CacheEntry {
  /** Write-dedup fingerprint of the serialized body; absent for negative entries. */
  print?: string
  /** Serialized `{ value }` body; parsed per read hit so callers never share object references. */
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
  /** Stores or refreshes a known value (fingerprint + serialized body); overwrites negative entries. */
  set(key: string, entry: { print: string; body: string }): void
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

    set(key: string, entry: { print: string; body: string }): void {
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
