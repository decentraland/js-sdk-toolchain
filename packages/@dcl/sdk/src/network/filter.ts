import {
  TransportMessage,
  PointerEventsResult,
  GltfContainerLoadingState,
  EntityUtils,
  RESERVED_STATIC_ENTITIES,
  CrdtMessageType,
  SyncComponents,
  NetworkEntity
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

  // Network Entity Always
  if (message.type === CrdtMessageType.DELETE_ENTITY) {
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

  if (componentId && sync.componentIds.includes(componentId)) {
    return true
  }

  return false
}
