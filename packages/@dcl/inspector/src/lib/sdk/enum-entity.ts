import { Entity, IEngine, NetworkEntity as NetworkEntityEngine } from '@dcl/ecs'

import { CoreComponents } from './components'

export function createEnumEntityId(engine: IEngine) {
  const NetworkEntity = engine.getComponent(CoreComponents.NETWORK_ENTITY) as typeof NetworkEntityEngine
  let enumEntityId: Entity = 3333 as Entity

  for (const [_, component] of engine.getEntitiesWith(NetworkEntity)) {
    enumEntityId = Math.max(enumEntityId, component.entityId) as Entity
  }

  function getEnumEntityId(): Entity {
    return enumEntityId
  }

  function getNextEnumEntityId(): Entity {
    return ++enumEntityId as Entity
  }

  return {
    getEnumEntityId,
    getNextEnumEntityId
  }
}

export type EnumEntity = ReturnType<typeof createEnumEntityId>
