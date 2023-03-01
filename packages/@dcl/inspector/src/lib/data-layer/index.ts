import { IEngine, Transport } from '@dcl/ecs'
import { AsyncQueue } from '@well-known-components/pushable-channel'
import { consumeAllMessagesInto } from '../logic/consume-stream'
import { serializeEngine } from './serialize-engine'

export type DataLayerInterface = {
  undo(): Promise<any>
  redo(): Promise<any>
  getEngineUpdates(iter: AsyncIterable<Uint8Array>): AsyncGenerator<Uint8Array>
}

export function getDataLayerRpc(engine: IEngine): DataLayerInterface {
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
    getEngineUpdates(iter) {
      const queue = new AsyncQueue<Uint8Array>((_, action) => {
        if (action === 'close') {
          // cleanup
        }
      })

      // first we send the fully serialized state over the wire
      queue.enqueue(serializeEngine(engine))

      // then create and add the transport
      const transport: Transport = {
        filter() {
          return !queue.closed
        },
        async send(message) {
          if (queue.closed) return
          queue.enqueue(message)
        }
      }
      engine.addTransport(transport)

      // and lastly wire the new messages from the iterator to the
      void consumeAllMessagesInto(iter, transport.onmessage!, queue.close)

      return queue
    }
  }
}
