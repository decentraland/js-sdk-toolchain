import { YGAlign, YGDisplay, YGFlexDirection, YGJustify, YGOverflow, YGPositionType, YGUnit, YGWrap } from '@dcl/ecs'
import {
  AlignType,
  FlexDirectionType,
  DisplayType,
  FlexWrapType,
  JustifyType,
  OverflowType,
  Position,
  PositionType,
  PositionUnit
} from './types'

function capitalize<T extends string>(value: T): Capitalize<T> {
  return `${value[0].toUpperCase()}${value.slice(1, value.length)}` as Capitalize<T>
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
export function parsePosition<T extends PropName>(position: Partial<Position> = {}, prop: T) {
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
type SizePropName = HeightWidth | `max${Capitalize<HeightWidth>}` | `min${Capitalize<HeightWidth>}`
type SizePropKeyUnit = `${SizePropName}Unit`
type SizeReturnType = {
  [key in SizePropName]: number
} & { [key in SizePropKeyUnit]: YGUnit }
export function parseSize(val: PositionUnit | undefined, key: SizePropName): Partial<SizeReturnType> {
  const unitKey: SizePropKeyUnit = `${key}Unit`
  const [value, unit] = parsePositionUnit(val)

  if (value === undefined) return {}

  return {
    [key]: value,
    [unitKey]: unit
  }
}

/**
 * @internal
 */
export function getDisplay(display: DisplayType | undefined): Record<'display', YGDisplay> {
  const value: YGDisplay = display ? parseDisplay[display] : YGDisplay.YGD_FLEX
  return { display: value }
}
const parseDisplay: Readonly<Record<DisplayType, YGDisplay>> = {
  flex: YGDisplay.YGD_FLEX,
  none: YGDisplay.YGD_NONE
}
/**
 * @internal
 */
export function getJustify(justify: JustifyType | undefined): Record<'justifyContent', YGJustify> {
  const value: YGJustify = justify ? parseJustify[justify] : YGJustify.YGJ_FLEX_START
  return { justifyContent: value }
}
const parseJustify: Readonly<Record<JustifyType, YGJustify>> = {
  center: YGJustify.YGJ_CENTER,
  'flex-end': YGJustify.YGJ_FLEX_END,
  'flex-start': YGJustify.YGJ_FLEX_START,
  'space-around': YGJustify.YGJ_SPACE_AROUND,
  'space-between': YGJustify.YGJ_SPACE_BETWEEN,
  'space-evenly': YGJustify.YGJ_SPACE_EVENLY
}

type AlignProp = 'alignContent' | 'alignItems' | 'alignSelf'
/**
 * @internal
 */
export function getAlign<T extends AlignProp>(
  prop: T,
  align: AlignType | undefined,
  defaultValue: YGAlign
): Record<T, YGAlign> {
  const value: YGAlign = align ? parseAligns[align] : defaultValue
  return { [prop]: value } as Record<T, YGAlign>
}

const parseAligns: Readonly<Record<AlignType, YGAlign>> = {
  auto: YGAlign.YGA_AUTO,
  baseline: YGAlign.YGA_BASELINE,
  center: YGAlign.YGA_CENTER,
  'flex-end': YGAlign.YGA_FLEX_END,
  'flex-start': YGAlign.YGA_FLEX_START,
  stretch: YGAlign.YGA_STRETCH,
  'space-between': YGAlign.YGA_SPACE_BETWEEN,
  'space-around': YGAlign.YGA_SPACE_AROUND
}

/**
 * @internal
 */
export function getFlexDirection(
  flexDirection: FlexDirectionType | undefined
): Record<'flexDirection', YGFlexDirection> {
  const value: YGFlexDirection = flexDirection ? parseFlexDirection[flexDirection] : YGFlexDirection.YGFD_ROW
  return { flexDirection: value }
}

const parseFlexDirection: Readonly<Record<FlexDirectionType, YGFlexDirection>> = {
  row: YGFlexDirection.YGFD_ROW,
  column: YGFlexDirection.YGFD_COLUMN,
  'row-reverse': YGFlexDirection.YGFD_ROW_REVERSE,
  'column-reverse': YGFlexDirection.YGFD_COLUMN_REVERSE
}

/**
 * @internal
 */
export function getFlexWrap(flexWrap: FlexWrapType | undefined): Record<'flexWrap', YGWrap> {
  const value: YGWrap = flexWrap ? parseFlexWrap[flexWrap] : YGWrap.YGW_WRAP
  return { flexWrap: value }
}

const parseFlexWrap: Readonly<Record<FlexWrapType, YGWrap>> = {
  wrap: YGWrap.YGW_WRAP,
  nowrap: YGWrap.YGW_NO_WRAP,
  'wrap-reverse': YGWrap.YGW_WRAP_REVERSE
}

/**
 * @internal
 */
export function getOverflow(overflow: OverflowType | undefined): Record<'overflow', YGOverflow> {
  const value: YGOverflow = overflow ? parseOverflow[overflow] : YGOverflow.YGO_VISIBLE
  return { overflow: value }
}

const parseOverflow: Readonly<Record<OverflowType, YGOverflow>> = {
  visible: YGOverflow.YGO_VISIBLE,
  scroll: YGOverflow.YGO_SCROLL,
  hidden: YGOverflow.YGO_HIDDEN
}

/**
 * @internal
 */
export function getPoistionType(position: PositionType | undefined): Record<'positionType', YGPositionType> {
  const value: YGPositionType = position ? parsePositionType[position] : YGPositionType.YGPT_RELATIVE
  return { positionType: value }
}

const parsePositionType: Readonly<Record<PositionType, YGPositionType>> = {
  relative: YGPositionType.YGPT_RELATIVE,
  absolute: YGPositionType.YGPT_ABSOLUTE
}
