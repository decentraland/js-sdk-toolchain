import { IEngine, Transport } from '@dcl/ecs'
import { AsyncQueue } from '@well-known-components/pushable-channel'

import { CrdtStreamMessage } from '../data-layer/remote-data-layer'
import { DataLayerRpcClient } from '../data-layer/types'
import { consumeAllMessagesInto } from '../logic/consume-stream'
import { serializeCrdtMessages } from './crdt-logger'

export function connectCrdtToEngine(
  engine: IEngine,
  dataLayerStream: DataLayerRpcClient['crdtStream'],
  engineKey: string
) {
  // <HERE BE DRAGONS (TRANSPORT)>
  const outgoingMessagesStream = new AsyncQueue<CrdtStreamMessage>((_, _action) => {})

  const transport: Transport = {
    filter() {
      return !outgoingMessagesStream.closed
    },
    async send(message) {
      if (outgoingMessagesStream.closed) return
      outgoingMessagesStream.enqueue({ data: message })
      if (message.byteLength) {
        Array.from(serializeCrdtMessages(`${engineKey}>Datalayer`, message, engine)).forEach(($) => console.log($))
      }
    }
  }
  Object.assign(transport, { name: `${engineKey}TransportClient` })
  engine.addTransport(transport)

  function onMessage(message: Uint8Array) {
    if (message.byteLength) {
      Array.from(serializeCrdtMessages(`DataLayer>${engineKey}`, message, engine)).forEach(($) => console.log($))
    }
    transport.onmessage!(message)
    void engine.update(1)
  }

  consumeAllMessagesInto(dataLayerStream(outgoingMessagesStream), onMessage).catch((e) => {
    console.error(`${engineKey} consumeAllMessagesInto failed: `, e)
    outgoingMessagesStream.close()
  })
}
