const globalBuffer = (globalThis as any).Buffer

export * from './types'

/**
 * Compare raw data.
 * @internal
 * @returns 0 if is the same data, 1 if a > b, -1 if b > a
 */
export function dataCompare<T>(a: T, b: T): number {
  // At reference level
  if (a === b) return 0
  if (a === null && b !== null) return -1
  if (a !== null && b === null) return 1

  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    let res: number
    const n = a.byteLength > b.byteLength ? b.byteLength : a.byteLength
    for (let i = 0; i < n; i++) {
      res = a[i] - b[i]
      if (res !== 0) {
        return res > 0 ? 1 : -1
      }
    }
    res = a.byteLength - b.byteLength
    return res > 0 ? 1 : res < 0 ? -1 : 0
  }

  if (globalBuffer) {
    /* istanbul ignore next */
    if (a instanceof globalBuffer && b instanceof globalBuffer) {
      /* istanbul ignore next */
      return (a as any).compare(b)
    }
  }

  if (typeof a === 'string') {
    return a.localeCompare(b as string)
  }

  return a > b ? 1 : -1
}

export type EntityUtils = {
  /**
   * Convert from entityId to the tuple [entityNumber, entityVersion]
   * @param entityId compound number entityId
   */
  fromEntityId(entityId: number): [number, number]

  /**
   * Convert tuple [entityNumber, entityVersion] to entityId compound number
   * @param entityNumber number part
   * @param entityVersion version part
   */
  toEntityId(entityNumber: number, entityVersion: number): number
}
