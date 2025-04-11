import { Entity, IEngine } from '@dcl/ecs'
import { getNextEnumEntityId, ENUM_ENTITY_ID_START } from '@dcl/asset-packs'

export function createEnumEntityId(engine: IEngine) {
  function wrapper() {
    return getNextEnumEntityId(engine)
  }

  return {
    getNextEnumEntityId: wrapper
  }
}

export type EnumEntity = ReturnType<typeof createEnumEntityId>
export const INSPECTOR_ENUM_ENTITY_ID_START: Entity = ENUM_ENTITY_ID_START
