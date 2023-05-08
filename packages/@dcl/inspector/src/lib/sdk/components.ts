import {
  Entity,
  ComponentDefinition,
  IEngine,
  LastWriteWinElementSetComponentDefinition,
  MeshRendererComponentDefinitionExtended,
  Schemas,
  TransformComponentExtended
} from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import { Layout } from '../utils/layout'
import { GizmoType } from '../utils/gizmo'

export type Component<T = unknown> = ComponentDefinition<T>

export enum EditorComponentIds {
  EntityNode = 'inspector::Label',
  Selection = 'inspector::Selection',
  Toggle = 'inspector::Toggle',
  Scene = 'inspector::Scene'
}

export type EditorComponentsTypes = {
  EntityNode: { label: string; parent: Entity }
  Selection: { gizmo: GizmoType }
  Toggle: object
  Scene: { layout: Layout }
}

export type EditorComponents = {
  EntityNode: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['EntityNode']>
  Selection: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Selection']>
  Toggle: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Toggle']>
  Scene: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Scene']>
}

export type SdkComponents = {
  GltfContainer: ReturnType<typeof components.GltfContainer>
  Billboard: ReturnType<typeof components.Billboard>
  MeshRenderer: MeshRendererComponentDefinitionExtended
  Transform: TransformComponentExtended
  TextShape: ReturnType<typeof components.TextShape>
}

export function createComponents(engine: IEngine): SdkComponents {
  const GltfContainer = components.GltfContainer(engine)
  const Billboard = components.Billboard(engine)
  const MeshRenderer = components.MeshRenderer(engine)
  const Transform = components.Transform(engine)
  const TextShape = components.TextShape(engine)

  return {
    GltfContainer,
    Billboard,
    MeshRenderer,
    Transform,
    TextShape
  }
}

/* istanbul ignore next */
export function createEditorComponents(engine: IEngine): EditorComponents {
  const EntityNode = engine.defineComponent(EditorComponentIds.EntityNode, {
    label: Schemas.String,
    parent: Schemas.Entity
  })

  const Selection = engine.defineComponent(EditorComponentIds.Selection, {
    gizmo: Schemas.Int
  })

  const Toggle = engine.defineComponent(EditorComponentIds.Toggle, {})

  const Coords = Schemas.Map({
    x: Schemas.Int,
    y: Schemas.Int
  })

  const Scene = engine.defineComponent(EditorComponentIds.Scene, {
    layout: Schemas.Map({
      base: Coords,
      parcels: Schemas.Array(Coords)
    })
  })

  return { Selection, Toggle, Scene, EntityNode }
}
