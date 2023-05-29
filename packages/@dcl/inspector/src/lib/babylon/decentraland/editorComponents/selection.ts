import { Schemas } from '@dcl/ecs'
import { declareComponentSchemaDefinedComponent } from './schema-component-helper'
import { EditorComponentIds, SelectionSchema } from '../../../sdk/components'
import { ComponentType } from 'decentraland-babylon/src/lib/decentraland/crdt-internal/components'
import { SceneContext } from '../SceneContext'

export const entitySelectedComponent = declareComponentSchemaDefinedComponent(
  EditorComponentIds.Selection,
  Schemas.Map(SelectionSchema),
  (entity, component) => {
    if (component.componentType === ComponentType.LastWriteWinElementSet) {
      const componentValue = component.getOrNull(entity.entityId)

      // TODO: show bounding box
      // if (entity.meshRenderer) {
      //   entity.meshRenderer.showBoundingBox = !!componentValue
      // }

      const context = entity.context.deref()! as SceneContext
      let processedSomeEntity = false
      for (const [itEntity] of component.iterator()) {
        processedSomeEntity = true
        if (entity.entityId === itEntity) {
          context.gizmos.setEntity(entity)
          const types = context.gizmos.getGizmoTypes()
          const type = types[componentValue?.gizmo || 0]
          context.gizmos.setGizmoType(type)
          return
        }
      }

      if (!processedSomeEntity) {
        context.gizmos.unsetEntity()
      }
    }
  }
)
