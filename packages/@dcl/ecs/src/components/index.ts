import {
  GrowOnlyValueSetComponentDefinition,
  LastWriteWinElementSetComponentDefinition,
  ReadOnlyLastWriteWinElementSetComponentDefinition
} from '../engine/component'
import { IEngine } from '../engine/types'
import { AnimatorComponentDefinitionExtended, defineAnimatorComponent } from './extended/Animator'
import { defineMaterialComponent, MaterialComponentDefinitionExtended } from './extended/Material'
import { defineMeshColliderComponent, MeshColliderComponentDefinitionExtended } from './extended/MeshCollider'
import { defineMeshRendererComponent, MeshRendererComponentDefinitionExtended } from './extended/MeshRenderer'
import { LwwComponentGetter, GSetComponentGetter } from './generated/index.gen'
import { defineTransformComponent, TransformComponentExtended } from './manual/Transform'

export * from './generated/index.gen'

export type {
  GrowOnlyValueSetComponentDefinition,
  LastWriteWinElementSetComponentDefinition,
  LwwComponentGetter,
  GSetComponentGetter
}

/* @__PURE__ */
export const Transform: LwwComponentGetter<TransformComponentExtended> = (engine) => defineTransformComponent(engine)

/* @__PURE__ */
export const Material: LwwComponentGetter<MaterialComponentDefinitionExtended> = (engine) =>
  defineMaterialComponent(engine)

/* @__PURE__ */
export const Animator: LwwComponentGetter<AnimatorComponentDefinitionExtended> = (engine) =>
  defineAnimatorComponent(engine)

/* @__PURE__ */
export const MeshRenderer: LwwComponentGetter<MeshRendererComponentDefinitionExtended> = (engine) =>
  defineMeshRendererComponent(engine)

/* @__PURE__ */
export const MeshCollider: LwwComponentGetter<MeshColliderComponentDefinitionExtended> = (engine) =>
  defineMeshColliderComponent(engine)

// Label is defined via the editor in the composite.json, so we dont need to re-define it.
/* @__PURE__ */
export const Label: (
  engine: Pick<IEngine, 'getComponentOrNull'>
) => ReadOnlyLastWriteWinElementSetComponentDefinition<{ label: string }> = (engine) => {
  const LabelComponent = engine.getComponentOrNull(
    'inspector::EntityNode'
  ) as ReadOnlyLastWriteWinElementSetComponentDefinition<{
    label: string
  }>
  if (!LabelComponent) throw new Error('Label Component not found. Be sure you create this scene with the editor.')
  return LabelComponent
}
