/**
 * Internal utilities for standardized globalThis access.
 */

/**
 * Type-safe globalThis property access.
 * @public
 */
export function getGlobal<T>(key: string): T | undefined {
  return (globalThis as any)[key]
}

/**
 * Sets a globalThis property as a polyfill (only if undefined/null).
 * @public
 */
export function setGlobalPolyfill<T>(key: string, value: T): void {
  ;(globalThis as any)[key] = (globalThis as any)[key] ?? value
}
