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
  AnimatorComponentDefinitionExtended
} from './components/types'
import { NameComponent } from './components/manual/Name'

// export components for global engine
export const Transform: TransformComponentExtended = /* @__PURE__*/ components.Transform(engine)
export const Animator: AnimatorComponentDefinitionExtended = /* @__PURE__*/ components.Animator(engine)
export const Material: MaterialComponentDefinitionExtended = /* @__PURE__*/ components.Material(engine)
export const MeshRenderer: MeshRendererComponentDefinitionExtended = /* @__PURE__*/ components.MeshRenderer(engine)
export const MeshCollider: MeshColliderComponentDefinitionExtended = /* @__PURE__*/ components.MeshCollider(engine)
export const Name: NameComponent = /* @__PURE__*/ components.Name(engine)

// export components for global engine
export * from './components/generated/global.gen'

export * from './components/generated/types.gen'

export * from './serialization/crdt'

export * from './composite'
