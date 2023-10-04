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
  GLTF_CONTAINER = 'core::GltfContainer',
  TEXT_SHAPE = 'core::TextShape',
  TRANSFORM = 'core::Transform',
  MATERIAL = 'core::Material',
  MESH_COLLIDER = 'core::MeshCollider',
  MESH_RENDERER = 'core::MeshRenderer',
  AUDIO_SOURCE = 'core::AudioSource'
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
  TransformConfig = 'inspector::TransformConfig'
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

  return {
    Billboard,
    GltfContainer,
    Material,
    MeshRenderer,
    MeshCollider,
    Name,
    TextShape,
    Transform,
    AudioSource
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

  return {
    Selection,
    Scene,
    Nodes,
    TransformConfig,
    ActionTypes: ActionTypes as unknown as LastWriteWinElementSetComponentDefinition<
      EditorComponentsTypes['ActionTypes']
    >,
    Actions: Actions as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Actions']>,
    Counter: Counter as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Counter']>,
    Triggers: Triggers as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Triggers']>,
    States: States as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['States']>
  }
}