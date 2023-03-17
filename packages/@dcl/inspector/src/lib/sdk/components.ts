import {
  IEngine,
  LastWriteWinElementSetComponentDefinition,
  MeshRendererComponentDefinitionExtended,
  Schemas,
  TransformComponentExtended
} from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'

export type EditorComponents = {
  Label: LastWriteWinElementSetComponentDefinition<{ label: string }>
  EntitySelected: LastWriteWinElementSetComponentDefinition<{ gizmo: number }>
  // eslint-disable-next-line @typescript-eslint/ban-types
  Toggle: LastWriteWinElementSetComponentDefinition<{}>
}

export type SdkComponents = {
  GltfContainer: ReturnType<typeof components.GltfContainer>
  MeshRenderer: MeshRendererComponentDefinitionExtended
  Transform: TransformComponentExtended
}

export function createEditorComponents(engine: IEngine): EditorComponents {
  const Label = engine.defineComponent('inspector::Label', {
    label: Schemas.String
  })

  const EntitySelected = engine.defineComponent('editor::EntitySelected', {
    gizmo: Schemas.Int
  })

  const Toggle = engine.defineComponent('inspector::Toggle', {})

  return { Label, EntitySelected, Toggle }
}
