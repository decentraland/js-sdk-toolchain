import { GrowOnlyValueSetComponentDefinition, LastWriteWinElementSetComponentDefinition } from '../engine/component'
import { IEngine } from '../engine/types'
import { AnimatorComponentDefinitionExtended, defineAnimatorComponent } from './extended/Animator'
import { defineMaterialComponent, MaterialComponentDefinitionExtended } from './extended/Material'
import { defineMeshColliderComponent, MeshColliderComponentDefinitionExtended } from './extended/MeshCollider'
import { defineMeshRendererComponent, MeshRendererComponentDefinitionExtended } from './extended/MeshRenderer'
import { LwwComponentGetter, GSetComponentGetter } from './generated/index.gen'
import defineNameComponent, { NameType } from './manual/Name'
import defineSyncComponent, { SyncType } from './manual/Sync'
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

/**
 * @alpha
 */
/* @__PURE__ */
export const Name: (engine: Pick<IEngine, 'defineComponent'>) => LastWriteWinElementSetComponentDefinition<NameType> = (
  engine
) => defineNameComponent(engine)

/**
 * @alpha
 */
/* @__PURE__ */
export const SyncEntity: (
  engine: Pick<IEngine, 'defineComponent'>
) => LastWriteWinElementSetComponentDefinition<SyncType> = (engine) => defineSyncComponent(engine)
