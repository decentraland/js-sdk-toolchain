import { YGUnit } from '@dcl/ecs'
import { Position, PositionUnit } from './types'

function capitalize<T extends string>(value: T): Capitalize<T> {
  return `${value[0].toUpperCase()}${value.slice(
    1,
    value.length
  )}` as Capitalize<T>
}

type PropName = 'position' | 'margin' | 'padding'
type PropKey = `${PropName}${Capitalize<keyof Position>}`
type PropKeyUnit = `${PropName}${Capitalize<keyof Position>}Unit`
type PositionParsed = {
  [key in PropKey]?: number
} & {
  [key in PropKeyUnit]?: YGUnit
}

function isPercent(val: PositionUnit) {
  return typeof val === 'string' && val.endsWith('%')
}
function isPoint(val: PositionUnit) {
  return typeof val === 'string' && val.endsWith('px')
}

function parsePositionUnit(val?: PositionUnit): [number | undefined, YGUnit] {
  function getValue(key: 'px' | '%', value: string) {
    return Number(value.slice(0, value.indexOf(key)))
  }

  if (val === undefined || val === null) {
    return [undefined, YGUnit.YGU_UNDEFINED]
  }

  if (typeof val === 'number') {
    return [Number(val), YGUnit.YGU_POINT]
  }

  if (isPercent(val)) {
    return [getValue('%', val), YGUnit.YGU_PERCENT]
  }

  if (isPoint(val)) {
    return [getValue('px', val), YGUnit.YGU_POINT]
  }

  return [undefined, YGUnit.YGU_UNDEFINED]
}

// position: { top: '1px' } => { positionTop: 1, positionTopUnit: YGUnit.YGU_Point }
export function parsePosition<T extends PropName>(
  position: Partial<Position> = {},
  prop: T
) {
  const obj: Partial<PositionParsed> = {}
  for (const key in position) {
    const typedKey: keyof Position = key as keyof Position
    const propKey: PropKey = `${prop}${capitalize(typedKey)}`
    const propKeyUnit: PropKeyUnit = `${prop}${capitalize(typedKey)}Unit`
    const [value, unit] = parsePositionUnit(position[typedKey]!)
    if (value === undefined) continue
    obj[propKeyUnit] = unit
    obj[propKey] = value
  }
  return obj
}

// Size Props
type HeightWidth = 'height' | 'width'
type SizePropName =
  | HeightWidth
  | `max${Capitalize<HeightWidth>}`
  | `min${Capitalize<HeightWidth>}`
type SizePropKeyUnit = `${SizePropName}Unit`
type SizeReturnType = {
  [key in SizePropName]: number
} & { [key in SizePropKeyUnit]: YGUnit }
export function parseSize(
  val: PositionUnit | undefined,
  key: SizePropName
): Partial<SizeReturnType> {
  const unitKey: SizePropKeyUnit = `${key}Unit`
  const [value, unit] = parsePositionUnit(val)

  if (value === undefined) return {}

  return {
    [key]: value,
    [unitKey]: unit
  }
}
