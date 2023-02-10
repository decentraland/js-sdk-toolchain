import { ComponentDefinition } from '../../engine/component'

export namespace CrdtUtils {
  export type ComponentID = ComponentDefinition<any>['componentId']

  export enum SynchronizedEntityType {
    // synchronizes entities with the NetworkSynchronized component only, used for networked games
    NETWORKED,
    // synchronizes entities needed by the renderer
    RENDERER
  }
}

export default CrdtUtils

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

  if (typeof a === 'string') {
    return a.localeCompare(b as string)
  }

  return a > b ? 1 : -1
}
