import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import {
  CrdtMessageHeader,
  CrdtMessageProtocol,
  CrdtMessageType,
  IEngine,
  PutComponentOperation,
  PutNetworkComponentOperation,
  SyncComponents,
  NetworkEntity
} from '@dcl/ecs'

export function engineToCrdt(engine: IEngine): Uint8Array {
  const crdtBuffer = new ReadWriteByteBuffer()
  const networkBuffer = new ReadWriteByteBuffer()
  const syncEntities = new Set(Array.from(engine.getEntitiesWith(SyncComponents)).map(($) => $[0]))

  for (const itComponentDefinition of engine.componentsIter()) {
    itComponentDefinition.dumpCrdtStateToBuffer(crdtBuffer, (entity) => syncEntities.has(entity))
  }

  let header: CrdtMessageHeader | null
  while ((header = CrdtMessageProtocol.getHeader(crdtBuffer))) {
    if (header.type === CrdtMessageType.PUT_COMPONENT) {
      const message = PutComponentOperation.read(crdtBuffer)!
      const networkEntity = NetworkEntity.getOrNull(message.entityId)
      if (networkEntity) {
        PutNetworkComponentOperation.write(
          networkEntity.entityId,
          message.timestamp,
          message.componentId,
          networkEntity.networkId,
          message.data,
          networkBuffer
        )
      } else {
        PutComponentOperation.write(
          message.entityId,
          message.timestamp,
          message.componentId,
          message.data,
          networkBuffer
        )
      }
    } else {
      crdtBuffer.incrementReadOffset(header.length)
    }
  }

  return networkBuffer.toBinary()
}
