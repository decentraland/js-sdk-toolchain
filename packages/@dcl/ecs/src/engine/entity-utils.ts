import { IEntity } from './entity'

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
    DYNAMIC_ENTITIES_START_AT - 1
  ]

  export const DYNAMIC_ENTITIES_RANGE: EntityRange = [
    DYNAMIC_ENTITIES_START_AT,
    MAX_ENTITIES
  ]

  function isInRange(entity: IEntity, range: EntityRange): boolean {
    return entity >= range[0] && entity <= range[1]
  }

  export function isDynamicEntity(entity: IEntity) {
    return isInRange(entity, DYNAMIC_ENTITIES_RANGE)
  }

  export function isStaticEntity(entity: IEntity) {
    return isInRange(entity, STATIC_ENTITIES_RANGE)
  }

  export function isReservedEntity(entity: IEntity) {
    return isInRange(entity, RESERVED_ENTITIES_RANGE)
  }
}

export default EntityUtils
