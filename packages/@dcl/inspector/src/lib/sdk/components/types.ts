import { ComponentName } from '@dcl/asset-packs'
import { getLatestSceneComponentVersion } from './SceneMetadata'

export enum CoreComponents {
  ANIMATOR = 'core::Animator',
  AUDIO_SOURCE = 'core::AudioSource',
  AUDIO_STREAM = 'core::AudioStream',
  AVATAR_ATTACH = 'core::AvatarAttach',
  GLTF_CONTAINER = 'core::GltfContainer',
  NETWORK_ENTITY = 'core-schema::Network-Entity',
  MATERIAL = 'core::Material',
  MESH_COLLIDER = 'core::MeshCollider',
  MESH_RENDERER = 'core::MeshRenderer',
  NFT_SHAPE = 'core::NftShape',
  POINTER_EVENTS = 'core::PointerEvents',
  SYNC_COMPONENTS = 'core-schema::Sync-Components',
  TEXT_SHAPE = 'core::TextShape',
  TRANSFORM = 'core::Transform',
  TWEEN = 'core::Tween',
  TWEEN_SEQUENCE = 'core::TweenSequence',
  VIDEO_PLAYER = 'core::VideoPlayer',
  VISIBILITY_COMPONENT = 'core::VisibilityComponent'
}

export const EditorComponentNames = {
  Selection: 'inspector::Selection',
  Scene: getLatestSceneComponentVersion().key,
  Nodes: 'inspector::Nodes',
  ActionTypes: ComponentName.ACTION_TYPES,
  Actions: ComponentName.ACTIONS,
  Counter: ComponentName.COUNTER,
  CounterBar: ComponentName.COUNTER_BAR,
  Triggers: ComponentName.TRIGGERS,
  States: ComponentName.STATES,
  TransformConfig: 'inspector::TransformConfig',
  Hide: 'inspector::Hide',
  Lock: 'inspector::Lock',
  Config: 'inspector::Config',
  Ground: 'inspector::Ground',
  Tile: 'inspector::Tile',
  CustomAsset: 'inspector::CustomAsset',
  AdminTools: ComponentName.ADMIN_TOOLS,
  Rewards: ComponentName.REWARDS,
  VideoScreen: ComponentName.VIDEO_SCREEN
}

export type AllComponentsType = CoreComponents | typeof EditorComponentNames[keyof typeof EditorComponentNames]

export const AllComponents = {
  ...CoreComponents,
  ...EditorComponentNames
}
