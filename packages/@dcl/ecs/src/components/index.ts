import { GrowOnlyValueSetComponentDefinition, LastWriteWinElementSetComponentDefinition } from '../engine/component'
import { IEngine } from '../engine/types'
import { AnimatorComponentDefinitionExtended, defineAnimatorComponent } from './extended/Animator'
import { AudioSourceComponentDefinitionExtended, defineAudioSourceComponent } from './extended/AudioSource'
import { defineMaterialComponent, MaterialComponentDefinitionExtended } from './extended/Material'
import { defineMeshColliderComponent, MeshColliderComponentDefinitionExtended } from './extended/MeshCollider'
import { defineMeshRendererComponent, MeshRendererComponentDefinitionExtended } from './extended/MeshRenderer'
import { defineTweenComponent, TweenComponentDefinitionExtended } from './extended/Tween'
import { LwwComponentGetter, GSetComponentGetter } from './generated/index.gen'
import defineNameComponent, { NameType } from './manual/Name'
import defineSyncComponent, { ISyncComponentsType } from './manual/SyncComponents'
import defineNetworkEntity, { INetowrkEntityType } from './manual/NetworkEntity'
import defineNetworkParent, { INetowrkParentType } from './manual/NetworkParent'
import { defineTransformComponent, TransformComponentExtended } from './manual/Transform'
import { AudioStreamComponentDefinitionExtended, defineAudioStreamComponent } from './extended/AudioStream'
import { MediaState } from './generated/pb/decentraland/sdk/components/common/media_state.gen'

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
export const AudioSource: LwwComponentGetter<AudioSourceComponentDefinitionExtended> = (engine) =>
  defineAudioSourceComponent(engine)

/* @__PURE__ */
export const AudioStream: (
  engine: Pick<IEngine, 'defineComponentFromSchema' | 'defineValueSetComponentFromSchema'>
) => AudioStreamComponentDefinitionExtended = (engine) => defineAudioStreamComponent(engine)

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
) => LastWriteWinElementSetComponentDefinition<INetowrkEntityType> = (engine) => defineNetworkEntity(engine)

/**
 * @alpha
 */
/* @__PURE__ */
export const NetworkParent: (
  engine: Pick<IEngine, 'defineComponent'>
) => LastWriteWinElementSetComponentDefinition<INetowrkParentType> = (engine) => defineNetworkParent(engine)

export { MediaState }
