import { isServer } from '../network'

/**
 * Validates that the code is running on a server-side scene.
 * Throws an error if called from a client-side context.
 *
 * @param moduleName - The name of the module for the error message
 * @throws Error if not running on a server-side scene
 */
export function assertIsServer(moduleName: string): void {
  if (!isServer()) {
    throw new Error(`${moduleName} is only available on server-side scenes`)
  }
}
