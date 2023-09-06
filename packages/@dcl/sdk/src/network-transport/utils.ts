import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import {
  engine,
  TransportMessage,
  PointerEventsResult,
  RESERVED_STATIC_ENTITIES,
  RESERVED_LOCAL_ENTITIES,
  SyncEntity,
  CrdtMessageType,
  EntityUtils
} from '@dcl/ecs'
import { MessageType } from './types'
import { connected } from '.'

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

export function createNetworkEntityFactory(reservedLocalEntities: number, range: [number, number]) {
  return engine.addNetworkManager(reservedLocalEntities, range)
}

export function syncFilter(message: Omit<TransportMessage, 'messageBuffer'>) {
  if (!connected) return false

  if ((message as any).componentId === PointerEventsResult.componentId) {
    return false
  }

  const [entityId] = EntityUtils.fromEntityId(message.entityId)

  // filter messages from reserved entities.
  if (entityId < RESERVED_STATIC_ENTITIES) {
    return false
  }

  if (entityId < RESERVED_LOCAL_ENTITIES) {
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

  const sync = SyncEntity.getOrNull(message.entityId)
  if (!sync) return false

  if ((message as any).componentId && sync.componentIds.includes((message as any).componentId)) {
    return true
  }

  return false
}
