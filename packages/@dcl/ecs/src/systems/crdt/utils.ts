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
 * @public
 * @returns 0 if is the same data, 1 if a > b, -1 if b > a
 */
export function dataCompare<T>(a: T, b: T): number {
  // At reference level
  if (a === b) return 0
  if (a === null && b !== null) return -1
  if (a !== null && b === null) return 1

  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    const lengthDifference: number = a.byteLength - b.byteLength
    if (lengthDifference !== 0) {
      return lengthDifference > 0 ? 1 : -1
    }

    let res: number
    for (let i = 0, n = a.byteLength; i < n; i++) {
      res = a[i] - b[i]
      if (res !== 0) {
        return res > 0 ? 1 : -1
      }
    }

    // the data is exactly the same
    return 0
  }

  if (typeof a === 'string') {
    const lengthDifference: number = a.length - (b as string).length
    if (lengthDifference !== 0) {
      return lengthDifference > 0 ? 1 : -1
    }

    return a.localeCompare(b as string)
  }

  return a > b ? 1 : -1
}
