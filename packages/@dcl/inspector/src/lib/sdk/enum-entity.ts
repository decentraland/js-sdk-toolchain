import { Entity, IEngine, NetworkEntity as NetworkEntityEngine } from '@dcl/ecs'

import { CoreComponents } from './components'

export const INSPECTOR_ENUM_ENTITY_ID_START: Entity = 8001 as Entity
export function createEnumEntityId(engine: IEngine) {
  const NetworkEntity = engine.getComponent(CoreComponents.NETWORK_ENTITY) as typeof NetworkEntityEngine

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
