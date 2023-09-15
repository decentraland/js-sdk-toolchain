import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import {
  engine,
  TransportMessage,
  PointerEventsResult,
  RESERVED_STATIC_ENTITIES,
  SyncComponents,
  CrdtMessageType,
  EntityUtils,
  GltfContainerLoadingState
} from '@dcl/ecs'
import { MessageType } from './types'
import { connected, reservedLocalEntities } from '.'

export function encodeString(s: string): Uint8Array {
  const buffer = new ReadWriteByteBuffer()
  buffer.writeUtf8String(s)
  return buffer.readBuffer()
}

export function craftMessage(msgType: MessageType, payload: Uint8Array): Uint8Array {
  const msg = new Uint8Array(payload.byteLength + 1)
  msg.set([msgType])
  msg.set(payload, 1)
  return msg
}

export function createNetworkManager(reservedLocalEntities: number, range: [number, number]) {
  return engine.addNetworkManager(reservedLocalEntities, range)
}

export function syncFilter(message: Omit<TransportMessage, 'messageBuffer'>) {
  if (!connected) return false
  const componentId = (message as any).componentId
  if ([PointerEventsResult.componentId, GltfContainerLoadingState.componentId].includes(componentId)) {
    return false
  }

  const [entityId] = EntityUtils.fromEntityId(message.entityId)
  // filter messages from reserved entities.
  if (entityId < RESERVED_STATIC_ENTITIES) {
    return false
  }

  if (entityId < reservedLocalEntities) {
    return false
  }

  // Network Entity Always
  if (message.type === CrdtMessageType.DELETE_ENTITY) {
    return true
  }

  // TBD: First component
  if ((message as any).timestamp <= 1) {
    return true
  }

  const sync = SyncComponents.getOrNull(message.entityId)
  if (!sync) return false

  if ((message as any).componentId && sync.componentIds.includes((message as any).componentId)) {
    return true
  }

  return false
}
