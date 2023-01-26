// The order of the following imports matters. Please do not auto-sort
export * from './engine'
export * from './schemas'
export * from './runtime/initialization'
export * from './runtime/types'

export { cyclicParentingChecker } from './systems/cyclicParentingChecker'
export * from './systems/events'
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

// export components for global engine
/*#__PURE__*/ export const Transform: TransformComponentExtended = components.Transform(engine)
/*#__PURE__*/ export const Animator: AnimatorComponentDefinitionExtended = components.Animator(engine)
/*#__PURE__*/ export const Material: MaterialComponentDefinitionExtended = components.Material(engine)
/*#__PURE__*/ export const MeshRenderer: MeshRendererComponentDefinitionExtended = components.MeshRenderer(engine)
/*#__PURE__*/ export const MeshCollider: MeshColliderComponentDefinitionExtended = components.MeshCollider(engine)

// export components for global engine
export * from './components/generated/global.gen'

export * from './components/generated/types.gen'

export * from './serialization/crdt'
