import { StorageConfigState } from './constants'

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
 * Bounded, lazily-expiring cache of value fingerprints, used to skip storage
 * writes whose value is already known to be stored.
 * @internal
 */
export interface ValueCache {
  /** Returns the stored fingerprint if present and fresh; lazily evicts expired entries. */
  get(key: string): string | undefined
  /** Stores or refreshes a fingerprint; evicts oldest entries beyond cacheMaxEntries. */
  set(key: string, print: string): void
  delete(key: string): void
}

export function createValueCache(config: StorageConfigState): ValueCache {
  const entries = new Map<string, { print: string; storedAt: number }>()

  return {
    get(key: string): string | undefined {
      const entry = entries.get(key)
      if (!entry) return undefined

      // Lazy max-age expiry: storedAt is never refreshed on hits, so the age
      // bounds the time since the last actual network confirmation.
      if (Date.now() - entry.storedAt > config.cacheMaxAgeMs) {
        entries.delete(key)
        return undefined
      }

      return entry.print
    },

    set(key: string, print: string): void {
      // Delete + re-insert moves refreshed keys to the end of the Map's
      // insertion order, so eviction below drops the least-recently-written.
      entries.delete(key)
      entries.set(key, { print, storedAt: Date.now() })

      while (entries.size > config.cacheMaxEntries) {
        entries.delete(entries.keys().next().value!)
      }
    },

    delete(key: string): void {
      entries.delete(key)
    }
  }
}
