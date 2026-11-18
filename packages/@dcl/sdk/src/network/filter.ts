import {
  TransportMessage,
  EntityUtils,
  RESERVED_STATIC_ENTITIES,
  CrdtMessageType,
  SyncComponents as _SyncComponents,
  NetworkEntity as _NetworkEntity,
  NetworkParent as _NetworkParent,
  IEngine,
  Entity
} from '@dcl/ecs'
import { shouldSyncComponent } from './state'

export function syncFilter(engine: IEngine, createdEntities: Set<Entity>, flushedEntities: Set<Entity>) {
  const NetworkEntity = engine.getComponent(_NetworkEntity.componentId) as typeof _NetworkEntity
  const SyncComponents = engine.getComponent(_SyncComponents.componentId) as typeof _SyncComponents

  return function (message: Omit<TransportMessage, 'messageBuffer'>) {
    const componentId = (message as any).componentId
    const component = componentId ? engine.getComponentOrNull(componentId) : null
    if (component && !shouldSyncComponent(component)) {
      return false
    }

    const [entityId] = EntityUtils.fromEntityId(message.entityId)

    // filter messages from reserved entities.
    if (entityId < RESERVED_STATIC_ENTITIES) {
      return false
    }

    const network = NetworkEntity.getOrNull(message.entityId)
    // Delete Network Entity Always
    if (
      message.type === CrdtMessageType.DELETE_ENTITY_NETWORK ||
      (network && message.type === CrdtMessageType.DELETE_ENTITY)
    ) {
      return true
    }

    const sync = SyncComponents.getOrNull(message.entityId)
    if (!sync) return false

    // In the tick it calls syncEntity, the creator sends every component so peers get the full initial state
    if (createdEntities.has(message.entityId)) {
      flushedEntities.add(message.entityId)
      return true
    }

    if (componentId === NetworkEntity.componentId) {
      return false
    }

    // If there is a change in the network parent or syncComponents we should always sync
    if (componentId === _NetworkParent.componentId || componentId === SyncComponents.componentId) {
      return true
    }

    if (componentId && sync.componentIds.includes(componentId)) {
      return true
    }

    return false
  }
}
