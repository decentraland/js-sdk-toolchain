import {
  Engine,
  IEngine,
  TransformComponentExtended,
  MeshRendererComponentDefinitionExtended,
  Transport
} from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import { DataLayerRpcClient } from '../data-layer/types'
import { AsyncQueue } from '@well-known-components/pushable-channel'
import { consumeAllMessagesInto } from '../logic/consume-stream'
import { createEditorComponents, EditorComponents } from './components'
import { serializeCrdtMessages } from './crdt-logger'
import { StreamMessage } from '../data-layer/proto/gen/data-layer.gen'

export type InspectorEngine = {
  engine: IEngine
  editorComponents: EditorComponents
  sdkComponents: {
    GltfContainer: ReturnType<typeof components.GltfContainer>
    MeshRenderer: MeshRendererComponentDefinitionExtended
    Transform: TransformComponentExtended
  }
  dispose(): void
}

export function createInspectorEngine(dataLayer: DataLayerRpcClient): InspectorEngine {
  const engine = Engine()

  const Transform = components.Transform(engine)
  const GltfContainer = components.GltfContainer(engine)
  const MeshRenderer = components.MeshRenderer(engine)

  // <HERE BE DRAGONS (TRANSPORT)>
  const outgoingMessagesStream = new AsyncQueue<StreamMessage>((_, _action) => {})
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

  consumeAllMessagesInto(
    dataLayer.stream(outgoingMessagesStream),
    transport.onmessage!,
    outgoingMessagesStream.close
  ).catch((e) => console.log(e))

  function dispose() {
    outgoingMessagesStream.close()
  }
  // </HERE BE DRAGONS (TRANSPORT)>

  return {
    engine,
    editorComponents: createEditorComponents(engine),
    sdkComponents: { GltfContainer, MeshRenderer, Transform },
    dispose
  }
}
