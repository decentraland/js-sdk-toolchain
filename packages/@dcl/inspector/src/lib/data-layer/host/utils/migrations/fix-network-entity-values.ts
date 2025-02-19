import { Entity, IEngine } from '@dcl/ecs'
import { CoreComponents, SdkComponents } from '../../../../sdk/components'
import { INSPECTOR_ENUM_ENTITY_ID_START } from '../../../../sdk/enum-entity'

/**
 * Fixes duplicate entity IDs in NetworkEntity components within the engine.
 *
 * This function scans through all entities that have the NetworkEntity component
 * and identifies any duplicate entity IDs. If duplicates are found, it reassigns
 * unique entity IDs to each NetworkEntity component to ensure all entity IDs are unique.
 */
export function fixNetworkEntityValues(engine: IEngine) {
  const NetworkEntity = engine.getComponentOrNull(CoreComponents.NETWORK_ENTITY) as SdkComponents['NetworkEntity']

  function needsFixing(): boolean {
    const usedEntities: Set<Entity> = new Set()
    for (const [_, value] of engine.getEntitiesWith(NetworkEntity)) {
      if (usedEntities.has(value.entityId)) {
        return true
      }
      usedEntities.add(value.entityId)
    }
    return false
  }

  if (!NetworkEntity || !needsFixing()) return

  let lastEntityId = INSPECTOR_ENUM_ENTITY_ID_START
  for (const [entity] of engine.getEntitiesWith(NetworkEntity)) {
    NetworkEntity.getMutable(entity).entityId = lastEntityId as Entity
    lastEntityId++
  }

  void engine.update(1)
}
