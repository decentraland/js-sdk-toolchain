import { signedFetch } from '~system/SignedFetch'
import { assertIsServer } from './utils'
import { getStorageServerUrl } from './storage-url'

const MODULE_NAME = 'EnvVar'

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
    assertIsServer(MODULE_NAME)

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
      console.error(`Failed to fetch environment variables: ${response.status} ${response.statusText}`)
      return ''
    }

    return response.body
  },

  /**
   * Fetches a specific environment variable by key as plain text.
   *
   * @param key - The name of the environment variable to fetch
   * @returns A promise that resolves to the plain text value, or empty string if not found
   * @throws Error if not running on a server-side scene
   */
  async get(key: string): Promise<string> {
    assertIsServer(MODULE_NAME)

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
      console.error(`Failed to fetch environment variable '${key}': ${response.status} ${response.statusText}`)
      return ''
    }

    return response.body
  }
}
