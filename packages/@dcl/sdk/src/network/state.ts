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
  INetowrkEntity,
  VideoEvent,
  AudioEvent,
  EngineInfo,
  GltfContainerLoadingState,
  PointerEventsResult,
  RaycastResult,
  RealmInfo,
  TweenState,
  UiDropdown,
  UiDropdownResult,
  UiInput,
  UiInputResult,
  UiText,
  UiTransform
} from '@dcl/ecs'
import { LIVEKIT_MAX_SIZE } from './server'

export const NOT_SYNC_COMPONENTS = [
  VideoEvent,
  TweenState,
  AudioEvent,
  EngineInfo,
  GltfContainerLoadingState,
  PointerEventsResult,
  RaycastResult,
  RealmInfo,
  UiDropdown,
  UiDropdownResult,
  UiInput,
  UiInputResult,
  UiTransform,
  UiText
]

export const NOT_SYNC_COMPONENTS_IDS = NOT_SYNC_COMPONENTS.map(($) => $.componentId)

export function engineToCrdt(engine: IEngine): Uint8Array[] {
  const crdtBuffer = new ReadWriteByteBuffer()
  const networkBuffer = new ReadWriteByteBuffer()
  const NetworkEntity = engine.getComponent(_NetworkEntity.componentId) as INetowrkEntity
  const chunks: Uint8Array[] = []

  for (const itComponentDefinition of engine.componentsIter()) {
    if (NOT_SYNC_COMPONENTS_IDS.includes(itComponentDefinition.componentId)) {
      continue
    }
    itComponentDefinition.dumpCrdtStateToBuffer(crdtBuffer, (entity) => {
      const isNetworkEntity = NetworkEntity.has(entity)
      return isNetworkEntity
    })
  }

  let header: CrdtMessageHeader | null
  while ((header = CrdtMessageProtocol.getHeader(crdtBuffer))) {
    if (header.type === CrdtMessageType.PUT_COMPONENT) {
      const message = PutComponentOperation.read(crdtBuffer)!
      const networkEntity = NetworkEntity.getOrNull(message.entityId)

      // Check if adding this message would exceed the size limit
      const currentBufferSize = networkBuffer.toBinary().byteLength
      const messageSize = message.data.byteLength

      if ((currentBufferSize + messageSize) / 1024 > LIVEKIT_MAX_SIZE) {
        // If the current buffer has content, save it as a chunk
        if (currentBufferSize > 0) {
          chunks.push(networkBuffer.toCopiedBinary())
          networkBuffer.resetBuffer()
        }

        // If the message itself is larger than the limit, we need to handle it specially
        if (messageSize / 1024 > LIVEKIT_MAX_SIZE) {
          console.error(
            `Message too large (${messageSize} bytes), skipping component ${message.componentId} for entity ${message.entityId}`
          )
          continue
        }
      }

      if (networkEntity) {
        PutNetworkComponentOperation.write(
          networkEntity.entityId,
          message.timestamp,
          message.componentId,
          networkEntity.networkId,
          message.data,
          networkBuffer
        )
      }
    } else {
      crdtBuffer.incrementReadOffset(header.length)
    }
  }

  // Add any remaining data as the final chunk
  if (networkBuffer.currentWriteOffset() > 0) {
    chunks.push(networkBuffer.toBinary())
  }

  return chunks
}
