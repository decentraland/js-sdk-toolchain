import {
  IEngine,
  CrdtMessage,
  CrdtMessageType,
  PutComponentMessageBody,
  PutComponentMessage,
  DeleteComponentMessage,
  DeleteComponentMessageBody,
  AppendValueMessage,
  AppendValueMessageBody,
  DeleteEntityMessage,
  DeleteEntityMessageBody,
  Entity
} from '@dcl/ecs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { readMessage } from '@dcl/ecs/dist/serialization/crdt/message'
import { CoreComponents, EditorComponentNames } from './components'

type Components = CoreComponents | EditorComponentNames

export function logCrdtMessages(prefix: string, messages: DeserializedCrdtMessage[]) {
  for (const m of messages) {
    logCrdtMessage(prefix, m)
  }
}

export function logCrdtMessage(prefix: string, message: DeserializedCrdtMessage) {
  const ent = `0x${message.entityId.toString(16)}`
  const preface = `${prefix}: ${CrdtMessageType[message.type]} e=${ent}`

  if (isPutComponentMessage(message) || isAppendValueComponentMessage(message)) {
    console.log(`${preface} c=${message.componentName} t=${message.timestamp} data=${JSON.stringify(message.data)}`)
  } else if (isDeleteComponentMessage(message)) {
    console.log(`${preface} c=${message.componentId} t=${message.timestamp} data=?`)
  } else {
    console.log(preface)
  }
}

export type BaseCrdtMessage = { type: CrdtMessageType; entityId: Entity }
export type DeserializedPutComponentMessage<T = Record<string, unknown>> = Omit<PutComponentMessageBody, 'data'> & {
  componentName: string
  data: T
}
export type DeserializedDeleteComponentMessage = DeleteComponentMessageBody & { componentName: string }
export type DeserializedAppendValueComponentMessage<T = Set<unknown>> = Omit<AppendValueMessageBody, 'data'> & {
  componentName: string
  data: T
}
export type DeserializedCrdtMessage =
  | DeserializedPutComponentMessage
  | DeleteComponentMessageBody
  | DeserializedAppendValueComponentMessage
  | DeleteEntityMessageBody
  | BaseCrdtMessage

// Base type-guard
export function is<T extends DeserializedCrdtMessage>(
  typeA: CrdtMessageType,
  typeB: CrdtMessageType,
  _: DeserializedCrdtMessage
): _ is T {
  return typeA === typeB
}

// Message's type type-guards
export function isPutComponentMessage<T>(
  message: DeserializedCrdtMessage
): message is DeserializedPutComponentMessage<T> {
  return is<DeserializedPutComponentMessage>(CrdtMessageType.PUT_COMPONENT, message.type, message)
}

export function isAppendValueComponentMessage(
  message: DeserializedCrdtMessage
): message is DeserializedAppendValueComponentMessage {
  return is<DeserializedAppendValueComponentMessage>(CrdtMessageType.APPEND_VALUE, message.type, message)
}

export function isDeleteComponentMessage(
  message: DeserializedCrdtMessage
): message is DeserializedDeleteComponentMessage {
  return is<DeserializedDeleteComponentMessage>(CrdtMessageType.DELETE_COMPONENT, message.type, message)
}

// Component's type-guards
export function getPutComponentFromMessage<T>(
  message: DeserializedCrdtMessage,
  componentName: Components
): message is DeserializedPutComponentMessage<T> {
  return isPutComponentMessage(message) && message.componentName === componentName
}

export function getDeleteComponentFromMessage(
  message: DeserializedCrdtMessage,
  componentName: Components
): message is DeserializedDeleteComponentMessage {
  return isDeleteComponentMessage(message) && message.componentName === componentName
}

export function buildPutComponentCrdtMessage(
  message: PutComponentMessage,
  engine: IEngine
): DeserializedPutComponentMessage {
  try {
    const component = engine.getComponent(message.componentId)
    const data = component.schema.deserialize(new ReadWriteByteBuffer(message.data)) as Record<string, unknown>
    return {
      type: CrdtMessageType.PUT_COMPONENT,
      entityId: message.entityId,
      timestamp: message.timestamp,
      componentId: message.componentId,
      componentName: component.componentName,
      data
    }
  } catch {
    console.log(
      `Deserialize PUT_COMPONENT: Component with ID "${message.componentId}" for entity "${message.entityId}" not found on engine.`
    )
    return {
      type: CrdtMessageType.PUT_COMPONENT,
      entityId: message.entityId,
      timestamp: message.timestamp,
      componentId: message.componentId,
      componentName: '?',
      data: {}
    }
  }
}

export function buildDeleteComponentCrdtMessage(
  message: DeleteComponentMessage,
  engine: IEngine
): DeserializedDeleteComponentMessage {
  try {
    const component = engine.getComponent(message.componentId)
    return {
      type: CrdtMessageType.DELETE_COMPONENT,
      entityId: message.entityId,
      timestamp: message.timestamp,
      componentId: message.componentId,
      componentName: component.componentName
    }
  } catch {
    console.log(
      `Deserialize DELETE_COMPONENT: Component with ID "${message.componentId}" for entity "${message.entityId}" not found on engine.`
    )
    return {
      type: CrdtMessageType.DELETE_COMPONENT,
      entityId: message.entityId,
      timestamp: message.timestamp,
      componentId: message.componentId,
      componentName: '?'
    }
  }
}

export function buildAppendValueComponentCrdtMessage(
  message: AppendValueMessage,
  engine: IEngine
): DeserializedAppendValueComponentMessage {
  try {
    const component = engine.getComponent(message.componentId)
    const data = component.schema.deserialize(new ReadWriteByteBuffer(message.data)) as Set<unknown>
    return {
      type: CrdtMessageType.APPEND_VALUE,
      entityId: message.entityId,
      timestamp: message.timestamp,
      componentId: message.componentId,
      componentName: component.componentName,
      data
    }
  } catch {
    console.log(
      `Deserialize PUT_COMPONENT: Component with ID "${message.componentId}" for entity "${message.entityId}" not found on engine.`
    )
    return {
      type: CrdtMessageType.APPEND_VALUE,
      entityId: message.entityId,
      timestamp: message.timestamp,
      componentId: message.componentId,
      componentName: '?',
      data: new Set()
    }
  }
}

export function buildDeleteEntityCrdtMessage(message: DeleteEntityMessage): DeleteEntityMessageBody {
  return {
    type: CrdtMessageType.DELETE_ENTITY,
    entityId: message.entityId
  }
}

export function buildBaseCrdtMessage(message: CrdtMessage): BaseCrdtMessage {
  return {
    type: message.type,
    entityId: message.entityId
  }
}

export function getDeserializedCrdtMessage(message: CrdtMessage, engine: IEngine): DeserializedCrdtMessage {
  if (message.type === CrdtMessageType.PUT_COMPONENT) {
    return buildPutComponentCrdtMessage(message, engine)
  } else if (message.type === CrdtMessageType.DELETE_COMPONENT) {
    return buildDeleteComponentCrdtMessage(message, engine)
  } else if (message.type === CrdtMessageType.APPEND_VALUE) {
    return buildAppendValueComponentCrdtMessage(message, engine)
  } else if (message.type === CrdtMessageType.DELETE_ENTITY) {
    return buildDeleteEntityCrdtMessage(message)
  } else {
    return buildBaseCrdtMessage(message)
  }
}

export function deserializeCrdtMessages(data: Uint8Array, engine: IEngine): DeserializedCrdtMessage[] {
  const messages: DeserializedCrdtMessage[] = []
  const buffer = new ReadWriteByteBuffer(data)

  let message: CrdtMessage | null

  while ((message = readMessage(buffer))) {
    messages.push(getDeserializedCrdtMessage(message, engine))
  }

  return messages
}
