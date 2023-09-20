import { ComponentDefinition, Entity, IEngine, LastWriteWinElementSetComponentDefinition, Schemas } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import {
  Action,
  ComponentName,
  States,
  Trigger,
  createComponents as createAssetPacksComponents
} from '@dcl/asset-packs'
import { Layout } from '../utils/layout'
import { GizmoType } from '../utils/gizmo'

export type Component<T = unknown> = ComponentDefinition<T>
export type Node = { entity: Entity; children: Entity[] }

export enum CoreComponents {
  GLTF_CONTAINER = 'core::GltfContainer',
  TEXT_SHAPE = 'core::TextShape',
  TRANSFORM = 'core::Transform',
  MATERIAL = 'core::Material',
  MESH_COLLIDER = 'core::MeshCollider',
  MESH_RENDERER = 'core::MeshRenderer'
}

export enum EditorComponentNames {
  Selection = 'inspector::Selection',
  Scene = 'inspector::Scene',
  Nodes = 'inspector::Nodes',
  Actions = ComponentName.ACTIONS,
  Triggers = ComponentName.TRIGGERS,
  States = ComponentName.STATES
}

export type EditorComponentsTypes = {
  Selection: { gizmo: GizmoType }
  Scene: { layout: Layout }
  Nodes: { value: Node[] }
  Actions: { value: Action[] }
  Triggers: { value: Trigger[] }
  States: States
}

export type EditorComponents = {
  Selection: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Selection']>
  Scene: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Scene']>
  Nodes: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Nodes']>
  Actions: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Actions']>
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

  return {
    Billboard,
    GltfContainer,
    Material,
    MeshRenderer,
    MeshCollider,
    Name,
    TextShape,
    Transform
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
        children: Schemas.Array(Schemas.Entity)
      })
    )
  })

  const { Actions, Triggers, States } = createAssetPacksComponents(engine as any)

  return {
    Selection,
    Scene,
    Nodes,
    Actions: Actions as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Actions']>,
    Triggers: Triggers as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Triggers']>,
    States: States as unknown as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['States']>
  }
}
