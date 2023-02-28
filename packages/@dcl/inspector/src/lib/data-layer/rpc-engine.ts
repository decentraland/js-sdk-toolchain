import { IEngine, Transport } from '@dcl/ecs'
import { serializeEngine } from './serialize-engine'

export type BidirectionalEngineStream = (
  stream: AsyncIterable<Uint8Array>
) => AsyncGenerator<Uint8Array, void, undefined>

export function connectSceneTransport(scene: IEngine): BidirectionalEngineStream {
  return async function* (stream: AsyncIterable<Uint8Array>): AsyncGenerator<Uint8Array, void, undefined> {
    yield serializeEngine(scene)

    let enabled = true

    const outgoingMessages: Uint8Array[] = []

    const transport: Transport = {
      filter() {
        return enabled
      },
      async send(message) {
        if (!enabled) return
        outgoingMessages.push(message)
      }
    }

    scene.addTransport(transport)

    try {
      for await (const message of stream) {
        transport.onmessage?.call(transport, message)
        await scene.update(0.0)
        yield* outgoingMessages.splice(0, outgoingMessages.length)
      }
    } finally {
      // TODO: engine currently does not accept removing transports

      // "close" the transport
      transport.onmessage = undefined
      enabled = false
    }
  }
}
