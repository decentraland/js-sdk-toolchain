import { Entity, IEngine, TransformComponentExtended } from '@dcl/ecs'
import { EditorComponentNames, EditorComponents } from '../components'
import { GizmoType } from '../../utils/gizmo'
import { getWorldMatrix, decomposeMatrixSRT } from '../../logic/math'
import { Matrix } from '@dcl/ecs-math/dist/Matrix'
import { Quaternion, Vector3 } from '@dcl/ecs-math'

export function updateSelectedEntity(engine: IEngine) {
  return function updateSelectedEntity(entity: Entity) {
    let gizmo = GizmoType.POSITION

    // clear selection
    const Selection = engine.getComponent(EditorComponentNames.Selection) as EditorComponents['Selection']
    for (const [currentlySelectedEntity] of engine.getEntitiesWith(Selection)) {
      if (currentlySelectedEntity !== entity) {
        gizmo = Selection.get(currentlySelectedEntity).gizmo
        Selection.deleteFrom(currentlySelectedEntity)
      }
    }

    // then select new entity
    if (!Selection.has(entity)) {
      Selection.createOrReplace(entity, { gizmo })

      const m = getWorldMatrix(entity, engine.getComponent('core::Transform') as TransformComponentExtended)
      const s = Vector3.create()
      const r = Quaternion.create()
      const t = Vector3.create()
      decomposeMatrixSRT(m, s, r, t)
      console.log(m, s, Quaternion.toEulerAngles(r), t)
    }
  }
}

export default updateSelectedEntity
