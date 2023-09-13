export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function mapSelectFieldOptions<T extends object>(value: T) {
  return Object.entries(value).map(([_, type]) => ({ value: type, label: capitalize(type) }))
}
