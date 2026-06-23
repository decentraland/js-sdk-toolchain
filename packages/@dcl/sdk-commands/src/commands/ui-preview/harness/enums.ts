// Maps the protobuf Yoga/text enums (numeric values from
// @dcl/ecs ui_transform.gen.ts & common/texts.gen.ts) to their CSS equivalents.
// We map by numeric value rather than importing the const enums to avoid any
// const-enum inlining surprises across the dist boundary.

export interface Color4 {
  r: number
  g: number
  b: number
  a: number
}

// YGUnit: 0 UNDEFINED, 1 POINT, 2 PERCENT, 3 AUTO
export function unitValue(value: number, unit: number): string | undefined {
  switch (unit) {
    case 1:
      return `${value}px`
    case 2:
      return `${value}%`
    case 3:
      return 'auto'
    default:
      return undefined // UNDEFINED → let CSS use its default
  }
}

export function color4ToCss(c?: Color4): string | undefined {
  if (!c) return undefined
  const r = Math.round((c.r ?? 0) * 255)
  const g = Math.round((c.g ?? 0) * 255)
  const b = Math.round((c.b ?? 0) * 255)
  const a = c.a ?? 1
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

// YGDisplay: 0 FLEX, 1 NONE
export const DISPLAY: Record<number, string> = { 0: 'flex', 1: 'none' }

// YGFlexDirection: 0 row, 1 column, 2 column-reverse, 3 row-reverse
export const FLEX_DIRECTION: Record<number, string> = {
  0: 'row',
  1: 'column',
  2: 'column-reverse',
  3: 'row-reverse'
}

// YGJustify: 0 flex-start, 1 center, 2 flex-end, 3 space-between, 4 space-around, 5 space-evenly
export const JUSTIFY: Record<number, string> = {
  0: 'flex-start',
  1: 'center',
  2: 'flex-end',
  3: 'space-between',
  4: 'space-around',
  5: 'space-evenly'
}

// YGAlign: 0 auto, 1 flex-start, 2 center, 3 flex-end, 4 stretch, 5 baseline, 6 space-between, 7 space-around
export const ALIGN: Record<number, string> = {
  0: 'auto',
  1: 'flex-start',
  2: 'center',
  3: 'flex-end',
  4: 'stretch',
  5: 'baseline',
  6: 'space-between',
  7: 'space-around'
}

// YGWrap: 0 nowrap, 1 wrap, 2 wrap-reverse
export const FLEX_WRAP: Record<number, string> = { 0: 'nowrap', 1: 'wrap', 2: 'wrap-reverse' }

// YGOverflow: 0 visible, 1 hidden, 2 scroll
export const OVERFLOW: Record<number, string> = { 0: 'visible', 1: 'hidden', 2: 'scroll' }

// YGPositionType: 0 relative, 1 absolute
export const POSITION_TYPE: Record<number, string> = { 0: 'relative', 1: 'absolute' }

// Font: 0 sans-serif, 1 serif, 2 monospace
export const FONT_FAMILY: Record<number, string> = {
  0: 'ui-sans-serif, system-ui, sans-serif',
  1: 'ui-serif, Georgia, serif',
  2: 'ui-monospace, SFMono-Regular, monospace'
}

// TextAlignMode (TAM_*): 0 top-left .. 8 bottom-right (3x3 grid)
// Returns the CSS justify/align (horizontal/vertical) + text-align for a text box.
export function textAlign(tam: number): { justify: string; align: string; textAlign: string } {
  const row = Math.floor(tam / 3) // 0 top, 1 middle, 2 bottom
  const col = tam % 3 // 0 left, 1 center, 2 right
  const vertical = ['flex-start', 'center', 'flex-end'][row] ?? 'flex-start'
  const horizontal = ['flex-start', 'center', 'flex-end'][col] ?? 'flex-start'
  const text = ['left', 'center', 'right'][col] ?? 'left'
  return { justify: horizontal, align: vertical, textAlign: text }
}
