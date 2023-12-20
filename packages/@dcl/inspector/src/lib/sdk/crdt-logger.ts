import { IEngine, CrdtMessage, CrdtMessageType } from '@dcl/ecs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { readMessage } from '@dcl/ecs/dist/serialization/crdt/message'

const VALID_MESSAGE_TYPES = [
  CrdtMessageType.DELETE_COMPONENT,
  CrdtMessageType.DELETE_ENTITY,
  CrdtMessageType.PUT_COMPONENT,
  CrdtMessageType.APPEND_VALUE
]

export function* serializeCrdtMessages(prefix: string, data: Uint8Array, engine: IEngine) {
  for (const m of deserializeCrdtMessage(data, engine)) {
    const ent = `0x${m.entityId.toString(16)}`
    const preface = `${prefix}: ${CrdtMessageType[m.type]} e=${ent}`

    if (!VALID_MESSAGE_TYPES.includes(m.type)) {
      yield `${preface} Unknown CrdtMessageType`
    } else if (m.componentName && m.body) {
      yield `${preface} c=${m.componentName} t=${m.timestamp} data=${JSON.stringify(m.body)}`
    } else if (m.componentId) {
      yield `${preface} c=${m.componentId} t=${m.timestamp} data=?`
    } else {
      yield preface
    }
  }
}

interface SerializedCrdtMessage {
  entityId: number,
  type: CrdtMessageType,
  timestamp: number
  componentId?: number
  componentName?: string
  body?: Record<string, unknown>
}

export function* deserializeCrdtMessage(data: Uint8Array, engine: IEngine): Generator<SerializedCrdtMessage> {
  const buffer = new ReadWriteByteBuffer(data)

  let message: CrdtMessage | null

  while ((message = readMessage(buffer))) {
    if (
      message.type === CrdtMessageType.PUT_COMPONENT ||
      message.type === CrdtMessageType.DELETE_COMPONENT ||
      message.type === CrdtMessageType.APPEND_VALUE
    ) {

      const props = {
        entityId: message.entityId,
        type: message.type,
        timestamp: message.timestamp
      }

      const data = 'data' in message ? message.data : undefined

      try {
        const component = engine.getComponent(message.componentId)
        const body = data ? component.schema.deserialize(new ReadWriteByteBuffer(data)) as Record<string, unknown> : undefined
        yield { ...props, componentName: component.componentName, componentId: component.componentId, body }
      } catch {
        yield props
      }
    } else {
      yield { entityId: message.entityId, type: message.type, timestamp: 0 }
    }
  }
}
