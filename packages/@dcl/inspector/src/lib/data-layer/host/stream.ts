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

  function processMessage({ data }: { data: Uint8Array }) {
    if (data.byteLength) {
      transport.onmessage!(data)
      void ctx.engine.update(1)
      cb()
    }
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
