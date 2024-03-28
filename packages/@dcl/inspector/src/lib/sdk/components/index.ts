import { ComponentDefinition, Entity, IEngine, LastWriteWinElementSetComponentDefinition, Schemas } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import {
  ComponentName,
  States,
  ActionTypes,
  createComponents as createAssetPacksComponents,
  Actions,
  Triggers,
  Counter
} from '@dcl/asset-packs'
import { Layout } from '../../utils/layout'
import { GizmoType } from '../../utils/gizmo'
import { TransformConfig } from './TransformConfig'

export type Component<T = unknown> = ComponentDefinition<T>
export type Node = { entity: Entity; open?: boolean; children: Entity[] }

export enum CoreComponents {
  ANIMATOR = 'core::Animator',
  AUDIO_SOURCE = 'core::AudioSource',
  AUDIO_STREAM = 'core::AudioStream',
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

export enum EditorComponentNames {
  Selection = 'inspector::Selection',
  Scene = 'inspector::SceneMetadata',
  Nodes = 'inspector::Nodes',
  ActionTypes = ComponentName.ACTION_TYPES,
  Actions = ComponentName.ACTIONS,
  Counter = ComponentName.COUNTER,
  Triggers = ComponentName.TRIGGERS,
  States = ComponentName.STATES,
  TransformConfig = 'inspector::TransformConfig',
  Hide = 'inspector::Hide',
  Lock = 'inspector::Lock',
  Config = 'inspector::Config'
}

export enum SceneAgeRating {
  Teen = 'T',
  Adult = 'A'
}

export type SceneSpawnPointCoord = { $case: 'single'; value: number } | { $case: 'range'; value: number[] }

export type SceneSpawnPoint = {
  name: string
  default?: boolean
  position: {
    x: SceneSpawnPointCoord
    y: SceneSpawnPointCoord
    z: SceneSpawnPointCoord
  }
  cameraTarget?: {
    x: number
    y: number
    z: number
  }
}

export type SceneComponent = {
  name?: string
  description?: string
  thumbnail?: string
  ageRating?: SceneAgeRating
  main?: string
  categories?: SceneCategory[]
  author?: string
  email?: string
  tags?: string[]
  layout: Layout
  silenceVoiceChat?: boolean
  disablePortableExperiences?: boolean
  spawnPoints?: SceneSpawnPoint[]
}

const AllComponents = {
  ...CoreComponents,
  ...EditorComponentNames
}

type AllComponentsType = CoreComponents | EditorComponentNames

export type ConfigComponent = {
  isBasicViewEnabled: boolean
  componentName: string
  fields: {
    name: string
    type: AllComponentsType
    jsonPayload?: string
    basicViewId?: string
  }[]
  assetId?: string
}

export enum SceneCategory {
  ART = 'art',
  GAME = 'game',
  CASINO = 'casino',
  SOCIAL = 'social',
  MUSIC = 'music',
  FASHION = 'fashion',
  CRYPTO = 'crypto',
  EDUCATION = 'education',
  SHOP = 'shop',
  BUSINESS = 'business',
  SPORTS = 'sports'
}

export type EditorComponentsTypes = {
  Selection: { gizmo: GizmoType }
  Scene: SceneComponent
  Nodes: { value: Node[] }
  TransformConfig: TransformConfig
  ActionTypes: ActionTypes
  Actions: Actions
  Triggers: Triggers
  States: States
  Counter: Counter
  Hide: { value: boolean }
  Lock: { value: boolean }
  CounterBar: { primaryColor: string; secondaryColor: string; maxValue: number }
  Config: ConfigComponent
}

export type EditorComponents = {
  Selection: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Selection']>
  Scene: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Scene']>
  Nodes: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Nodes']>
  TransformConfig: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['TransformConfig']>
  ActionTypes: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['ActionTypes']>
  Actions: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Actions']>
  Counter: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Counter']>
  Triggers: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Triggers']>
  States: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['States']>
  Hide: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Hide']>
  Lock: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Lock']>
  CounterBar: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['CounterBar']>
  Config: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Config']>
}

export type SdkComponents = {
  Animator: ReturnType<typeof components.Animator>
  AudioSource: ReturnType<typeof components.AudioSource>
  AudioStream: ReturnType<typeof components.AudioStream>
  Billboard: ReturnType<typeof components.Billboard>
  GltfContainer: ReturnType<typeof components.GltfContainer>
  Material: ReturnType<typeof components.Material>
  MeshCollider: ReturnType<typeof components.MeshCollider>
  MeshRenderer: ReturnType<typeof components.MeshRenderer>
  Name: ReturnType<typeof components.Name>
  NetworkEntity: ReturnType<typeof components.NetworkEntity>
  NftShape: ReturnType<typeof components.NftShape>
  PointerEvents: ReturnType<typeof components.PointerEvents>
  SyncComponents: ReturnType<typeof components.SyncComponents>
  TextShape: ReturnType<typeof components.TextShape>
  Transform: ReturnType<typeof components.Transform>
  Tween: ReturnType<typeof components.Tween>
  TweenSequence: ReturnType<typeof components.TweenSequence>
  VideoPlayer: ReturnType<typeof components.VideoPlayer>
  VisibilityComponent: ReturnType<typeof components.VisibilityComponent>
}

export function createComponents(engine: IEngine): SdkComponents {
  const Animator = components.Animator(engine)
  const AudioSource = components.AudioSource(engine)
  const AudioStream = components.AudioStream(engine)
  const Billboard = components.Billboard(engine)
  const GltfContainer = components.GltfContainer(engine)
  const Material = components.Material(engine)
  const MeshCollider = components.MeshCollider(engine)
  const MeshRenderer = components.MeshRenderer(engine)
  const Name = components.Name(engine)
  const NetworkEntity = components.NetworkEntity(engine)
  const NftShape = components.NftShape(engine)
  const PointerEvents = components.PointerEvents(engine)
  const SyncComponents = components.SyncComponents(engine)
  const TextShape = components.TextShape(engine)
  const Transform = components.Transform(engine)
  const Tween = components.Tween(engine)
  const TweenSequence = components.TweenSequence(engine)
  const VideoPlayer = components.VideoPlayer(engine)
  const VisibilityComponent = components.VisibilityComponent(engine)

  return {
    Animator,
    AudioSource,
    AudioStream,
    Billboard,
    GltfContainer,
    Material,
    MeshCollider,
    MeshRenderer,
    Name,
    NetworkEntity,
    NftShape,
    PointerEvents,
    SyncComponents,
    TextShape,
    Transform,
    Tween,
    TweenSequence,
    VideoPlayer,
    VisibilityComponent
  }
}

/* istanbul ignore next */
export function createEditorComponents(engine: IEngine): EditorComponents {
  const Selection = engine.defineComponent(EditorComponentNames.Selection, {
    gizmo: Schemas.Int
  })

  const Coords = Schemas.Map({
    x: Schemas.Int,
    y: Schemas.Int
  })

  // legacy component
  // we define the schema of the legacy component for retrocompat purposes
  engine.defineComponent('inspector::Scene', {
    layout: Schemas.Map({
      base: Coords,
      parcels: Schemas.Array(Coords)
    })
  })

  const Scene = engine.defineComponent(EditorComponentNames.Scene, {
    // everything but layout is set as optional for retrocompat purposes
    name: Schemas.Optional(Schemas.String),
    description: Schemas.Optional(Schemas.String),
    thumbnail: Schemas.Optional(Schemas.String),
    ageRating: Schemas.Optional(Schemas.EnumString(SceneAgeRating, SceneAgeRating.Teen)),
    categories: Schemas.Optional(Schemas.Array(Schemas.EnumString(SceneCategory, SceneCategory.GAME))),
    author: Schemas.Optional(Schemas.String),
    email: Schemas.Optional(Schemas.String),
    tags: Schemas.Optional(Schemas.Array(Schemas.String)),
    layout: Schemas.Map({
      base: Coords,
      parcels: Schemas.Array(Coords)
    }),
    silenceVoiceChat: Schemas.Optional(Schemas.Boolean),
    disablePortableExperiences: Schemas.Optional(Schemas.Boolean),
    spawnPoints: Schemas.Optional(
      Schemas.Array(
        Schemas.Map({
          name: Schemas.String,
          default: Schemas.Optional(Schemas.Boolean),
          position: Schemas.Map({
            x: Schemas.OneOf({
              single: Schemas.Int,
              range: Schemas.Array(Schemas.Int)
            }),
            y: Schemas.OneOf({
              single: Schemas.Int,
              range: Schemas.Array(Schemas.Int)
            }),
            z: Schemas.OneOf({
              single: Schemas.Int,
              range: Schemas.Array(Schemas.Int)
            })
          }),
          cameraTarget: Schemas.Optional(
            Schemas.Map({
              x: Schemas.Int,
              y: Schemas.Int,
              z: Schemas.Int
            })
          )
        })
      )
    )
  })

  const Nodes = engine.defineComponent(EditorComponentNames.Nodes, {
    value: Schemas.Array(
      Schemas.Map({
        entity: Schemas.Entity,
        open: Schemas.Optional(Schemas.Boolean),
        children: Schemas.Array(Schemas.Entity)
      })
    )
  })

  const { ActionTypes, Actions, Counter, Triggers, States, CounterBar } = createAssetPacksComponents(engine as any)

  const TransformConfig = engine.defineComponent(EditorComponentNames.TransformConfig, {
    porportionalScaling: Schemas.Optional(Schemas.Boolean)
  })

  const Hide = engine.defineComponent(EditorComponentNames.Hide, {
    value: Schemas.Boolean
  })

  const Lock = engine.defineComponent(EditorComponentNames.Lock, {
    value: Schemas.Boolean
  })

  const Config = engine.defineComponent(EditorComponentNames.Config, {
    isBasicViewEnabled: Schemas.Boolean,
    componentName: Schemas.String,
    fields: Schemas.Array(
      Schemas.Map({
        name: Schemas.String,
        type: Schemas.EnumString<AllComponentsType>(AllComponents, AllComponents.Actions),
        jsonPayload: Schemas.Optional(Schemas.String),
        basicViewId: Schemas.Optional(Schemas.String)
      })
    ),
    assetId: Schemas.Optional(Schemas.String)
  })

  return {
    Selection,
    Scene,
    Nodes,
    TransformConfig,
    Hide,
    Lock,
    Config,
    ActionTypes: ActionTypes as unknown as LastWriteWinElementSetComponentDefinition<
      EditorComponentsTypes['ActionTypes']
    >,
    Actions: Actions as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Actions']>,
    Counter: Counter as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Counter']>,
    Triggers: Triggers as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Triggers']>,
    States: States as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['States']>,
    CounterBar: CounterBar as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['CounterBar']>
  }
}
