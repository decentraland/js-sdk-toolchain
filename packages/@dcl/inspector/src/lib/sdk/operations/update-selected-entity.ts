import { Entity, IEngine } from '@dcl/ecs'
import { EditorComponentNames, EditorComponents } from '../components'
import { GizmoType } from '../../utils/gizmo'

export function updateSelectedEntity(engine: IEngine) {
  return function updateSelectedEntity(entity: Entity, multiple: boolean = false) {
    let gizmo = GizmoType.POSITION

    // clear selection
    const Selection = engine.getComponent(EditorComponentNames.Selection) as EditorComponents['Selection']
    for (const [currentlySelectedEntity] of engine.getEntitiesWith(Selection)) {
      if (currentlySelectedEntity !== entity) {
        gizmo = Selection.get(currentlySelectedEntity).gizmo
        if (!multiple) {
          Selection.deleteFrom(currentlySelectedEntity)
        }
      }
    }

    // then select new entity
    if (!Selection.has(entity) || !multiple) {
      Selection.createOrReplace(entity, { gizmo })
    }
  }
}

export default updateSelectedEntity
