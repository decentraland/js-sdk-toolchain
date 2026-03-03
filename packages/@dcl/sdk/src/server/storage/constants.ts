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
