import {
  ComponentDefinition,
  Entity,
  IEngine,
  LastWriteWinElementSetComponentDefinition,
  MeshRendererComponentDefinitionExtended,
  Schemas,
  TransformComponentExtended
} from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import { Action, Actions as AvailableActions } from '../../components/EntityInspector/ActionInspector/types'
import { Trigger, Triggers as AvailableTriggers } from '../../components/EntityInspector/TriggerInspector/types'
import { Layout } from '../utils/layout'
import { GizmoType } from '../utils/gizmo'

export type Component<T = unknown> = ComponentDefinition<T>
export type Node = { entity: Entity; children: Entity[] }

export enum EditorComponentNames {
  Selection = 'inspector::Selection',
  Scene = 'inspector::Scene',
  Nodes = 'inspector::Nodes',
  Actions = 'inspector::Actions',
  Triggers = 'inspector::Triggers'
}

export type EditorComponentsTypes = {
  Selection: { gizmo: GizmoType }
  Scene: { layout: Layout }
  Nodes: { value: Node[] }
  Actions: { value: Action[] }
  Triggers: { value: Trigger[] }
}

export type EditorComponents = {
  Selection: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Selection']>
  Scene: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Scene']>
  Nodes: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Nodes']>
  Actions: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Actions']>
  Triggers: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Triggers']>
}

export type SdkComponents = {
  GltfContainer: ReturnType<typeof components.GltfContainer>
  Billboard: ReturnType<typeof components.Billboard>
  MeshRenderer: MeshRendererComponentDefinitionExtended
  Transform: TransformComponentExtended
  TextShape: ReturnType<typeof components.TextShape>
  Name: ReturnType<typeof components.Name>
}

export function createComponents(engine: IEngine): SdkComponents {
  const GltfContainer = components.GltfContainer(engine)
  const Billboard = components.Billboard(engine)
  const MeshRenderer = components.MeshRenderer(engine)
  const Transform = components.Transform(engine)
  const TextShape = components.TextShape(engine)
  const Name = components.Name(engine)

  return {
    GltfContainer,
    Billboard,
    MeshRenderer,
    Transform,
    TextShape,
    Name
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

  const Actions = engine.defineComponent(EditorComponentNames.Actions, {
    value: Schemas.Array(
      Schemas.Map({
        name: Schemas.String,
        type: Schemas.EnumString<AvailableActions>(AvailableActions, AvailableActions.PLAY_ANIMATION),
        animation: Schemas.Optional(Schemas.String)
      })
    )
  })

  const Triggers = engine.defineComponent(EditorComponentNames.Triggers, {
    value: Schemas.Array(
      Schemas.Map({
        type: Schemas.EnumString<AvailableTriggers>(AvailableTriggers, AvailableTriggers.ON_CLICK),
        entity: Schemas.Optional(Schemas.Entity),
        action: Schemas.Optional(Schemas.String)
      })
    )
  })

  return { Selection, Scene, Nodes, Actions, Triggers }
}
