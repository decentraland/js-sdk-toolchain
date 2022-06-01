import { Entity } from './entity'

export namespace EntityUtils {
  export const MAX_ENTITIES = 10000

  let offset: number = MAX_ENTITIES
  export function getOffset() {
    const off = offset + 1
    offset += MAX_ENTITIES
    return off
  }

  const STATIC_ENTITIES = [0, MAX_ENTITIES]
  export function isStaticEntity(entity: Entity) {
    const [min, max] = STATIC_ENTITIES
    return entity >= min && entity <= max
  }
}

export default EntityUtils
