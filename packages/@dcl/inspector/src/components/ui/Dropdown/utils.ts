export const FONT_SIZE = 13
export const FONT_WEIGHT = 700
export const WIDTH_CONST = 1200
export const ICON_SIZE = 16

export function isOptionSelected(currentValue?: any, optionValue?: any) {
  return currentValue?.toString() === optionValue?.toString()
}

export function isMultipleOptionSelected(currentValue?: string | any[], optionValue?: any) {
  const values = typeof currentValue === 'string' ? currentValue.split(',') : currentValue ?? []
  return values.find((value) => value?.toString() === optionValue?.toString())
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function mapSelectFieldOptions<T extends object>(value: T) {
  return Object.entries(value).map(([_, type]) => ({ value: type, label: capitalize(type) }))
}
