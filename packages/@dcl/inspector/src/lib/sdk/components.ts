import { IEngine, LastWriteWinElementSetComponentDefinition, Schemas } from '@dcl/ecs'

export type EditorComponents = {
  Label: LastWriteWinElementSetComponentDefinition<{ label: string }>
  EntitySelected: LastWriteWinElementSetComponentDefinition<{ gizmo: number }>
  // eslint-disable-next-line @typescript-eslint/ban-types
  Toggle: LastWriteWinElementSetComponentDefinition<{}>
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
