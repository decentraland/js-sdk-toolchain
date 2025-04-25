import { GrowOnlyValueSetComponentDefinition, LastWriteWinElementSetComponentDefinition } from '../engine/component'
import { IEngine } from '../engine/types'
import { AnimatorComponentDefinitionExtended, defineAnimatorComponent } from './extended/Animator'
import { AudioSourceComponentDefinitionExtended, defineAudioSourceComponent } from './extended/AudioSource'
import { AudioStreamComponentDefinitionExtended, defineAudioStreamComponent } from './extended/AudioStream'
import {
  AvatarEquippedDataComponentDefinitionExtended,
  defineAvatarEquippedDataComponent
} from './extended/AvatarEquippedData'
import { AvatarShapeComponentDefinitionExtended, defineAvatarShapeComponent } from './extended/AvatarShape'
import { defineInputModifierComponent, InputModifierComponentDefinitionExtended } from './extended/InputModifier'
import { defineMaterialComponent, MaterialComponentDefinitionExtended } from './extended/Material'
import { defineMeshColliderComponent, MeshColliderComponentDefinitionExtended } from './extended/MeshCollider'
import { defineMeshRendererComponent, MeshRendererComponentDefinitionExtended } from './extended/MeshRenderer'
import { defineTweenComponent, TweenComponentDefinitionExtended } from './extended/Tween'
import { defineVirtualCameraComponent, VirtualCameraComponentDefinitionExtended } from './extended/VirtualCamera'
import { GSetComponentGetter, LwwComponentGetter } from './generated/index.gen'
import { MediaState } from './generated/pb/decentraland/sdk/components/common/media_state.gen'
import defineNameComponent, { NameType } from './manual/Name'
import defineNetworkEntity, { INetowrkEntityType } from './manual/NetworkEntity'
import defineNetworkParent, { INetowrkParentType } from './manual/NetworkParent'
import defineSyncComponent, { ISyncComponentsType } from './manual/SyncComponents'
import { defineTransformComponent, TransformComponentExtended } from './manual/Transform'

export * from './generated/index.gen'

export type {
  GrowOnlyValueSetComponentDefinition,
  GSetComponentGetter,
  LastWriteWinElementSetComponentDefinition,
  LwwComponentGetter
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

/* @__PURE__ */
export const AvatarShape: LwwComponentGetter<AvatarShapeComponentDefinitionExtended> = (engine) =>
  defineAvatarShapeComponent(engine)

/* @__PURE__ */
export const AvatarEquippedData: LwwComponentGetter<AvatarEquippedDataComponentDefinitionExtended> = (engine) =>
  defineAvatarEquippedDataComponent(engine)

/* @__PURE__ */
export const VirtualCamera: LwwComponentGetter<VirtualCameraComponentDefinitionExtended> = (engine) =>
  defineVirtualCameraComponent(engine)

/* @__PURE__*/
export const InputModifier: LwwComponentGetter<InputModifierComponentDefinitionExtended> = (engine) =>
  defineInputModifierComponent(engine)

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
