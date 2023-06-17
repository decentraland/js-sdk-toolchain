import { IEngine, Transport } from '@dcl/ecs'
import { AsyncQueue } from '@well-known-components/pushable-channel'
import { select } from 'redux-saga/effects'

import { getEngines } from '..'
import { getDataLayer } from '../../data-layer'
import { consumeAllMessagesInto } from '../../../lib/logic/consume-stream'
import { serializeCrdtMessages } from '../../../lib/sdk/crdt-logger'
import { DataLayerRpcClient, CrdtStreamMessage } from '../../../tooling-entrypoint'

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

export function* connectStream() {
  const engines: ReturnType<typeof getEngines> = yield select(getEngines)
  const dataLayer: ReturnType<typeof getDataLayer> = yield select(getDataLayer)
  if (!dataLayer || !engines.inspector || !engines.renderer) return

  console.log('Data layer reconnected')
  connectCrdtToEngine(engines.inspector, dataLayer.crdtStream, 'Inspector')
  connectCrdtToEngine(engines.renderer, dataLayer.crdtStream, 'Renderer')
}
