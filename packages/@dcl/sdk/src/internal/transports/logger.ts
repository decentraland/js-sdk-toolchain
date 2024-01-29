import { IEngine, CrdtMessage, CrdtMessageType } from '@dcl/ecs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { readMessage } from '@dcl/ecs/dist/serialization/crdt/message'

export function* serializeCrdtMessages(prefix: string, data: Uint8Array, engine: IEngine) {
  const buffer = new ReadWriteByteBuffer(data)

  let message: CrdtMessage | null

  while ((message = readMessage(buffer))) {
    const ent = message.entityId
    const preface = `${prefix}: ${CrdtMessageType[message.type]} e=${ent}`
    if (message.type === CrdtMessageType.DELETE_ENTITY || message.type === CrdtMessageType.DELETE_ENTITY_NETWORK) {
      yield `${preface}`
    }

    if (
      message.type === CrdtMessageType.PUT_COMPONENT ||
      message.type === CrdtMessageType.PUT_COMPONENT_NETWORK ||
      message.type === CrdtMessageType.DELETE_COMPONENT_NETWORK ||
      message.type === CrdtMessageType.DELETE_COMPONENT ||
      message.type === CrdtMessageType.APPEND_VALUE
    ) {
      const { componentId, timestamp } = message
      const data = 'data' in message ? message.data : undefined

      try {
        const c = engine.getComponent(componentId)
        yield `${preface} c=${c.componentName} t=${timestamp} data=${JSON.stringify(
          (data && c.schema.deserialize(new ReadWriteByteBuffer(data))) || null
        )}`
      } catch {
        yield `${preface} c=${componentId} t=${timestamp} data=?`
      }
    } else if (
      message.type === CrdtMessageType.DELETE_ENTITY ||
      message.type === CrdtMessageType.DELETE_ENTITY_NETWORK
    ) {
      yield preface
    } else {
      yield `${preface} Unknown CrdtMessageType`
    }
  }
}
