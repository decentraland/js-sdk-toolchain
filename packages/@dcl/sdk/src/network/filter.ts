import {
  TransportMessage,
  PointerEventsResult,
  GltfContainerLoadingState,
  EntityUtils,
  RESERVED_STATIC_ENTITIES,
  CrdtMessageType,
  SyncComponents as _SyncComponents,
  NetworkEntity as _NetworkEntity,
  engine,
  NetworkParent as _NetworkParent
} from '@dcl/ecs'

export function syncFilter(message: Omit<TransportMessage, 'messageBuffer'>) {
  const componentId = (message as any).componentId

  if ([PointerEventsResult.componentId, GltfContainerLoadingState.componentId].includes(componentId)) {
    return false
  }

  const [entityId] = EntityUtils.fromEntityId(message.entityId)

  // filter messages from reserved entities.
  if (entityId < RESERVED_STATIC_ENTITIES) {
    return false
  }

  const NetworkEntity = engine.getComponent(_NetworkEntity.componentId) as typeof _NetworkEntity
  const network = NetworkEntity.getOrNull(message.entityId)
  // Delete Network Entity Always
  if (
    message.type === CrdtMessageType.DELETE_ENTITY_NETWORK ||
    (network && message.type === CrdtMessageType.DELETE_ENTITY)
  ) {
    return true
  }
  const SyncComponents = engine.getComponent(_SyncComponents.componentId) as typeof _SyncComponents
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
