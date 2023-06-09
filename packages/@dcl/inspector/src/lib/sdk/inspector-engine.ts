import { Transport } from '@dcl/ecs'
import { AsyncQueue } from '@well-known-components/pushable-channel'
import mitt from 'mitt'

import { CrdtStreamMessage } from '../data-layer/proto/gen/data-layer.gen'
import { DataLayerRpcClient } from '../data-layer/types'
import { consumeAllMessagesInto } from '../logic/consume-stream'
import { serializeCrdtMessages } from './crdt-logger'
import { SdkContextEvents, SdkContextValue } from './context'
import { createEngineContext } from '../data-layer/host/utils/engine'

export function createInspectorEngine(
  dataLayer: DataLayerRpcClient
): Omit<
  SdkContextValue,
  'scene' | 'sceneContext' | 'dataLayer' | 'operations' | 'gizmos' | 'editorCamera' | 'preferences'
> {
  const events = mitt<SdkContextEvents>()
  const { engine, components } = createEngineContext({
    onChangeFunction: (entity, operation, component, value) =>
      events.emit('change', { entity, operation, component, value })
  })

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
    void engine.update(1)
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
    dispose
  }
}
