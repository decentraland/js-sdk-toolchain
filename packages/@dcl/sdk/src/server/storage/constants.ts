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
 * Per-call options for Storage set().
 */
export interface SetOptions {
  /**
   * When true, skips the network write if the serialized value matches the
   * last value known to be stored for this key (from a previous successful
   * set() or get()). Overrides the configured default. Default: false.
   */
  skipIfUnchanged?: boolean
}

/**
 * Module-wide configuration for Storage, applied to both scene-scoped and
 * player-scoped storage via Storage.configure().
 */
export interface StorageOptions {
  /** Default for set()'s skipIfUnchanged when not passed per call. Default: false. */
  skipIfUnchanged?: boolean
  /** Max cached value fingerprints per scope (scene / player) before oldest entries are evicted. Default: 512. */
  cacheMaxEntries?: number
  /** Max age of a cache entry in milliseconds; older entries are treated as unknown ("changed"). Default: 300000 (5 minutes). */
  cacheMaxAgeMs?: number
}

/**
 * Fully-resolved storage configuration shared by scene and player storage.
 * @internal
 */
export interface StorageConfigState {
  skipIfUnchanged: boolean
  cacheMaxEntries: number
  cacheMaxAgeMs: number
}

export const DEFAULT_STORAGE_CONFIG: Readonly<StorageConfigState> = {
  skipIfUnchanged: false,
  cacheMaxEntries: 512,
  cacheMaxAgeMs: 5 * 60 * 1000
}

/**
 * Creates a mutable config object, later mutated by Storage.configure().
 * @internal
 */
export function createStorageConfig(overrides?: StorageOptions): StorageConfigState {
  return { ...DEFAULT_STORAGE_CONFIG, ...overrides }
}
