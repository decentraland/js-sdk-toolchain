import { Entity, IEngine } from '@dcl/ecs'
import { store } from '../../../redux/store'
import { clearError, error, ErrorType } from '../../../redux/sdk'
import { GizmoType } from '../../utils/gizmo'
import { EditorComponentNames, EditorComponents, Node } from '../components'

function isAncestorOf(ancestorId: Entity, targetId: Entity, nodes: Node[]): boolean {
  const ancestorEntity = nodes.find((node) => node.entity === ancestorId)

  if (!ancestorEntity || !ancestorEntity.children || ancestorEntity.children.length === 0) {
    return false
  }

  if (ancestorEntity.children.includes(targetId)) {
    return true
  }

  // Recursively check descendants
  return ancestorEntity.children.some((childId: Entity) => isAncestorOf(childId, targetId, nodes))
}

export function updateSelectedEntity(engine: IEngine) {
  return function updateSelectedEntity(entity: Entity, multiple: boolean = false) {
    let gizmo = GizmoType.POSITION
    let deletedSelection = false

    // clear selection
    const Selection = engine.getComponent(EditorComponentNames.Selection) as EditorComponents['Selection']
    const Node = engine.getComponentOrNull(EditorComponentNames.Nodes) as EditorComponents['Nodes']

    const [_root, { value: nodes }] = Array.from(engine.getEntitiesWith(Node))[0]

    for (const [currentlySelectedEntity] of engine.getEntitiesWith(Selection)) {
      if (multiple && isAncestorOf(entity, currentlySelectedEntity, nodes as Node[])) {
        store.dispatch(
          error({
            error: ErrorType.AncestorSelected
          })
        )
        return
      }

      if (currentlySelectedEntity !== entity) {
        gizmo = Selection.get(currentlySelectedEntity).gizmo
        if (!multiple) {
          Selection.deleteFrom(currentlySelectedEntity)
          deletedSelection = true
        }
      }
    }

    // then select new entity
    if (!Selection.has(entity) || deletedSelection) {
      Selection.createOrReplace(entity, { gizmo })
    }

    store.dispatch(clearError())
  }
}

export default updateSelectedEntity
