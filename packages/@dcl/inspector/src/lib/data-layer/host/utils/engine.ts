import { ByteBuffer, Engine, IEngine, IEngineOptions } from '@dcl/ecs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { createComponents, createEditorComponents } from '../../../sdk/components'

export function serializeEngine(engine: IEngine) {
  const messages: ByteBuffer = new ReadWriteByteBuffer()

  for (const component of engine.componentsIter()) {
    component.dumpCrdtStateToBuffer(messages)
  }
  return messages.toBinary()
}

export function createEngineContext(opts?: IEngineOptions) {
  // create engine and its components
  const engine = Engine(opts)

  const components = {
    ...createComponents(engine),
    ...createEditorComponents(engine)
  }
  return { engine, components }
}
