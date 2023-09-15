import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { IEngine, SyncComponents } from '@dcl/ecs'

export function engineToCrdt(engine: IEngine): Uint8Array {
  const crdtBuffer = new ReadWriteByteBuffer()
  const syncEntities = new Set(Array.from(engine.getEntitiesWith(SyncComponents)).map(($) => $[0]))

  for (const itComponentDefinition of engine.componentsIter()) {
    itComponentDefinition.dumpCrdtStateToBuffer(crdtBuffer, (entity) => syncEntities.has(entity))
  }

  return crdtBuffer.toBinary()
}
