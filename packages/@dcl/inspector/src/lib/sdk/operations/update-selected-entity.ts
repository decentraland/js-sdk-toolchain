import { Entity, IEngine } from '@dcl/ecs'
import { EditorComponentIds, EditorComponents } from '../components'
import { GizmoType } from '../../utils/gizmo'

export function updateSelectedEntity(engine: IEngine) {
  return function updateSelectedEntity(entity: Entity) {
    let gizmo = GizmoType.POSITION

    // clear selection
    const Selection = engine.getComponent(EditorComponentIds.Selection) as EditorComponents['Selection']
    for (const [currentlySelectedEntity] of engine.getEntitiesWith(Selection)) {
      if (currentlySelectedEntity !== entity) {
        gizmo = Selection.get(currentlySelectedEntity).gizmo
        Selection.deleteFrom(currentlySelectedEntity)
      }
    }

    // then select new entity
    if (!Selection.has(entity)) {
      Selection.createOrReplace(entity, { gizmo })
    }
  }
}

export default updateSelectedEntity
