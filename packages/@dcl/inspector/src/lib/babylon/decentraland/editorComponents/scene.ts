import { Schemas } from '@dcl/ecs'
import { Layout } from '../../../utils/layout'
import { getLayoutManager } from '../layout-manager'
import { EditorComponentIds, SceneSchema } from '../../../sdk/components'
import { declareComponentSchemaDefinedComponent } from './schema-component-helper'
import { ComponentType } from 'decentraland-babylon/src/lib/decentraland/crdt-internal/components'

export const putSceneComponent = declareComponentSchemaDefinedComponent(
  EditorComponentIds.Scene,
  Schemas.Map(SceneSchema),
  (entity, component) => {
    if (component.componentType === ComponentType.LastWriteWinElementSet) {
      const value = component.getOrNull(entity.entityId) as { layout: Layout } | null
      if (!value) return

      const context = entity.context.deref()!

      // set layout
      const lm = getLayoutManager(context.babylonScene)
      lm.setLayout(value.layout)
    }
  }
)
