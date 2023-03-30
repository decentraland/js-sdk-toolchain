import { Engine, Transport } from '@dcl/ecs'
import { AsyncQueue } from '@well-known-components/pushable-channel'
import mitt from 'mitt'

import { CrdtStreamMessage } from '../data-layer/proto/gen/data-layer.gen'
import { DataLayerRpcClient } from '../data-layer/types'
import { consumeAllMessagesInto } from '../logic/consume-stream'
import { createComponents, createEditorComponents } from './components'
import { serializeCrdtMessages } from './crdt-logger'
import { SdkContextEvents, SdkContextValue } from './context'

export function createInspectorEngine(dataLayer: DataLayerRpcClient): Omit<SdkContextValue, 'scene'> {
  const events = mitt<SdkContextEvents>()
  const engine = Engine({
    onChangeFunction: (entity, operation, component, value) =>
      events.emit('change', { entity, operation, component, value })
  })

  const components = {
    ...createEditorComponents(engine),
    ...createComponents(engine)
  }

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
        Array.from(serializeCrdtMessages('Inspector>Datalayer', message, engine)).forEach(($) => console.log($))
      }
    }
  }
  Object.assign(transport, { name: 'InspectorTransportClient' })
  engine.addTransport(transport)

  function onMessage(message: Uint8Array) {
    if (message.byteLength) {
      Array.from(serializeCrdtMessages('DataLayer>Inspector', message, engine)).forEach(($) => console.log($))
    }
    transport.onmessage!(message)
  }

  consumeAllMessagesInto(dataLayer.crdtStream(outgoingMessagesStream), onMessage, outgoingMessagesStream.close).catch(
    (e) => {
      console.error('consumeAllMessagesInto failed: ', e)
    }
  )
  // </HERE BE DRAGONS (TRANSPORT)>

  function dispose() {
    outgoingMessagesStream.close()
    events.emit('dispose')
  }
  return {
    engine,
    components,
    events,
    dispose,
    dataLayer
  }
}
