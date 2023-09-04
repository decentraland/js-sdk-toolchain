import * as BABYLON from '@babylonjs/core'
import * as GUI from '@babylonjs/gui'
import { PBTextShape, ComponentType } from '@dcl/ecs'

import type { ComponentOperation } from '../component-operations'
import { EcsEntity } from '../EcsEntity'
import { FONTS, TEXT_ALIGN_MODES } from '../../../../components/EntityInspector/TextShapeInspector/utils'

export const putTextShapeComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const value = component.getOrNull(entity.entityId) as PBTextShape | null

    // easier to always dispose text mesh for now...
    dispose(entity)

    if (value?.text) {
      const mesh = BABYLON.MeshBuilder.CreatePlane(
        entity.entityId.toString(),
        { width: 100, height: 100 },
        entity.getScene()
      )
      const advancedTexture = GUI.AdvancedDynamicTexture.CreateForMesh(mesh)

      advancedTexture.addControl(createTextBlock(value))
      mesh.parent = entity
      entity.ecsComponentValues.textShape = value
      entity.textShape = mesh
    }
  }
}

function dispose(entity: EcsEntity) {
  if (entity.textShape) {
    entity.textShape.dispose(false, true)
    entity.textShape.parent = null
    entity.ecsComponentValues.textShape = undefined
    delete entity.textShape
  }
}

function getAlignment(alignment: string) {
  switch (alignment.toLowerCase()) {
    case 'left':
    case 'top':
      return GUI.Control.HORIZONTAL_ALIGNMENT_LEFT
    case 'right':
    case 'bottom':
      return GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT
    default:
      return GUI.Control.HORIZONTAL_ALIGNMENT_CENTER
  }
}

function createTextBlock(value: PBTextShape) {
  const tb = new GUI.TextBlock()
  const [verticalLabel, horizontalLabel] = TEXT_ALIGN_MODES[value.textAlign ?? 0].label.split(' ')

  // map engine props -> babylon props
  tb.text = value.text
  tb.fontFamily = FONTS[value.font ?? 0].label
  tb.fontSize = value.fontSize ?? 0
  tb.width = `${value.width ?? 0}px`
  tb.height = `${value.height ?? 0}px`
  tb.textHorizontalAlignment = getAlignment(horizontalLabel)
  tb.textVerticalAlignment = getAlignment(verticalLabel)
  tb.textWrapping = !!value.textWrapping
  tb.paddingTop = value.paddingTop ?? 0
  tb.paddingRight = value.paddingRight ?? 0
  tb.paddingBottom = value.paddingBottom ?? 0
  tb.paddingLeft = value.paddingLeft ?? 0
  tb.shadowBlur = value.shadowBlur ?? 0
  tb.shadowOffsetX = value.shadowOffsetX ?? 0
  tb.shadowOffsetY = value.shadowOffsetY ?? 0
  tb.outlineWidth = value.outlineWidth ?? 0
  tb.lineSpacing = value.lineSpacing ?? 0

  // textColor
  // fontAutoSize
  // shadowColor
  // outlineColor
  // lineCount ?? 1

  return tb
}
