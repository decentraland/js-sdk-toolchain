import { IEngine, LastWriteWinElementSetComponentDefinition } from '@dcl/ecs'

import { EditorComponentNames, EditorComponentsTypes } from '../../../../sdk/components'
import { GizmoType } from '../../../../utils/gizmo'

export function selectSceneEntity(engine: IEngine) {
  const Selection = engine.getComponentOrNull(
    EditorComponentNames.Selection
  ) as LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Selection']> | null

  if (Selection) {
    for (const [entity] of engine.getEntitiesWith(Selection)) {
      Selection.deleteFrom(entity)
    }

    function system() {
    engine.removeSystem(system)
      Selection!.createOrReplace(engine.RootEntity, { gizmo: GizmoType.FREE })
    }

    engine.addSystem(system)
  }
}
