import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import {
  CrdtMessageHeader,
  CrdtMessageProtocol,
  CrdtMessageType,
  IEngine,
  PutComponentOperation,
  PutNetworkComponentOperation,
  SyncComponents as _SyncComponents,
  NetworkEntity as _NetworkEntity,
  ISyncComponents,
  INetowrkEntity
} from '@dcl/ecs'

export function engineToCrdt(engine: IEngine): Uint8Array {
  const crdtBuffer = new ReadWriteByteBuffer()
  const networkBuffer = new ReadWriteByteBuffer()
  const SyncComponents = engine.getComponent(_SyncComponents.componentId) as ISyncComponents
  const NetworkEntity = engine.getComponent(_NetworkEntity.componentId) as INetowrkEntity

  for (const itComponentDefinition of engine.componentsIter()) {
    itComponentDefinition.dumpCrdtStateToBuffer(crdtBuffer, (entity) => {
      const isNetworkEntity = NetworkEntity.has(entity)
      if (!isNetworkEntity) {
        return false
      }
      const isDynamicEntity = NetworkEntity.get(entity).networkId
      if (isDynamicEntity) {
        return true
      }
      // For the static entities we only send the updates of the SyncComponents
      return SyncComponents.get(entity).componentIds.includes(itComponentDefinition.componentId)
    })
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
