import { Scene } from '@babylonjs/core'
import { ComponentDefinition, CrdtMessageType, Engine, Entity, IEngine, Transport } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import { AsyncQueue } from '@well-known-components/pushable-channel'
import mitt, { Emitter } from 'mitt'
import { ITheme } from '../../components/AssetsCatalog'
import { SceneContext } from '../babylon/decentraland/SceneContext'
import { initRenderer } from '../babylon/setup'
import { createDataLayerClientRpc } from '../data-layer/client'
import { StreamMessage } from '../data-layer/proto/gen/data-layer.gen'
import { consumeAllMessagesInto } from '../logic/consume-stream'
import { createEditorComponents, EditorComponents, SdkComponents } from './components'
import { serializeCrdtMessages } from './crdt-logger'
import { getHardcodedLoadableScene } from './test-local-scene'

export type SdkContextEvents = {
  change: { entity: Entity; operation: CrdtMessageType; component?: ComponentDefinition<any>; value?: any }
  dispose: undefined
}

export type SdkContextValue = {
  engine: IEngine
  components: EditorComponents & SdkComponents
  scene: Scene
  events: Emitter<SdkContextEvents>
  dispose(): void
}

export async function createSdkContext(canvas: HTMLCanvasElement, catalog: ITheme[]): Promise<SdkContextValue> {
  const { babylon, scene } = initRenderer(canvas)

  // initialize DataLayer
  const dataLayer = await createDataLayerClientRpc()

  // create scene context
  const ctx = new SceneContext(
    babylon,
    scene,
    getHardcodedLoadableScene(
      'urn:decentraland:entity:bafkreid44xhavttoz4nznidmyj3rjnrgdza7v6l7kd46xdmleor5lmsxfm1',
      catalog
    )
  )
  ctx.rootNode.position.set(0, 0, 0)

  // Connect babylon engine with dataLayer transport
  void ctx.connectDataLayer(dataLayer)

  // create inspector engine context and components
  const events = mitt<SdkContextEvents>()
  const engine = Engine({
    onChangeFunction: (entity, operation, component, value) =>
      events.emit('change', { entity, operation, component, value })
  })

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
  ).catch((e) => {
    console.error('consumeAllMessagesInto failed: ', e)
  })

  function dispose() {
    outgoingMessagesStream.close()
    events.emit('dispose')
  }
  // </HERE BE DRAGONS (TRANSPORT)>

  // register some globals for debugging
  Object.assign(globalThis, { dataLayer, inspectorEngine: engine })

  return {
    engine,
    components: {
      ...createEditorComponents(engine),
      GltfContainer,
      MeshRenderer,
      Transform
    },
    events,
    scene,
    dispose
  }
}
