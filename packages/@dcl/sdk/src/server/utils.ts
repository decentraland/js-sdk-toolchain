import { signedFetch, SignedFetchRequest } from '~system/SignedFetch'
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

/**
 * Result type for operations that can fail.
 * Returns a tuple of [error, null] on failure or [null, data] on success.
 */
export type Result<T, E = string> = [E, null] | [null, T]

/**
 * Extended result type that includes HTTP status code information.
 */
export type FetchResult<T> = [string, null, number?] | [null, T, number]

/**
 * Wraps a promise to catch errors and return a Result tuple.
 * This allows for cleaner error handling without try-catch blocks.
 *
 * @param promise - The promise to wrap
 * @returns A tuple of [error, null] on failure or [null, data] on success
 */
export async function tryCatch<T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> {
  try {
    const data = await promise
    return [null, data]
  } catch (error) {
    return [error as E, null]
  }
}

/**
 * Wraps signedFetch with automatic error handling and JSON parsing.
 * Returns a FetchResult tuple with parsed JSON data or error message and status code.
 *
 * @param signedFetchBody - The signedFetch request configuration
 * @returns A tuple of [error, null, statusCode?] on failure or [null, data, statusCode] on success
 */
export async function wrapSignedFetch<T = unknown>(signedFetchBody: SignedFetchRequest): Promise<FetchResult<T>> {
  const [error, response] = await tryCatch(signedFetch(signedFetchBody))

  if (error) {
    console.error(`Error in ${signedFetchBody.url} endpoint`, { error })
    return [error.message, null, undefined]
  }

  if (!response.ok) {
    const errorMessage = `${response.status} ${response.statusText}`
    console.error(`Error in ${signedFetchBody.url} endpoint`, { response })
    return [errorMessage, null, response.status]
  }

  const [parseError, body] = await tryCatch<T>(JSON.parse(response.body || '{}'))

  if (parseError) {
    console.error(`Failed to parse response from ${signedFetchBody.url}`)
    return ['Failed to parse response', null, response.status]
  }

  return [null, (body ?? {}) as T, response.status]
}
