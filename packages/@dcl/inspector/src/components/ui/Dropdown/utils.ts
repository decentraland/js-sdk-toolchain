export const FONT_SIZE = 13
export const FONT_WEIGHT = 700
export const WIDTH_CONST = 1200
export const ICON_SIZE = 16

export function isOptionSelected(currentValue?: any, optionValue?: any) {
  return currentValue?.toString() === optionValue?.toString()
}

export function isMultipleOptionSelected(currentValue?: any[], optionValue?: any) {
  return (currentValue ?? []).find((value) => value?.toString() === optionValue?.toString())
}
