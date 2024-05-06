export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function transformPropertyToLabel(value: string) {
  return value
    .split(/[_-]/)
    .map((word) => capitalize(word))
    .join(' ')
}
