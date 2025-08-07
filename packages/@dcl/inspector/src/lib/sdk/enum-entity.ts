import { Entity, IEngine } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'

export const INSPECTOR_ENUM_ENTITY_ID_START: Entity = 8001 as Entity
export function createEnumEntityId(engine: IEngine) {
  const NetworkEntity = components.NetworkEntity(engine)

  function getNextEnumEntityId(): Entity {
    let value: Entity = INSPECTOR_ENUM_ENTITY_ID_START
    for (const [, component] of engine.getEntitiesWith(NetworkEntity)) {
      value = Math.max(value, Number(component.entityId)) as Entity
    }
    return (value + 1) as Entity
  }

  return {
    getNextEnumEntityId
  }
}

export type EnumEntity = ReturnType<typeof createEnumEntityId>
