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
      if (component.has(entity.entityId)) {
        const context = entity.context.deref()! as SceneContext
        context.updateSelectedEntity(entity)
      }
    }
  }
)
