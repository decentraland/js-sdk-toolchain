import { AsyncQueue } from '@well-known-components/pushable-channel'
import { IEngine, Transport } from '@dcl/ecs'

import { consumeAllMessagesInto } from '../../logic/consume-stream'
import { serializeEngine } from './engine'

export function stream(
  stream: AsyncIterable<{ data: Uint8Array }>,
  ctx: { engine: IEngine }
): AsyncGenerator<{ data: Uint8Array }> {
  const queue = new AsyncQueue<{ data: Uint8Array }>((_) => {})

  const engineSerialized = serializeEngine(ctx.engine)
  debugger
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
  }

  function closeCallback() {
    if (!queue.closed) queue.close()
  }

  // and lastly wire the new messages from the iterator to the
  consumeAllMessagesInto(stream, processMessage, closeCallback).catch((err) => {
    console.log(err)
  })

  return queue
}
