import { Entity, IEngine } from '@dcl/ecs'
import { EditorComponentIds, EditorComponents } from '../sdk/components'

export enum GizmoType {
  TRANSLATE = 0,
  ROTATE = 1,
  SCALE = 2
}

export function removeSelectedEntities(engine: IEngine) {
  const Selection = engine.getComponent(EditorComponentIds.Selection) as EditorComponents['Selection']
  for (const [entity] of engine.getEntitiesWith(Selection)) {
    Selection.deleteFrom(entity)
  }
}

export function changeSelectedEntity(entity: Entity, engine: IEngine) {
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
}
