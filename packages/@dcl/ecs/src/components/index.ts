import { ISchema } from '../engine'
import { ComponentGetter, PointerEvents } from './generated/index.gen'
export * from './generated/index.gen'
import {
  defineTransformComponent,
  TransformComponent
} from './legacy/Transform'
import {
  AnimatorComponentDefinitionExtended,
  defineAnimatorComponent
} from './extended/Animator'
import {
  defineMeshColliderComponent,
  MeshColliderComponentDefinitionExtended
} from './extended/MeshCollider'
import {
  defineMeshRendererComponent,
  MeshRendererComponentDefinitionExtended
} from './extended/MeshRenderer'
import {
  defineMaterialComponent,
  MaterialComponentDefinitionExtended
} from './extended/Material'
import { ComponentDefinition } from '../engine/component'
export { ISchema, ComponentDefinition }

/*#__PURE__*/
export const Transform: ComponentGetter<TransformComponent> = (engine) =>
  defineTransformComponent(engine)

/*#__PURE__*/
export const Material: ComponentGetter<MaterialComponentDefinitionExtended> = (
  engine
) => defineMaterialComponent(engine)

/*#__PURE__*/
export const Animator: ComponentGetter<AnimatorComponentDefinitionExtended> = (
  engine
) => defineAnimatorComponent(engine)

/*#__PURE__*/
export const MeshRenderer: ComponentGetter<
  MeshRendererComponentDefinitionExtended
> = (engine) => defineMeshRendererComponent(engine)

/*#__PURE__*/
export const MeshCollider: ComponentGetter<
  MeshColliderComponentDefinitionExtended
> = (engine) => defineMeshColliderComponent(engine)

/*#__PURE__*/
export const PointerHoverFeedback = PointerEvents
