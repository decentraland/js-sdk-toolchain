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
  PhysicsCombinedForce,
  PhysicsCombinedImpulse,
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
  TriggerAreaResult,
  ComponentDefinition
} from '@dcl/ecs'
import { PackableMessage, packChunks } from './codec'
import { ReadWriteByteBuffer } from './ecs-adapter'

export const NOT_SYNC_COMPONENTS: ComponentDefinition<unknown>[] = [
  VideoEvent,
  TweenState,
  AudioEvent,
  EngineInfo,
  GltfContainerLoadingState,
  PhysicsCombinedForce,
  PhysicsCombinedImpulse,
  PointerEventsResult,
  RaycastResult,
  RealmInfo,
  UiDropdown,
  UiDropdownResult,
  UiInput,
  UiInputResult,
  UiTransform,
  UiText,
  TriggerAreaResult
]

export const NOT_SYNC_COMPONENTS_IDS = NOT_SYNC_COMPONENTS.map(($) => $.componentId)
export const NOT_SYNC_COMPONENTS_NAMES: string[] = [
  'asset-packs::Script', // ComponentName from: https://github.com/decentraland/asset-packs/blob/main/src/enums.ts
  'asset-packs::ActionTypes'
]

export function shouldSyncComponent(component: ComponentDefinition<unknown>): boolean {
  return !(
    NOT_SYNC_COMPONENTS_IDS.includes(component.componentId) ||
    NOT_SYNC_COMPONENTS_NAMES.includes(component.componentName)
  )
}

export function getDesyncedComponents(engine: IEngine): ComponentDefinition<unknown>[] {
  return [...NOT_SYNC_COMPONENTS, ...NOT_SYNC_COMPONENTS_NAMES.map(($) => engine.getComponentOrNull($))].filter(
    Boolean
  ) as ComponentDefinition<unknown>[]
}

export function engineToCrdt(engine: IEngine): Uint8Array[] {
  const crdtBuffer = new ReadWriteByteBuffer()
  const NetworkEntity = engine.getComponent(_NetworkEntity.componentId) as INetowrkEntity

  for (const itComponentDefinition of engine.componentsIter()) {
    if (!shouldSyncComponent(itComponentDefinition)) {
      continue
    }

    itComponentDefinition.dumpCrdtStateToBuffer(crdtBuffer, (entity) => {
      return NetworkEntity.has(entity)
    })
  }

  // One scratch buffer for the whole dump: the packer copies each message out
  // before pulling the next one, which overwrites it.
  function* asNetworkMessages(): Generator<PackableMessage> {
    const scratch = new ReadWriteByteBuffer()
    let header: CrdtMessageHeader | null
    while ((header = CrdtMessageProtocol.getHeader(crdtBuffer))) {
      if (header.type !== CrdtMessageType.PUT_COMPONENT) {
        crdtBuffer.incrementReadOffset(header.length)
        continue
      }

      const message = PutComponentOperation.read(crdtBuffer)!
      const networkEntity = NetworkEntity.getOrNull(message.entityId)
      if (!networkEntity) continue

      scratch.resetBuffer()
      PutNetworkComponentOperation.write(
        networkEntity.entityId,
        message.timestamp,
        message.componentId,
        networkEntity.networkId,
        message.data,
        scratch
      )
      yield { messageBuffer: scratch.toBinary(), entityId: message.entityId, componentId: message.componentId }
    }
  }

  return packChunks(asNetworkMessages())
}
