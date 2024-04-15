// The order of the following imports matters. Please do not auto-sort
export * from './engine'
export * from './schemas'
export * from './runtime/initialization'
export * from './runtime/types'
export * from './runtime/helpers'

export { cyclicParentingChecker } from './systems/cyclicParentingChecker'
export * from './systems/events'
export * from './systems/raycast'
export * from './systems/videoEvents'
export * from './systems/async-task'
export * from './systems/tween'
export * from './engine/entity'
export * from './components/types'

// @internal
import * as components from './components'
// @internal
export { components }

import { engine } from './runtime/initialization'
import {
  MaterialComponentDefinitionExtended,
  MeshColliderComponentDefinitionExtended,
  MeshRendererComponentDefinitionExtended,
  TransformComponentExtended,
  AnimatorComponentDefinitionExtended,
  AudioSourceComponentDefinitionExtended,
  AudioStreamComponentDefinitionExtended,
  ISyncComponents,
  TweenComponentDefinitionExtended,
  INetowrkEntity,
  INetowrkParent
} from './components/types'
import { NameComponent } from './components/manual/Name'

// export components for global engine
export const Transform: TransformComponentExtended = /* @__PURE__*/ components.Transform(engine)
export const Animator: AnimatorComponentDefinitionExtended = /* @__PURE__*/ components.Animator(engine)
export const AudioSource: AudioSourceComponentDefinitionExtended = /* @__PURE__*/ components.AudioSource(engine)
export const AudioStream: AudioStreamComponentDefinitionExtended = /* @__PURE__*/ components.AudioStream(engine)
export const Material: MaterialComponentDefinitionExtended = /* @__PURE__*/ components.Material(engine)
export const MeshRenderer: MeshRendererComponentDefinitionExtended = /* @__PURE__*/ components.MeshRenderer(engine)
export const MeshCollider: MeshColliderComponentDefinitionExtended = /* @__PURE__*/ components.MeshCollider(engine)
export const Name: NameComponent = components.Name(engine)
export const Tween: TweenComponentDefinitionExtended = /* @__PURE__*/ components.Tween(engine)
/**
 * @alpha
 * This is going to be used for sync components through a server.
 * Can be modified in the future since it's still in research
 */
export const SyncComponents: ISyncComponents = /* @__PURE__*/ components.SyncComponents(engine)
/**
 * @alpha
 * Tag a entity to be syncronized through comms
 */
export const NetworkEntity: INetowrkEntity = /* @__PURE__*/ components.NetworkEntity(engine)
/**
 * @alpha
 * Tag a entity to be syncronized through comms
 */
export const NetworkParent: INetowrkParent = /* @__PURE__*/ components.NetworkParent(engine)

// export components for global engine
export * from './components/generated/global.gen'

export * from './components/generated/types.gen'

export * from './serialization/crdt'

export * from './composite'
