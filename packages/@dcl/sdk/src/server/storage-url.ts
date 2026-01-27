import { getRealm } from '~system/Runtime'

const STORAGE_SERVER_ORG = 'https://storage-server.decentraland.org'
const STORAGE_SERVER_ZONE = 'https://storage-server.decentraland.zone'

/**
 * Determines the correct storage server URL based on the current realm.
 *
 * - If `isPreview` is true, uses the realm's baseUrl (localhost)
 * - If the realm's baseUrl contains `.zone`, uses storage-server.decentraland.zone
 * - Otherwise, uses storage-server.decentraland.org (production)
 *
 * @returns The storage server base URL
 */
export async function getStorageServerUrl(): Promise<string> {
  const { realmInfo } = await getRealm({})

  if (!realmInfo) {
    throw new Error('Unable to retrieve realm information')
  }

  // Local development / preview mode
  if (realmInfo.isPreview) {
    return realmInfo.baseUrl
  }

  // Staging / testing environment
  if (realmInfo.baseUrl.includes('.zone')) {
    return STORAGE_SERVER_ZONE
  }

  // Production environment
  return STORAGE_SERVER_ORG
}
