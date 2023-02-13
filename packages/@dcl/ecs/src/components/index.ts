import { LastWriteWinElementSetComponentDefinition } from '../engine/component'
import { AnimatorComponentDefinitionExtended, defineAnimatorComponent } from './extended/Animator'
import { defineMaterialComponent, MaterialComponentDefinitionExtended } from './extended/Material'
import { defineMeshColliderComponent, MeshColliderComponentDefinitionExtended } from './extended/MeshCollider'
import { defineMeshRendererComponent, MeshRendererComponentDefinitionExtended } from './extended/MeshRenderer'
import { ComponentGetter } from './generated/index.gen'
import { defineTransformComponent, TransformComponentExtended } from './legacy/Transform'

export * from './generated/index.gen'

export type { LastWriteWinElementSetComponentDefinition, ComponentGetter }

/*#__PURE__*/
export const Transform: ComponentGetter<TransformComponentExtended> = (engine) => defineTransformComponent(engine)

/*#__PURE__*/
export const Material: ComponentGetter<MaterialComponentDefinitionExtended> = (engine) =>
  defineMaterialComponent(engine)

/*#__PURE__*/
export const Animator: ComponentGetter<AnimatorComponentDefinitionExtended> = (engine) =>
  defineAnimatorComponent(engine)

/*#__PURE__*/
export const MeshRenderer: ComponentGetter<MeshRendererComponentDefinitionExtended> = (engine) =>
  defineMeshRendererComponent(engine)

/*#__PURE__*/
export const MeshCollider: ComponentGetter<MeshColliderComponentDefinitionExtended> = (engine) =>
  defineMeshColliderComponent(engine)
