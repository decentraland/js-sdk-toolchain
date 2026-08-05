// Single place where the network layer reaches into `@dcl/ecs/dist/**` internals.
// Promoting these to the public `@dcl/ecs` API has to clear that package's 100%
// coverage gate, so it is a separate PR; until then every deep path lives here
// instead of being spread over the layer.

export * as components from '@dcl/ecs/dist/components'
export { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
export type { ByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
export { componentNumberFromName } from '@dcl/ecs/dist/components/component-number'

export { AuthoritativePutComponentOperation, PutComponentOperation } from '@dcl/ecs/dist/serialization/crdt'
export { DeleteComponent } from '@dcl/ecs/dist/serialization/crdt/deleteComponent'
export { DeleteEntity } from '@dcl/ecs/dist/serialization/crdt/deleteEntity'
export { PutNetworkComponentOperation } from '@dcl/ecs/dist/serialization/crdt/network/putComponentNetwork'
export { DeleteComponentNetwork } from '@dcl/ecs/dist/serialization/crdt/network/deleteComponentNetwork'
export { DeleteEntityNetwork } from '@dcl/ecs/dist/serialization/crdt/network/deleteEntityNetwork'
export { TransformSchema, COMPONENT_ID as TransformComponentId } from '@dcl/ecs/dist/components/manual/Transform'

export type {
  CrdtMessage,
  CrdtMessageBody,
  CrdtMessageHeader,
  DeleteComponentMessage,
  DeleteComponentNetworkMessage,
  DeleteEntityMessage,
  DeleteEntityNetworkMessage,
  PutComponentMessage,
  AuthoritativePutComponentMessage,
  PutNetworkComponentMessage
} from '@dcl/ecs/dist/serialization/crdt/types'
export type { ReceiveMessage } from '@dcl/ecs/dist/runtime/types'
export type { ReceiveNetworkMessage } from '@dcl/ecs/dist/systems/crdt/types'
export type { INetowrkEntityType } from '@dcl/ecs/dist/components/types'

// `__dry_run_updateFromCrdt` / `__run_validateBeforeChange` only exist on these
// internal shapes, which is why the validator needs them.
export type {
  LastWriteWinElementSetComponentDefinition,
  GrowOnlyValueSetComponentDefinition,
  ComponentDefinition,
  InternalBaseComponent
} from '@dcl/ecs/dist/engine/component'
