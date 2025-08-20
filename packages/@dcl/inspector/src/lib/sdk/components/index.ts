import { ComponentDefinition, Entity, IEngine, LastWriteWinElementSetComponentDefinition, Schemas } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import {
  States,
  ActionTypes,
  createComponents as createAssetPacksComponents,
  Actions,
  Triggers,
  Counter,
  CounterBar,
  AdminTools,
  Rewards,
  VideoScreen
} from '@dcl/asset-packs'
import { Layout } from '../../utils/layout'
import { GizmoType } from '../../utils/gizmo'
import { TransformConfig } from './TransformConfig'
import {
  Coords,
  defineSceneComponents,
  getLatestSceneComponentVersion,
  SceneAgeRating,
  SceneCategory,
  TransitionMode
} from './SceneMetadata'
import { ConfigComponentSchema, ConfigComponentType } from './Config'
import { EditorComponentNames as BaseEditorComponentNames } from './types'

export { SceneAgeRating, SceneCategory }
export { CoreComponents, AllComponentsType } from './types'

// Override the Scene property with the dynamic value
export const EditorComponentNames = {
  ...BaseEditorComponentNames,
  Scene: getLatestSceneComponentVersion().key
}

export type Component<T = unknown> = ComponentDefinition<T>
export type Node = { entity: Entity; open?: boolean; children: Entity[] }

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
  skyboxConfig?: {
    fixedTime?: number
    transitionMode?: TransitionMode
  }
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

// eslint-disable-next-line @typescript-eslint/ban-types
export type GroundComponent = {}
// eslint-disable-next-line @typescript-eslint/ban-types
export type TileComponent = {}

export type CustomAssetComponent = {
  assetId: string
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
  CounterBar: CounterBar
  Config: ConfigComponentType
  Ground: GroundComponent
  Tile: TileComponent
  CustomAsset: CustomAssetComponent
  AdminTools: AdminTools
  VideoScreen: VideoScreen
  Rewards: Rewards
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
  Ground: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Ground']>
  Tile: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Tile']>
  CustomAsset: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['CustomAsset']>
  AdminTools: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['AdminTools']>
  VideoScreen: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['VideoScreen']>
  Rewards: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Rewards']>
}

export type SdkComponents = {
  Animator: ReturnType<typeof components.Animator>
  AudioSource: ReturnType<typeof components.AudioSource>
  AudioStream: ReturnType<typeof components.AudioStream>
  AvatarAttach: ReturnType<typeof components.AvatarAttach>
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
  const AvatarAttach = components.AvatarAttach(engine)
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
    AvatarAttach,
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

  // legacy component
  // we define the schema of the legacy component for retrocompat purposes
  engine.defineComponent('inspector::Scene', {
    layout: Schemas.Map({
      base: Coords,
      parcels: Schemas.Array(Coords)
    })
  })

  const Scene = defineSceneComponents(engine).pop() as ReturnType<typeof defineSceneComponents>[0]

  const Nodes = engine.defineComponent(EditorComponentNames.Nodes, {
    value: Schemas.Array(
      Schemas.Map({
        entity: Schemas.Entity,
        open: Schemas.Optional(Schemas.Boolean),
        children: Schemas.Array(Schemas.Entity)
      })
    )
  })

  const { ActionTypes, Actions, Counter, Triggers, States, CounterBar, AdminTools, Rewards, VideoScreen } =
    createAssetPacksComponents(engine as any)

  const TransformConfig = engine.defineComponent(EditorComponentNames.TransformConfig, {
    porportionalScaling: Schemas.Optional(Schemas.Boolean)
  })

  const Hide = engine.defineComponent(EditorComponentNames.Hide, {
    value: Schemas.Boolean
  })

  const Lock = engine.defineComponent(EditorComponentNames.Lock, {
    value: Schemas.Boolean
  })

  const Config = engine.defineComponent(EditorComponentNames.Config, ConfigComponentSchema)

  const Ground = engine.defineComponent(EditorComponentNames.Ground, {})
  const Tile = engine.defineComponent(EditorComponentNames.Tile, {})
  const CustomAsset = engine.defineComponent(EditorComponentNames.CustomAsset, {
    assetId: Schemas.String
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
    CounterBar: CounterBar as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['CounterBar']>,
    Ground: Ground as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Ground']>,
    Tile: Tile as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Tile']>,
    CustomAsset: CustomAsset as unknown as LastWriteWinElementSetComponentDefinition<
      EditorComponentsTypes['CustomAsset']
    >,
    AdminTools: AdminTools as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['AdminTools']>,
    VideoScreen: VideoScreen as unknown as LastWriteWinElementSetComponentDefinition<
      EditorComponentsTypes['VideoScreen']
    >,
    Rewards: Rewards as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Rewards']>
  }
}
