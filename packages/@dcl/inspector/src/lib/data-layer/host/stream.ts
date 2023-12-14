import { Transport } from '@dcl/ecs'
import { AsyncQueue } from '@well-known-components/pushable-channel'

import { consumeAllMessagesInto } from '../../logic/consume-stream'
import { DataLayerContext } from '../types'
import { serializeEngine } from './utils/engine'

export type Stream = AsyncQueue<{ data: Uint8Array }>

export function stream(
  stream: AsyncIterable<{ data: Uint8Array }>,
  ctx: Omit<DataLayerContext, 'fs'>,
  cb: () => void
): Stream {
  const queue = new AsyncQueue<{ data: Uint8Array }>((_) => {})
  const engineSerialized = serializeEngine(ctx.engine)
  // first we send the fully serialized state over the wire
  queue.enqueue({ data: engineSerialized })

  // then create and add the transport
  const transport: Transport = {
    filter() {
      return !queue.closed
    },
    async send(message) {
      if (queue.closed) return
      queue.enqueue({ data: message })
    }
  }
  Object.assign(transport, { name: 'DataLayerHost' })
  ctx.engine.addTransport(transport)

  function processMessage(message: Uint8Array) {
    transport.onmessage!(message)
    void ctx.engine.update(1)
    cb()
  }

  // and lastly wire the new messages from engines
  consumeAllMessagesInto(stream, processMessage).catch((err) => {
    console.error('Failed to consume stream from data layer ', err)
    queue.close()
  })

  // Send initial message (engineSerialized)
  void ctx.engine.update(1)

  return queue
}

export enum MessageType {
  // Only send by this server
  Init = 1,
  ParticipantJoined = 2,
  ParticipantLeft = 3,

  // Just stored and forwarded
  ParticipantSelectedEntity = 4,
  ParticipantUnselectedEntity = 5,
  Crdt = 6
}

export type OnMessageFunction = (type: MessageType, data: Uint8Array) => void

function craftMessage(msgType: MessageType, payload: Uint8Array): Uint8Array {
  const msg = new Uint8Array(payload.byteLength + 1)
  msg.set([msgType])
  msg.set(payload, 1)
  return msg
}

function decode(data: Uint8Array) {
  const decoder = new TextDecoder()
  return decoder.decode(data)
}

export function addWsTransport(
  url: string,
  ctx: Omit<DataLayerContext, 'fs'>
) {
  const ws = new WebSocket(url)
  ws.binaryType = 'arraybuffer'
  const onMessageFns: OnMessageFunction[] = []

  const transport: Transport = {
    filter() {
      return ws.readyState === WebSocket.OPEN
    },
    send: async (message: Uint8Array) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(craftMessage(MessageType.Crdt, message))
      }
    }
  }

  ws.onopen = async () => {
    console.log('WS connected', url)
    ctx.engine.addTransport(transport)
  }

  ws.onmessage = (event) => {
    console.log('WS message received', event)
    if (event.data.byteLength) {
      let offset = 0
      const r = new Uint8Array(event.data)
      const view = new DataView(r.buffer)
      const msgType = view.getUint8(offset)
      offset += 1
      onMessageFns.forEach(($) => $(msgType, r.subarray(offset)))
    }
  }

  ws.onerror = (e) => {
    console.error('WS error: ', e)
  }
  ws.onclose = () => {
    console.log('WS closed')
  }

  function onMessage(fn: OnMessageFunction) {
    onMessageFns.push(fn)
  }

  return { onMessage }
}

export function initCollaborativeEditor(
  streams: Stream[],
  { engine }: Omit<DataLayerContext, 'fs'>
) {
  const url = `ws://localhost:3000/iws/mariano?address=0xC67c60cD6d82Fcb2fC6a9a58eA62F80443E3268${Math.ceil(Math.random() * 50)}`
  const ws = addWsTransport(url, { engine })

  ws.onMessage((msgType: MessageType, data: Uint8Array) => {
    switch (msgType) {
      case MessageType.Init:
        console.log('onMessage: Init', decode(data))
        break
      case MessageType.ParticipantJoined:
        console.log('onMessage: ParticipantJoined', decode(data))
        break
      case MessageType.ParticipantLeft:
        console.log('onMessage: ParticipantLeft', decode(data))
        break
      case MessageType.ParticipantSelectedEntity:
        console.log('onMessage: ParticipantSelectedEntity', decode(data))
        break
      case MessageType.ParticipantUnselectedEntity:
        console.log('onMessage: ParticipantUnselectedEntity', decode(data))
        break
      case MessageType.Crdt:
        console.log('onMessage: Crdt')
        streams.forEach(($) => $.enqueue({ data }))
        break
    }
  })
}
