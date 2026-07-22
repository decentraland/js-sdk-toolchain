export const MODULE_NAME = 'Storage'

/**
 * Options for getValues pagination and filtering.
 */
export interface GetValuesOptions {
  prefix?: string
  limit?: number
  offset?: number
}

/**
 * Result of getValues with pagination metadata.
 */
export interface GetValuesResult {
  /** Key-value entries for the current page. */
  data: Array<{ key: string; value: unknown }>
  pagination: {
    offset: number
    total: number
  }
}

/**
 * Per-call options for Storage get().
 */
export interface GetOptions {
  /**
   * When true, bypasses the read cache and forces a network read (the result
   * still refreshes the cache). Concurrent gets for the same key still share
   * one in-flight request. Default: false.
   */
  fresh?: boolean
}

/**
 * Per-call options for Storage set().
 */
export interface SetOptions {
  /**
   * When true, skips the network write if the serialized value matches the
   * last value known to be stored for this key (from a previous successful
   * set() or get()). Overrides the configured default. Default: true.
   */
  skipIfUnchanged?: boolean
}

/**
 * Module-wide configuration for Storage, applied to both scene-scoped and
 * player-scoped storage via Storage.configure().
 */
export interface StorageOptions {
  /**
   * Default for set()'s skipIfUnchanged when not passed per call. A skip only
   * suppresses a proven no-op: the exact serialized value was confirmed stored
   * by a previous network round-trip within cacheMaxAgeMs. Default: true.
   */
  skipIfUnchanged?: boolean
  /**
   * When true, get() serves values from the local cache within cacheMaxAgeMs,
   * including confirmed "not found" results, without a network request.
   * Out-of-band writers (e.g. CLI storage commands) may not be visible for up
   * to cacheMaxAgeMs; pass { fresh: true } per call to force a network read.
   * Default: true.
   */
  cacheReads?: boolean
  /**
   * Max cache entries per scope (scene / player) before oldest entries are
   * evicted. Entries hold the serialized value body, so memory scales with
   * value size — this bounds entry count, not bytes. Default: 512.
   */
  cacheMaxEntries?: number
  /**
   * Max age of a cache entry in milliseconds, bounding both read-cache
   * staleness and write-dedup trust; older entries are treated as unknown.
   * Default: 900000 (15 minutes).
   */
  cacheMaxAgeMs?: number
}

/**
 * Fully-resolved storage configuration shared by scene and player storage.
 * @internal
 */
export interface StorageConfigState {
  skipIfUnchanged: boolean
  cacheReads: boolean
  cacheMaxEntries: number
  cacheMaxAgeMs: number
}

export const DEFAULT_STORAGE_CONFIG: Readonly<StorageConfigState> = {
  skipIfUnchanged: true,
  cacheReads: true,
  cacheMaxEntries: 512,
  cacheMaxAgeMs: 15 * 60 * 1000
}

/**
 * Creates a mutable config object, later mutated by Storage.configure().
 * @internal
 */
export function createStorageConfig(overrides?: StorageOptions): StorageConfigState {
  return { ...DEFAULT_STORAGE_CONFIG, ...overrides }
}
