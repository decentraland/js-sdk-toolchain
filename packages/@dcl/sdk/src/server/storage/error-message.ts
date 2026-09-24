/**
 * The message of a thrown value, or `fallback` when it carries none.
 * @internal
 */
export function errorMessage(error: unknown, fallback = 'unknown error'): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  return message || fallback
}
