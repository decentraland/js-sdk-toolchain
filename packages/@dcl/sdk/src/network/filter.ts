import {
  TransportMessage,
  EntityUtils,
  RESERVED_STATIC_ENTITIES,
  CrdtMessageType,
  SyncComponents as _SyncComponents,
  NetworkEntity as _NetworkEntity,
  NetworkParent as _NetworkParent,
  IEngine
} from '@dcl/ecs'
import { NOT_SYNC_COMPONENTS_IDS } from './state'

export function syncFilter(engine: IEngine) {
  const NetworkEntity = engine.getComponent(_NetworkEntity.componentId) as typeof _NetworkEntity
  const SyncComponents = engine.getComponent(_SyncComponents.componentId) as typeof _SyncComponents

  return function (message: Omit<TransportMessage, 'messageBuffer'>) {
    const componentId = (message as any).componentId

    if (NOT_SYNC_COMPONENTS_IDS.includes(componentId)) {
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

    // First component
    if ((message as any).timestamp <= 1) {
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
