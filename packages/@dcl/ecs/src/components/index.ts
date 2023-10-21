import { GrowOnlyValueSetComponentDefinition, LastWriteWinElementSetComponentDefinition } from '../engine/component'
import { IEngine } from '../engine/types'
import { AnimatorComponentDefinitionExtended, defineAnimatorComponent } from './extended/Animator'
import { defineMaterialComponent, MaterialComponentDefinitionExtended } from './extended/Material'
import { defineMeshColliderComponent, MeshColliderComponentDefinitionExtended } from './extended/MeshCollider'
import { defineMeshRendererComponent, MeshRendererComponentDefinitionExtended } from './extended/MeshRenderer'
import { defineTweenComponent, TweenComponentDefinitionExtended } from './extended/Tween'
import { LwwComponentGetter, GSetComponentGetter } from './generated/index.gen'
import defineNameComponent, { NameType } from './manual/Name'
import defineSyncComponent, { ISyncComponentsType } from './manual/SyncComponents'
import defineEntityNetwork, { INetowrkEntityType } from './manual/NetworkEntity'
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

/* @__PURE__ */
export const Tween: LwwComponentGetter<TweenComponentDefinitionExtended> = (engine) => defineTweenComponent(engine)

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
export const SyncComponents: (
  engine: Pick<IEngine, 'defineComponent'>
) => LastWriteWinElementSetComponentDefinition<ISyncComponentsType> = (engine) => defineSyncComponent(engine)

/**
 * @alpha
 */
/* @__PURE__ */
export const NetworkEntity: (
  engine: Pick<IEngine, 'defineComponent'>
) => LastWriteWinElementSetComponentDefinition<INetowrkEntityType> = (engine) => defineEntityNetwork(engine)
