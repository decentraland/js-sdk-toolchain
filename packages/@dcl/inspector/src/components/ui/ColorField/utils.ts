import { Color4, Color3 } from '@dcl/ecs-math'

export enum Options {
  BASICS,
  CUSTOM
}

export const OPTIONS = [
  {
    value: Options.BASICS,
    label: 'Basics'
  },
  {
    value: Options.CUSTOM,
    label: 'Custom'
  }
]

export const COLORS = [
  {
    value: '#FFFFFF',
    label: 'White'
  },
  {
    value: '#000000',
    label: 'Black'
  },
  {
    value: '#FFA500',
    label: 'Orange'
  },
  {
    value: '#0000FF',
    label: 'Blue'
  },
  {
    value: '#FF0000',
    label: 'Red'
  },
  {
    value: '#FFFF00',
    label: 'Yellow'
  },
  {
    value: '#00FF00',
    label: 'Green'
  }
]

export function toHex(value?: Color4 | Color3): string {
  if (!value) return COLORS[0].value
  return Color3.toHexString(value)
}

export function toColor4(value?: string) {
  if (!value) return Color4.fromHexString(COLORS[0].value)
  return Color4.fromHexString(value)
}

export function toColor3(value?: string) {
  if (!value) return Color3.fromHexString(COLORS[0].value)
  return Color3.fromHexString(value)
}
