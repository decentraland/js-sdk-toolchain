import { Position, PositionUnit, YGUnit } from './types'

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
  return val.endsWith('%')
}
function isPoint(val: PositionUnit) {
  return val.endsWith('px')
}

function parsePositionUnit(val: PositionUnit): [number, YGUnit] {
  function getValue(key: 'px' | '%') {
    return Number(val.slice(0, val.indexOf(key)))
  }
  if (isPercent(val)) {
    return [getValue('%'), YGUnit.YGU_PERCENT]
  }
  if (isPoint(val)) {
    return [getValue('px'), YGUnit.YGU_POINT]
  }
  return [0, YGUnit.YGU_UNDEFINED]
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
    obj[propKeyUnit] = unit
    obj[propKey] = value
  }
  return obj
}
