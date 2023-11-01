export function isErrorMessage(error?: boolean | string): boolean {
  return !!error && typeof error === 'string'
}
