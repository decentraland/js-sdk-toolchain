import * as BABYLON from '@babylonjs/core'
import { PBTextShape, ComponentType } from '@dcl/ecs'

import font from '../../../fonts/json/droid-sans.json'
import type { ComponentOperation } from '../component-operations'

export const putTextShapeComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const newValue = component.getOrNull(entity.entityId) as PBTextShape | null

    if (newValue) {
      const text = BABYLON.MeshBuilder.CreateText(
        entity.entityId.toString(),
        "DETALLISTA",
        font,
        {
          size: 16,
          resolution: 64,
          depth: 10
        }
      )  || undefined

      entity.ecsComponentValues.textShape = newValue
      entity.textShape = text
    } else {
      entity.textShape?.dispose()
      entity.ecsComponentValues.textShape = undefined
    }
  }
}
