import { PBTextShape, Font, TextAlignMode } from '@dcl/ecs'

import { toColor3, toColor4, toHex } from '../../ui/ColorField/utils'
import { toString } from '../utils'
import { TextShapeInput } from './types'

const toNumber = (value: string, min?: number) => {
  const num = Number(value) || 0
  return min ? Math.min(num, min) : num
}

export const fromTextShape = (value: PBTextShape): TextShapeInput => {
  return {
    text: value.text,
    fontSize: toString(value.fontSize, 10),
    fontAutoSize: !!value.fontAutoSize,
    width: toString(value.width, 100),
    height: toString(value.height, 100),
    textAlign: toString(value.textAlign, TextAlignMode.TAM_MIDDLE_CENTER),
    textWrapping: !!value.textWrapping,
    paddingTop: toString(value.paddingTop, 0),
    paddingRight: toString(value.paddingRight, 0),
    paddingBottom: toString(value.paddingBottom, 0),
    paddingLeft: toString(value.paddingLeft, 0),
    shadowBlur: toString(value.shadowBlur, 0),
    shadowOffsetX: toString(value.shadowOffsetX, 0),
    shadowOffsetY: toString(value.shadowOffsetY, 0),
    outlineWidth: toString(Math.floor((value.outlineWidth ?? 0) * 5)),
    lineSpacing: toString(value.lineSpacing, 0),
    lineCount: toString(value.lineCount, 1),
    shadowColor: toHex(value.shadowColor),
    outlineColor: toHex(value.outlineColor),
    textColor: toHex(value.textColor)
  }
}

export const toTextShape = (value: TextShapeInput): PBTextShape => {
  return {
    text: value.text,
    fontSize: toNumber(value.fontSize, 0),
    fontAutoSize: !!value.fontAutoSize,
    width: toNumber(value.width, 0),
    height: toNumber(value.height, 0),
    textAlign: Number(value.textAlign) || TextAlignMode.TAM_MIDDLE_CENTER,
    textWrapping: !!value.textWrapping,
    paddingTop: toNumber(value.paddingTop, 0),
    paddingRight: toNumber(value.paddingRight, 0),
    paddingBottom: toNumber(value.paddingBottom, 0),
    paddingLeft: toNumber(value.paddingLeft, 0),
    shadowBlur: toNumber(value.shadowBlur, 0),
    shadowOffsetX: toNumber(value.shadowOffsetX, 0),
    shadowOffsetY: toNumber(value.shadowOffsetY, 0),
    outlineWidth: toNumber(value.outlineWidth, 0) / 5,
    lineSpacing: toNumber(value.lineSpacing, 0),
    shadowColor: toColor3(value.shadowColor),
    outlineColor: toColor3(value.outlineColor),
    textColor: toColor4(value.textColor)
  }
}

export function isValidInput(): boolean {
  return true
}

// this interfaces (Font & TextAlignMode) are exported as const, thus not existing at runtime
// maybe we could enable "preserveConstEnums" ts flag?
export const FONTS = [
  {
    value: Font.F_SANS_SERIF,
    label: 'Sans Serif'
  },
  {
    value: Font.F_SERIF,
    label: 'Serif'
  },
  {
    value: Font.F_MONOSPACE,
    label: 'Monospace'
  }
]

export const TEXT_ALIGN_MODES = [
  {
    value: TextAlignMode.TAM_TOP_LEFT,
    label: 'Top left'
  },
  {
    value: TextAlignMode.TAM_TOP_CENTER,
    label: 'Top center'
  },
  {
    value: TextAlignMode.TAM_TOP_RIGHT,
    label: 'Top right'
  },
  {
    value: TextAlignMode.TAM_MIDDLE_LEFT,
    label: 'Middle left'
  },
  {
    value: TextAlignMode.TAM_MIDDLE_CENTER,
    label: 'Middle center'
  },
  {
    value: TextAlignMode.TAM_MIDDLE_RIGHT,
    label: 'Middle right'
  },
  {
    value: TextAlignMode.TAM_BOTTOM_LEFT,
    label: 'Bottom left'
  },
  {
    value: TextAlignMode.TAM_BOTTOM_CENTER,
    label: 'Bottom center'
  },
  {
    value: TextAlignMode.TAM_BOTTOM_RIGHT,
    label: 'Bottom Right'
  }
]
