import { IEngine, Transport } from '@dcl/ecs'
import { AsyncQueue } from '@well-known-components/pushable-channel'

import { CrdtStreamMessage } from '../data-layer/remote-data-layer'
import { DataLayerRpcClient } from '../data-layer/types'
import { consumeAllMessagesInto } from '../logic/consume-stream'
import { deserializeCrdtMessages, logCrdtMessages } from './crdt-logger'

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
        logCrdtMessages(`${engineKey}>Datalayer`, deserializeCrdtMessages(message, engine))
      }
    }
  }
  Object.assign(transport, { name: `${engineKey}TransportClient` })
  engine.addTransport(transport)

  function onMessage(message: Uint8Array) {
    if (message.byteLength) {
      logCrdtMessages(`DataLayer>${engineKey}`, deserializeCrdtMessages(message, engine))
    }
    transport.onmessage!(message)
    void engine.update(1)
  }

  consumeAllMessagesInto(dataLayerStream(outgoingMessagesStream), onMessage).catch((e) => {
    console.error(`${engineKey} consumeAllMessagesInto failed: `, e)
    outgoingMessagesStream.close()
  })
}
