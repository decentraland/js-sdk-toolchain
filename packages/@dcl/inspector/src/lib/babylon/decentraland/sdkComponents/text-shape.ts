import future, { IFuture } from 'fp-future'
import * as BABYLON from '@babylonjs/core'
import * as GUI from '@babylonjs/gui'
import { PBTextShape, ComponentType } from '@dcl/ecs'

import type { ComponentOperation } from '../component-operations'
import { EcsEntity } from '../EcsEntity'
import { TEXT_ALIGN_MODES } from '../../../../components/EntityInspector/TextShapeInspector/utils'
import { toHex } from '../../../../components/ui/ColorField/utils'

const ratio = 33

export const putTextShapeComponent: ComponentOperation = async (entity, component) => {
  // load font
  await loadFont()

  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const value = component.getOrNull(entity.entityId) as PBTextShape | null

    // easier to always dispose text mesh for now...
    dispose(entity)

    if (value?.text) {
      const mesh = BABYLON.MeshBuilder.CreatePlane(
        entity.entityId.toString(),
        { width: (value.width ?? 0) / ratio, height: (value.height ?? 0) / ratio },
        entity.getScene()
      )

      const advancedTexture = GUI.AdvancedDynamicTexture.CreateForMesh(mesh, value.width, value.height)

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

  const hair = String.fromCharCode(8202) // hair space
  tb.text = value.text
    // fix letter spacing
    .split('')
    .join(hair)
    // apply lineCount
    .split('\n')
    .map((line, index) => (typeof value.lineCount === 'number' ? (index < value.lineCount ? line : '') : line)) // remove lines if lineCount is set
    .join('\n')
  tb.fontFamily = 'Noto Sans'
  tb.fontSize = (value.fontSize ?? 0) * 3
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
  tb.outlineWidth = (value.outlineWidth ?? 0) * 8
  tb.lineSpacing = value.lineSpacing ?? 0
  tb.color = toHex(value.textColor)
  tb.shadowColor = toHex(value.shadowColor)
  tb.outlineColor = toHex(value.outlineColor)
  // fontAutoSize
  // lineCount ?? 1

  return tb
}

let fontFuture: IFuture<void> | null = null
async function loadFont() {
  if (!fontFuture) {
    fontFuture = future()
    const font = new FontFace(
      'Noto Sans',
      'url(https://fonts.gstatic.com/s/notosans/v36/o-0bIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5a7du3mhPy0.woff2)' // latin
    )
    await font.load()
    document.fonts.add(font)
    fontFuture.resolve()
  }
  return fontFuture
}
