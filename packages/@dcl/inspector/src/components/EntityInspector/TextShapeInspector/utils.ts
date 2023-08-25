import { PBTextShape } from '@dcl/ecs'

import { TextShapeInput } from './types'

const toNumber = (value: string, min?: number) => {
  const num = Number(value) || 0
  return min ? Math.min(num, min) : num
}

const toString = (value: unknown, def: number = 0) => (value ?? def).toString()

export const fromTextShape = (value: PBTextShape): TextShapeInput => {
  return {
    text: value.text,
    font: toString(value.font, 0),
    fontSize: toString(value.fontSize, 10),
    fontAutoSize: !!value.fontAutoSize,
    width: toString(value.width, 100),
    height: toString(value.height, 100),
    textAlign: toString(value.textAlign, 0),
    textWrapping: !!value.textWrapping,
    paddingTop: toString(value.paddingTop, 0),
    paddingRight: toString(value.paddingRight, 0),
    paddingBottom: toString(value.paddingBottom, 0),
    paddingLeft: toString(value.paddingLeft, 0),
    shadowBlur: toString(value.shadowBlur, 0),
    shadowOffsetX: toString(value.shadowOffsetX, 0),
    shadowOffsetY: toString(value.shadowOffsetY, 0),
    outlineWidth: toString(value.outlineWidth, 0),
    lineSpacing: toString(value.lineSpacing, 0),
    lineCount: toString(value.lineCount, 1)
  }
}

export const toTextShape = (value: TextShapeInput): PBTextShape => {
  return {
    text: value.text,
    font: FONTS.find(($) => $.value === Number(value.font))?.value || 0,
    fontSize: toNumber(value.fontSize, 0),
    fontAutoSize: !!value.fontAutoSize,
    width: toNumber(value.width, 0),
    height: toNumber(value.height, 0),
    textAlign: TEXT_ALIGN_MODES.find(($) => $.value === Number(value.textAlign))?.value || 4,
    textWrapping: !!value.textWrapping,
    paddingTop: toNumber(value.paddingTop, 0),
    paddingRight: toNumber(value.paddingRight, 0),
    paddingBottom: toNumber(value.paddingBottom, 0),
    paddingLeft: toNumber(value.paddingLeft, 0),
    shadowBlur: toNumber(value.shadowBlur, 0),
    shadowOffsetX: toNumber(value.shadowOffsetX, 0),
    shadowOffsetY: toNumber(value.shadowOffsetY, 0),
    outlineWidth: toNumber(value.outlineWidth, 0),
    lineSpacing: toNumber(value.lineSpacing, 0),
    lineCount: toNumber(value.lineCount, 1)
  }
}

export function isValidInput(): boolean {
  return true
}

// this interfaces (Font & TextAlignMode) are exported as const, thus not existing at runtime
// maybe we could enable "preserveConstEnums" ts flag?
export const FONTS = [{
  value: 0,
  label: 'Sans Serif'
}, {
  value: 1,
  label: 'Serif'
}, {
  value: 2,
  label: 'Monospace'
}]

export const TEXT_ALIGN_MODES = [{
  value: 0,
  label: 'Top left'
}, {
  value: 1,
  label: 'Top center'
}, {
  value: 2,
  label: 'Top right'
}, {
  value: 3,
  label: 'Middle left'
}, {
  value: 4,
  label: 'Middle center'
}, {
  value: 5,
  label: 'Middle right'
}, {
  value: 6,
  label: 'Bottom left'
}, {
  value: 7,
  label: 'Bottom center'
}, {
  value: 8,
  label: 'Bottom Right'
}]
