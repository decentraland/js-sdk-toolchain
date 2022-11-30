import { Entity } from './entity'

export namespace EntityUtils {
  /**
   * Range is the first element and the last possible element, they both are included in the interval.
   * [start, end]
   */
  export type EntityRange = readonly [number, number]

  export const MAX_ENTITIES = 0xffffffff
  export const DYNAMIC_ENTITIES_START_AT = 100e3
  export const RESERVED_STATIC_ENTITIES = 512

  export const RESERVED_ENTITIES_RANGE: EntityRange = [
    0,
    RESERVED_STATIC_ENTITIES - 1
  ]

  export const STATIC_ENTITIES_RANGE: EntityRange = [
    RESERVED_STATIC_ENTITIES,
    MAX_ENTITIES
    // DYNAMIC_ENTITIES_START_AT - 1
  ]

  export const DYNAMIC_ENTITIES_RANGE: EntityRange = [
    DYNAMIC_ENTITIES_START_AT,
    MAX_ENTITIES
  ]

  function isInRange(entity: Entity, range: EntityRange): boolean {
    return (entity as number) >= range[0] && (entity as number) <= range[1]
  }

  // @internal
  export function isDynamicEntity(entity: Entity) {
    return isInRange(entity, DYNAMIC_ENTITIES_RANGE)
  }

  export function isStaticEntity(entity: Entity) {
    return isInRange(entity, STATIC_ENTITIES_RANGE)
  }

  export function isReservedEntity(entity: Entity) {
    return isInRange(entity, RESERVED_ENTITIES_RANGE)
  }
}

export default EntityUtils
