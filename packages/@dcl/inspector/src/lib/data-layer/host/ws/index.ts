import { CrdtMessage, IEngine, Transport } from '@dcl/ecs'
import { AsyncQueue } from '@well-known-components/pushable-channel'

import { addWs } from './connect'
import { deserializeCrdtMessages, logCrdtMessages } from '../../../sdk/crdt-logger'
import { processCrdtMessage } from './filter'

export enum MessageType {
  Init = 1,
  ParticipantJoined = 2,
  ParticipantLeft = 3,
  ParticipantSelectedEntity = 4,
  ParticipantUnselectedEntity = 5,
  Crdt = 6,
  FS = 7
}

export type WsMessage = { type: MessageType; data: Uint8Array }

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function decode(data: Uint8Array) {
  return JSON.parse(decoder.decode(data))
}

export function encode(data: Record<string, unknown>): Uint8Array {
  return encoder.encode(JSON.stringify(data))
}

export function wsStream(stream: AsyncIterable<WsMessage>, engine: IEngine) {
  const url = `ws://localhost:3000/iws/mariano?address=0xC67c60cD6d82Fcb2fC6a9a58eA62F80443E3268${Math.ceil(
    Math.random() * 50
  )}`
  const queue = new AsyncQueue<WsMessage>((_, _action) => {})
  const ws = addWs(url)

  const transport: Transport = {
    filter(message: CrdtMessage) {
      if (queue.closed) return false
      const { filter, messages } = processCrdtMessage(message, engine)
      messages.forEach(({ type, data }) => ws.sendMessage(type, data))
      return filter
    },
    async send(message) {
      if (queue.closed || !message.byteLength) return
      const crdtMessages = deserializeCrdtMessages(message, engine)
      logCrdtMessages('DataLayer>Network', crdtMessages)
      ws.sendMessage(MessageType.Crdt, message)
    }
  }
  Object.assign(transport, { name: 'DataLayerHost' })

  ws.onOpen(async () => {
    engine.addTransport(transport)
    for await (const { type, data } of stream) {
      if (data.byteLength) {
        console.log('DataLayer>Network', MessageType[type], decode(data))
        ws.sendMessage(type, data)
      }
    }
  })

  ws.onMessage((msgType: MessageType, data: Uint8Array) => {
    if (msgType === MessageType.Crdt) {
      logCrdtMessages('Network>DataLayer', deserializeCrdtMessages(data, engine))
      transport.onmessage!(data)
      void engine.update(1)
    } else {
      console.log('Network>DataLayer', MessageType[msgType], decode(data))
      queue.enqueue({ type: msgType, data })
    }
  })

  return queue
}
