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
  AudioSource,
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
  UiTransform,
  VideoPlayer
} from '@dcl/ecs'

export const NOT_SYNC_COMPONENTS = [
  VideoEvent,
  VideoPlayer,
  TweenState,
  AudioEvent,
  AudioSource,
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

export function engineToCrdt(engine: IEngine): Uint8Array {
  const crdtBuffer = new ReadWriteByteBuffer()
  const networkBuffer = new ReadWriteByteBuffer()
  const NetworkEntity = engine.getComponent(_NetworkEntity.componentId) as INetowrkEntity

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
