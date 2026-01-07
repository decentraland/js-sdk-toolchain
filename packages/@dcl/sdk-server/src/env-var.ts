import { signedFetch } from '~system/SignedFetch'
import { isServer as isServerApi } from '~system/EngineApi'
import { getStorageServerUrl } from './storage-url'

/**
 * Validates that the code is running on a server-side scene.
 * Throws an error if called from a client-side context.
 */
async function assertIsServer(): Promise<void> {
  const { isServer } = await isServerApi({})
  if (!isServer) {
    throw new Error('EnvVar is only available on server-side scenes')
  }
}

/**
 * EnvVar provides methods to fetch environment variables from the
 * Server Side Storage service. This module only works when running
 * on server-side scenes.
 */
export const EnvVar = {
  /**
   * Fetches all environment variables as plain text.
   *
   * @returns A promise that resolves to the plain text response containing all environment variables
   * @throws Error if not running on a server-side scene
   * @throws Error if the request fails
   */
  async all(): Promise<string> {
    await assertIsServer()

    const baseUrl = await getStorageServerUrl()
    const url = `${baseUrl}/env`

    const response = await signedFetch({
      url,
      init: {
        method: 'GET',
        headers: {}
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch environment variables: ${response.status} ${response.statusText}`)
    }

    return response.body
  },

  /**
   * Fetches a specific environment variable by key as plain text.
   *
   * @param key - The name of the environment variable to fetch
   * @returns A promise that resolves to the plain text value of the environment variable
   * @throws Error if not running on a server-side scene
   * @throws Error if the request fails
   */
  async get(key: string): Promise<string> {
    await assertIsServer()

    const baseUrl = await getStorageServerUrl()
    const url = `${baseUrl}/env/${encodeURIComponent(key)}`

    const response = await signedFetch({
      url,
      init: {
        method: 'GET',
        headers: {}
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch environment variable '${key}': ${response.status} ${response.statusText}`)
    }

    return response.body
  }
}
