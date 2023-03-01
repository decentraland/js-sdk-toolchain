import { IEngine, ByteBuffer } from '@dcl/ecs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'

export function serializeEngine(engine: IEngine) {
  const messages: ByteBuffer = new ReadWriteByteBuffer()

  // TODO: add deleted entities messages

  // add component values
  for (const component of engine.componentsIter()) {
    component.dumpCrdtState(messages)
  }

  return messages.toBinary()
}
