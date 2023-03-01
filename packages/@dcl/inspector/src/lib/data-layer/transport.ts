import { IEngine, Transport } from '@dcl/ecs'
import future, { IFuture } from 'fp-future'
import { serializeEngine } from './serialize-engine'

export function createBetterTransport(engine: IEngine) {
  /**
   * messages that will go to the original engine
   * @ADR https://adr.decentraland.org/adr/ADR-148
   */
  const outMessages: Uint8Array[] = []
  /**
   * incoming messages from other engines
   * @ADR https://adr.decentraland.org/adr/ADR-148
   */
  const incomingMessages: Uint8Array[] = []
  /**
   * promises for the next frame update. it is resolved after the engine fully
   * processed the incoming messages and outgoing changes. the promises are
   * resolved using the messages that were sent to the transport during
   * the frame
   * @ADR https://adr.decentraland.org/adr/ADR-148
   */
  const nextFrameFutures: Array<IFuture<Uint8Array>> = []

  const transport: Transport = {
    filter() {
      return true
    },
    send: async (message: Uint8Array) => {
      if (message.length) {
        outMessages.push(message)
      }
    }
  }
  Object.assign(transport, { name: 'BetterTransport' })

  function processIncomingMessages() {
    // copy the array and clean the incoming messages to prevent information loss
    const inMessages = incomingMessages.splice(0)

    // first process all the messages as per ADR-148
    for (const message of inMessages) {
      transport.onmessage?.call(null, message)
    }
  }

  function resolvePromises() {
    if (nextFrameFutures.length) {
      // collect updates and clean outMessages
      const updates = outMessages.splice(0)

      const update = concatUint8Arrays(updates)

      // finally resolve the future so the function "receiveBatch" is unblocked
      // and the next scripting frame is allowed to happen
      nextFrameFutures.forEach((fut) => fut.resolve(update))

      // finally clean the futures
      nextFrameFutures.length = 0
    }
  }

  engine.addTransport(transport)
  engine.addSystem(processIncomingMessages, Infinity)
  engine.addSystem(resolvePromises, -Infinity)

  // TODO: move this inside engine.addTransport
  const serializedState = serializeEngine(engine)
  outMessages.push(serializedState)

  return {
    dispose() {
      nextFrameFutures.forEach(($) => $.reject(new Error('Transport disposed')))
      engine.removeSystem(processIncomingMessages)
      engine.removeSystem(resolvePromises)
    },
    /**
     * Receive all the messages from other CRDT engine. It returns a promise with
     * the serialized state changes for the other engine, like camera position.
     *
     * @ADR https://adr.decentraland.org/adr/ADR-148
     */
    async receiveBatch(message: Uint8Array) {
      incomingMessages.push(message)

      // create a promise for the next frame processing
      const fut = future<Uint8Array>()
      nextFrameFutures.push(fut)
      return fut
    }
  }
}

export function concatUint8Arrays(arr: Uint8Array[]) {
  const length = arr.reduce((carry, it) => carry + it.byteLength, 0)
  const ret = new Uint8Array(length)
  let offset = 0
  for (const it of arr) {
    ret.set(it, offset)
    offset += it.byteLength
  }
  return ret
}
