import { CrdtMessage, IEngine, Transport } from '@dcl/ecs'
import { AsyncQueue } from '@well-known-components/pushable-channel'

import { addWs } from './connect'
import { deserializeCrdtMessages, logCrdtMessages } from '../../../sdk/crdt-logger'
import { processCrdtMessage } from './filter'
import { consumeAllMessagesInto } from '../../../logic/consume-stream'

export enum MessageType {
  Init = 1,
  ParticipantJoined = 2,
  ParticipantLeft = 3,
  ParticipantSelectedEntity = 4,
  ParticipantUnselectedEntity = 5,
  Crdt = 6,
  FS = 7
}

export type WsStreamConf = { url: string; room: string; address: string; }
export type WsMessage = { type: MessageType; data: Uint8Array }

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function decode(data: Uint8Array) {
  return JSON.parse(decoder.decode(data))
}

export function encode(data: Record<string, unknown>): Uint8Array {
  return encoder.encode(JSON.stringify(data))
}

export function initWsStream(
  { url, room, address }: WsStreamConf,
  stream: AsyncIterable<WsMessage>,
  engine: IEngine
) {
  const wsUrl = `ws://${url}/${room}?address=${address}`
  const queue = new AsyncQueue<WsMessage>((_, _action) => {})
  const ws = addWs(wsUrl)

  const transport: Transport = {
    filter(message: CrdtMessage) {
      if (queue.closed) return false
      const { filter, messages } = processCrdtMessage(address, message, engine)
      messages.forEach(({ type, data }) => ws.sendMessage(type, data))
      return filter
    },
    async send(message: Uint8Array) {
      if (queue.closed || !message.byteLength) return
      const crdtMessages = deserializeCrdtMessages(message, engine)
      logCrdtMessages('DataLayer>Network', crdtMessages)
      ws.sendMessage(MessageType.Crdt, message)
    }
  }
  Object.assign(transport, { name: 'DataLayerHost' })

  ws.onOpen(() => {
    engine.addTransport(transport)
    consumeAllMessagesInto(stream, ({ type, data }) => {
      if (data.byteLength) {
        console.log('DataLayer>Network', MessageType[type], decode(data))
        ws.sendMessage(type, data)
      }
    }).catch((err) => {
      console.error('Failed to consume stream from WS data layer ', err)
      queue.close()
    })
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
