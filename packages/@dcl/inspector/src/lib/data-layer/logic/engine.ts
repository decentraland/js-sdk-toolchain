import { ByteBuffer, Engine, IEngine } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { createEditorComponents } from '../../sdk/components'

export function serializeEngine(engine: IEngine) {
  const messages: ByteBuffer = new ReadWriteByteBuffer()

  // TODO: add deleted entities messages
  // add component values
  for (const component of engine.componentsIter()) {
    component.dumpCrdtState(messages)
  }
  return messages.toBinary()
}

export function createEngine(): IEngine {
  // create engine and its components
  const engine = Engine()
  const _Billboard = components.Billboard(engine)
  const _Transform = components.Transform(engine)
  const _MeshRenderer = components.MeshRenderer(engine)
  const _GltfContainer = components.GltfContainer(engine)
  const _TextShape = components.TextShape(engine)

  createEditorComponents(engine)
  return engine
}
