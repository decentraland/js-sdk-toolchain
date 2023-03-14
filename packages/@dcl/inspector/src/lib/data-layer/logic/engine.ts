import { ByteBuffer, Engine, IEngine, IEngineOptions } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { createEditorComponents } from '../../sdk/components'

export function serializeEngine(engine: IEngine) {
  const messages: ByteBuffer = new ReadWriteByteBuffer()

  for (const component of engine.componentsIter()) {
    component.dumpCrdtStateToBuffer(messages)
  }
  return messages.toBinary()
}

export function createEngine(opts?: IEngineOptions): IEngine {
  // create engine and its components
  const engine = Engine(opts)

  components.Billboard(engine)
  components.Transform(engine)
  components.MeshRenderer(engine)
  components.GltfContainer(engine)
  components.TextShape(engine)

  createEditorComponents(engine)
  return engine
}
