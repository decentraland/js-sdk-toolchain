/**
 * Scene authoring types — used by `main-entities.ts` to declare editable
 * scene entities in a type-safe way.
 *
 * Usage:
 * ```ts
 * import type { Scene } from '@dcl/sdk/scene-types'
 *
 * export const scene: Scene = {
 *   barrel_1: {
 *     components: {
 *       Transform: { position: { x: 5, y: 0, z: 8 } },
 *       GltfContainer: { src: 'models/Barrel.glb' }
 *     }
 *   }
 * }
 * ```
 *
 * The `scene` constant is parsed at build time and bundled into `main.crdt`,
 * so its leaves must be JSON-compatible literals — no function calls, no
 * imports, no computed expressions.
 *
 * Behavior (pointer events, systems, tweens) lives in `src/index.ts` and
 * references entities by name via `engine.getEntityOrNullByName(...)`.
 */

import {
  Animator,
  AudioSource,
  AudioStream,
  AvatarAttach,
  AvatarShape,
  Billboard,
  CameraModeArea,
  GltfContainer,
  GltfNodeModifiers,
  LightSource,
  Material,
  MeshCollider,
  MeshRenderer,
  NftShape,
  PointerEvents,
  TextShape,
  Transform,
  Tween,
  TweenSequence,
  VideoPlayer,
  VirtualCamera,
  VisibilityComponent
} from '@dcl/ecs'

/**
 * Extract the "value" type from a component definition by inferring the
 * return type of `.create(entity, val)`. Works because every typed
 * component's `create` returns the same shape it stores.
 */
type ValueOf<T> = T extends { create(entity: any, val?: any): infer R } ? R : never

/** Transform with `parent` referenced by entity name (string), not Entity ID. */
export type SceneTransform = Omit<ValueOf<typeof Transform>, 'parent'> & {
  /** Entity name of this transform's parent. Resolved to an Entity ID at build time. */
  parent?: string
}

export type SceneGltfContainer = ValueOf<typeof GltfContainer>
export type SceneMeshRenderer = ValueOf<typeof MeshRenderer>
export type SceneMeshCollider = ValueOf<typeof MeshCollider>
export type SceneMaterial = ValueOf<typeof Material>
export type SceneVisibilityComponent = ValueOf<typeof VisibilityComponent>
export type SceneBillboard = ValueOf<typeof Billboard>
export type SceneAudioSource = ValueOf<typeof AudioSource>
export type SceneVideoPlayer = ValueOf<typeof VideoPlayer>
export type SceneTextShape = ValueOf<typeof TextShape>
export type SceneNftShape = ValueOf<typeof NftShape>
export type SceneAnimator = ValueOf<typeof Animator>
export type SceneLightSource = ValueOf<typeof LightSource>
export type SceneAvatarShape = ValueOf<typeof AvatarShape>
export type SceneCameraModeArea = ValueOf<typeof CameraModeArea>
export type SceneGltfNodeModifiers = ValueOf<typeof GltfNodeModifiers>
export type SceneAudioStream = ValueOf<typeof AudioStream>
export type SceneTween = ValueOf<typeof Tween>
export type SceneTweenSequence = ValueOf<typeof TweenSequence>
export type ScenePointerEvents = ValueOf<typeof PointerEvents>
export type SceneAvatarAttach = ValueOf<typeof AvatarAttach>

/**
 * VirtualCamera with `lookAtEntity` referenced by entity name (string), not
 * Entity ID. Resolved at build time, same model as `Transform.parent`.
 */
export type SceneVirtualCamera = Omit<ValueOf<typeof VirtualCamera>, 'lookAtEntity'> & {
  /** Entity name to track. Resolved to an Entity ID at build time. */
  lookAtEntity?: string
}

/** Components an entity can declare in `main-entities.ts`. */
export interface SceneEntityComponents {
  /** Required for every entity — at minimum carries position. */
  Transform: SceneTransform
  GltfContainer?: SceneGltfContainer
  MeshRenderer?: SceneMeshRenderer
  MeshCollider?: SceneMeshCollider
  Material?: SceneMaterial
  VisibilityComponent?: SceneVisibilityComponent
  Billboard?: SceneBillboard
  AudioSource?: SceneAudioSource
  AudioStream?: SceneAudioStream
  VideoPlayer?: SceneVideoPlayer
  TextShape?: SceneTextShape
  NftShape?: SceneNftShape
  Animator?: SceneAnimator
  LightSource?: SceneLightSource
  AvatarShape?: SceneAvatarShape
  AvatarAttach?: SceneAvatarAttach
  CameraModeArea?: SceneCameraModeArea
  VirtualCamera?: SceneVirtualCamera
  GltfNodeModifiers?: SceneGltfNodeModifiers
  Tween?: SceneTween
  TweenSequence?: SceneTweenSequence
  PointerEvents?: ScenePointerEvents
}

export interface SceneEntity {
  components: SceneEntityComponents
}

/**
 * Top-level shape of `main-entities.ts`'s `scene` export. Keys are entity
 * names; each entry declares the components that entity should have.
 */
export type Scene = Record<string, SceneEntity>
