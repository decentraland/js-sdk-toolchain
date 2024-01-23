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
  MATERIAL = 'core::Material',
  MESH_COLLIDER = 'core::MeshCollider',
  MESH_RENDERER = 'core::MeshRenderer',
  NFT_SHAPE = 'core::NftShape',
  POINTER_EVENTS = 'core::PointerEvents',
  TEXT_SHAPE = 'core::TextShape',
  TRANSFORM = 'core::Transform',
  VIDEO_PLAYER = 'core::VideoPlayer',
  VISIBILITY_COMPONENT = 'core::VisibilityComponent'
}

export enum EditorComponentNames {
  Selection = 'inspector::Selection',
  Scene = 'inspector::Scene',
  Nodes = 'inspector::Nodes',
  ActionTypes = ComponentName.ACTION_TYPES,
  Actions = ComponentName.ACTIONS,
  Counter = ComponentName.COUNTER,
  Triggers = ComponentName.TRIGGERS,
  States = ComponentName.STATES,
  TransformConfig = 'inspector::TransformConfig',
  Hide = 'inspector::Hide',
  Lock = 'inspector::Lock'
}

export type EditorComponentsTypes = {
  Selection: { gizmo: GizmoType }
  Scene: { layout: Layout }
  Nodes: { value: Node[] }
  TransformConfig: TransformConfig
  ActionTypes: ActionTypes
  Actions: Actions
  Triggers: Triggers
  States: States
  Counter: Counter
  Hide: { value: boolean }
  Lock: { value: boolean }
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
}

export type SdkComponents = {
  Billboard: ReturnType<typeof components.Billboard>
  GltfContainer: ReturnType<typeof components.GltfContainer>
  Material: ReturnType<typeof components.Material>
  MeshRenderer: ReturnType<typeof components.MeshRenderer>
  MeshCollider: ReturnType<typeof components.MeshCollider>
  Name: ReturnType<typeof components.Name>
  TextShape: ReturnType<typeof components.TextShape>
  Transform: ReturnType<typeof components.Transform>
  AudioSource: ReturnType<typeof components.AudioSource>
  VisibilityComponent: ReturnType<typeof components.VisibilityComponent>
  VideoPlayer: ReturnType<typeof components.VideoPlayer>
  AudioStream: ReturnType<typeof components.AudioStream>
  NftShape: ReturnType<typeof components.NftShape>
  Animator: ReturnType<typeof components.Animator>
  PointerEvents: ReturnType<typeof components.PointerEvents>
}

export function createComponents(engine: IEngine): SdkComponents {
  const GltfContainer = components.GltfContainer(engine)
  const Billboard = components.Billboard(engine)
  const Material = components.Material(engine)
  const MeshRenderer = components.MeshRenderer(engine)
  const MeshCollider = components.MeshCollider(engine)
  const Name = components.Name(engine)
  const TextShape = components.TextShape(engine)
  const Transform = components.Transform(engine)
  const AudioSource = components.AudioSource(engine)
  const VisibilityComponent = components.VisibilityComponent(engine)
  const VideoPlayer = components.VideoPlayer(engine)
  const AudioStream = components.AudioStream(engine)
  const NftShape = components.NftShape(engine)
  const Animator = components.Animator(engine)
  const PointerEvents = components.PointerEvents(engine)

  return {
    Billboard,
    GltfContainer,
    Material,
    MeshRenderer,
    MeshCollider,
    Name,
    TextShape,
    Transform,
    AudioSource,
    VisibilityComponent,
    VideoPlayer,
    AudioStream,
    NftShape,
    Animator,
    PointerEvents
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

  const Scene = engine.defineComponent(EditorComponentNames.Scene, {
    layout: Schemas.Map({
      base: Coords,
      parcels: Schemas.Array(Coords)
    })
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

  const { ActionTypes, Actions, Counter, Triggers, States } = createAssetPacksComponents(engine as any)

  const TransformConfig = engine.defineComponent(EditorComponentNames.TransformConfig, {
    porportionalScaling: Schemas.Optional(Schemas.Boolean)
  })

  const Hide = engine.defineComponent(EditorComponentNames.Hide, {
    value: Schemas.Boolean
  })

  const Lock = engine.defineComponent(EditorComponentNames.Lock, {
    value: Schemas.Boolean
  })

  return {
    Selection,
    Scene,
    Nodes,
    TransformConfig,
    Hide,
    Lock,
    ActionTypes: ActionTypes as unknown as LastWriteWinElementSetComponentDefinition<
      EditorComponentsTypes['ActionTypes']
    >,
    Actions: Actions as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Actions']>,
    Counter: Counter as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Counter']>,
    Triggers: Triggers as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Triggers']>,
    States: States as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['States']>
  }
}
