import { Engine, IEngine, TransformComponentExtended, Transport } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import { DataLayerInterface } from '../data-layer'
import { AsyncQueue } from '@well-known-components/pushable-channel'
import { consumeAllMessagesInto } from '../logic/consume-stream'
import { createEditorComponents, EditorComponents } from './components'

export type InspectorEngine = {
  engine: IEngine
  customComponents: EditorComponents
  sdkComponents: {
    Transform: TransformComponentExtended
  }
  dispose(): void
}

export function createInspectorEngine(dataLayer: DataLayerInterface): InspectorEngine {
  const engine = Engine()

  const Transform = components.Transform(engine)

  // <HERE BE DRAGONS (TRANSPORT)>
  const outgoingMessagesStream = new AsyncQueue<Uint8Array>((_, _action) => {})
  const transport: Transport = {
    filter() {
      return !outgoingMessagesStream.closed
    },
    async send(message) {
      if (outgoingMessagesStream.closed) return
      outgoingMessagesStream.enqueue(message)
    }
  }
  engine.addTransport(transport)
  void consumeAllMessagesInto(
    dataLayer.getEngineUpdates(outgoingMessagesStream),
    transport.onmessage!,
    outgoingMessagesStream.close
  )
  function dispose() {
    outgoingMessagesStream.close()
  }
  // </HERE BE DRAGONS (TRANSPORT)>

  return {
    engine,
    customComponents: createEditorComponents(engine),
    sdkComponents: { Transform },
    dispose
  }
}
