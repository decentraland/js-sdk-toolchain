import future, { IFuture } from 'fp-future'
import * as BABYLON from '@babylonjs/core'
import * as GUI from '@babylonjs/gui'
import { PBTextShape, ComponentType } from '@dcl/ecs'

import type { ComponentOperation } from '../component-operations'
import { EcsEntity } from '../EcsEntity'
import {
  TEXT_ALIGN_MODES,
  getBabylonGUIOffset,
  toBabylonGUIAlignment
} from '../../../../components/EntityInspector/TextShapeInspector/utils'
import { toHex } from '../../../../components/ui/ColorField/utils'

export const TEXT_SHAPE_RATIO = 33

export const putTextShapeComponent: ComponentOperation = async (entity, component) => {
  // load font
  await loadFont()

  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const value = component.getOrNull(entity.entityId) as PBTextShape | null

    // easier to always dispose text mesh for now...
    dispose(entity)

    if (value?.text) {
      // create a temp text block to measure the text size
      let tb = createTextBlock(value)
      const canvas = GUI.AdvancedDynamicTexture.CreateFullscreenUI('canvas')
      const ctx = canvas.getContext()
      ctx.font = `${tb.fontSizeInPixels}px ${tb.fontFamily}`
      canvas.dispose()
      const lines = tb.text.split('\n')
      const longest = lines.reduce((a, b) => (a.length > b.length ? a : b))
      const measure = ctx.measureText(longest)
      const paddingX = parseFloat(tb.paddingLeft.toString()) + parseFloat(tb.paddingRight.toString())
      const paddingY = parseFloat(tb.paddingTop.toString()) + parseFloat(tb.paddingBottom.toString())
      const width = measure.width + paddingX
      const baseLineSpace = tb.fontSizeInPixels / 2
      const lineSpace = (typeof tb.lineSpacing === 'string' ? parseInt(tb.lineSpacing) : tb.lineSpacing) + baseLineSpace
      const spaceBetween = (lines.length - 1) * lineSpace
      const height = tb.fontSizeInPixels * lines.length + spaceBetween + paddingY

      // create actual text block usingt the right width and height
      tb = createTextBlock({ ...value, width, height })

      const mesh = BABYLON.MeshBuilder.CreatePlane(
        entity.entityId.toString(),
        { width: width / TEXT_SHAPE_RATIO, height: height / TEXT_SHAPE_RATIO },
        entity.getScene()
      )

      const advancedTexture = GUI.AdvancedDynamicTexture.CreateForMesh(mesh, width, height)

      advancedTexture.addControl(tb)

      mesh.parent = entity

      const [vertical, horizontal] = getBabylonGUIOffset(value.textAlign ?? TEXT_ALIGN_MODES[0].value, width, height)
      mesh.position.x += horizontal / TEXT_SHAPE_RATIO
      mesh.position.y -= vertical / TEXT_SHAPE_RATIO
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

function createTextBlock(value: PBTextShape) {
  const tb = new GUI.TextBlock()
  const [horizontalAlignment, verticalAlignment] = toBabylonGUIAlignment(value.textAlign ?? TEXT_ALIGN_MODES[0].value)

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
  tb.textHorizontalAlignment = horizontalAlignment
  tb.textVerticalAlignment = verticalAlignment
  tb.textWrapping = true
  tb.paddingTop = (value.paddingTop ?? 0) * TEXT_SHAPE_RATIO
  tb.paddingRight = (value.paddingRight ?? 0) * TEXT_SHAPE_RATIO
  tb.paddingBottom = (value.paddingBottom ?? 0) * TEXT_SHAPE_RATIO
  tb.paddingLeft = (value.paddingLeft ?? 0) * TEXT_SHAPE_RATIO
  tb.outlineWidth = (value.outlineWidth ?? 0) * 16
  tb.lineSpacing = (value.lineSpacing ?? 0) / 4.5
  tb.color = toHex(value.textColor)
  tb.outlineColor = toHex(value.outlineColor)

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
