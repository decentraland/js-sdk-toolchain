import { getStorageServerUrl } from './storage-url'
import { assertIsServer, wrapSignedFetch } from './utils'

const MODULE_NAME = 'EnvVar'

/**
 * EnvVar provides methods to fetch environment variables from the
 * Server Side Storage service. This module only works when running
 * on server-side scenes.
 */
export const EnvVar = {
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

    const [error, data] = await wrapSignedFetch<{ value: string }>({
      url
    })

    if (error) {
      console.error(`Failed to fetch environment variable '${key}': ${error}`)
      return ''
    }

    return data?.value ?? ''
  }
}
