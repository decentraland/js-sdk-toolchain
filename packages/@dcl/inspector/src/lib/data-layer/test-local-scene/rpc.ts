import { ByteBuffer, IEngine, Transport } from '@dcl/ecs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { AsyncQueue } from '@well-known-components/pushable-channel'
import { consumeAllMessagesInto } from '../../logic/consume-stream'

export type DataLayerInterface = {
  undo(): Promise<any>
  redo(): Promise<any>
  stream(iter: AsyncIterable<{ data: Uint8Array }>): AsyncGenerator<{ data: Uint8Array }>
}

function serializeEngine(engine: IEngine) {
  const messages: ByteBuffer = new ReadWriteByteBuffer()

  // TODO: add deleted entities messages
  // add component values
  for (const component of engine.componentsIter()) {
    component.dumpCrdtState(messages)
  }
  return messages.toBinary()
}

export function getLocalDataLayerRpc(engine: IEngine): DataLayerInterface {
  // the server (datalayer) should also keep its internal "game loop" to process
  // all the incoming messages. we have this interval easy solution to mock that
  // game loop for the time being.
  // since the servers DO NOT run any game system, the only thing it does is to
  // process incoming and outgoing messages + dirty states
  setInterval(() => {
    engine.update(0.016).catch(($) => {
      console.error($)
      debugger
    })
  }, 16)

  return {
    async undo() {},
    async redo() {},
    // This method receives an incoming message iterator
    // and returns an async iterable. consumption and production of messages
    // are decoupled operations
    stream(iter) {
      const queue = new AsyncQueue<{ data: Uint8Array }>((_, action) => {
        if (action === 'close') {
          // cleanup
        }
      })

      // first we send the fully serialized state over the wire
      queue.enqueue({ data: serializeEngine(engine) })

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
      engine.addTransport(transport)

      // and lastly wire the new messages from the iterator to the
      void consumeAllMessagesInto(iter, transport.onmessage!, queue.close)

      return queue
    }
  }
}
