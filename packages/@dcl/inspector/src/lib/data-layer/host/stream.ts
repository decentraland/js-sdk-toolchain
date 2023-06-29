import { Transport } from '@dcl/ecs'
import { AsyncQueue } from '@well-known-components/pushable-channel'

import { consumeAllMessagesInto } from '../../logic/consume-stream'
import { DataLayerContext } from '../types'
import { serializeEngine } from './utils/engine'

export function stream(
  stream: AsyncIterable<{ data: Uint8Array }>,
  ctx: Omit<DataLayerContext, 'fs'>,
  addUndoCrdt: () => void
): AsyncGenerator<{ data: Uint8Array }> {
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
    addUndoCrdt()
  }

  // and lastly wire the new messages from the renderer engine
  consumeAllMessagesInto(stream, processMessage).catch((err) => {
    console.error('Faile to consume stream from data layer ', err)
    queue.close()
  })

  // Send initial message (engineSerialized)
  void ctx.engine.update(1)

  return queue
}
