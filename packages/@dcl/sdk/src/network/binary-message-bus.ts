import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'

export enum CommsMessage {
  CRDT = 1,
  REQ_CRDT_STATE = 2,
  RES_CRDT_STATE = 3
}

export function BinaryMessageBus<T extends CommsMessage>(send: (message: Uint8Array) => void) {
  const mapping: Map<T, (value: Uint8Array, sender: string) => void> = new Map()
  return {
    on: <K extends T>(message: K, callback: (value: Uint8Array, sender: string) => void) => {
      mapping.set(message, callback)
    },
    emit: <K extends T>(message: K, value: Uint8Array) => {
      send(craftCommsMessage<T>(message, value))
    },
    __processMessages: (messages: Uint8Array[]) => {
      for (const message of messages) {
        const commsMsg = decodeCommsMessage<T>(message)
        if (!commsMsg) continue
        const { sender, messageType, data } = commsMsg
        const fn = mapping.get(messageType)
        if (fn) fn(data, sender)
      }
    }
  }
}

export function craftCommsMessage<T extends CommsMessage>(messageType: T, payload: Uint8Array): Uint8Array {
  const msg = new Uint8Array(payload.byteLength + 1)
  msg.set([messageType])
  msg.set(payload, 1)
  return msg
}

export function decodeCommsMessage<T extends CommsMessage>(
  data: Uint8Array
): { sender: string; messageType: T; data: Uint8Array } | undefined {
  try {
    let offset = 0
    const r = new Uint8Array(data)
    const view = new DataView(r.buffer)
    const senderLength = view.getUint8(offset)
    offset += 1
    const sender = decodeString(data.subarray(1, senderLength + 1))
    offset += senderLength
    const messageType = view.getUint8(offset) as T
    offset += 1
    const message = r.subarray(offset)

    return {
      sender,
      messageType,
      data: message
    }
  } catch (e) {
    console.error('Invalid Comms message', e)
  }
}

export function decodeString(data: Uint8Array): string {
  const buffer = new ReadWriteByteBuffer()
  buffer.writeBuffer(data, true)
  return buffer.readUtf8String()
}

export function encodeString(s: string): Uint8Array {
  const buffer = new ReadWriteByteBuffer()
  buffer.writeUtf8String(s)
  return buffer.readBuffer()
}
