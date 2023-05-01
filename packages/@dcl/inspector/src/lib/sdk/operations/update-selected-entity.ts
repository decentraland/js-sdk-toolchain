import { Entity, IEngine } from '@dcl/ecs'
import { EditorComponentIds, EditorComponents } from '../components'

export enum GizmoType {
  TRANSLATE = 0,
  ROTATE = 1,
  SCALE = 2
}

export function updateSelectedEntity(engine: IEngine) {
  return function(entity: Entity, updateEngine = false) {
    let gizmo = GizmoType.TRANSLATE

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
    if (updateEngine) return engine.update(1)
  }
}

export default updateSelectedEntity