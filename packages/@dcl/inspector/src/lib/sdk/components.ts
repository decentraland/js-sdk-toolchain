import {
  ComponentDefinition,
  IEngine,
  LastWriteWinElementSetComponentDefinition,
  MeshRendererComponentDefinitionExtended,
  Schemas,
  TransformComponentExtended
} from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import { Layout } from './layout'

export type Component<T = unknown> = ComponentDefinition<T>

export type EditorComponentsTypes = {
  label: { label: string }
  entitySelected: { gizmo: number }
  toggle: object
  scene: { layout: Layout }
}

export type EditorComponents = {
  Label: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['label']>
  EntitySelected: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['entitySelected']>
  Toggle: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['toggle']>
  Scene: LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['scene']>
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

export function createEditorComponents(engine: IEngine): EditorComponents {
  const Label = engine.defineComponent('inspector::Label', {
    label: Schemas.String
  })

  const EntitySelected = engine.defineComponent('editor::EntitySelected', {
    gizmo: Schemas.Int
  })

  const Toggle = engine.defineComponent('inspector::Toggle', {})

  const Coords = Schemas.Map({
    x: Schemas.Int,
    y: Schemas.Int
  })

  const Scene = engine.defineComponent('inspector::Scene', {
    layout: Schemas.Map({
      base: Coords,
      parcels: Schemas.Array(Coords)
    })
  })

  return { Label, EntitySelected, Toggle, Scene }
}
