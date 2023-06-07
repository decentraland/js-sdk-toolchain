import {
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
  Selection = 'inspector::Selection',
  Scene = 'inspector::Scene'
}

export type EditorComponentsTypes = {
  Selection: { gizmo: GizmoType }
  Scene: { layout: Layout }
}

export type EditorComponents = {
  Selection: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Selection']>
  Scene: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Scene']>
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
  const Selection = engine.defineComponent(EditorComponentIds.Selection, {
    gizmo: Schemas.Int
  })

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

  return { Selection, Scene }
}
