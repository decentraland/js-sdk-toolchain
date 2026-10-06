import { getRealm } from '~system/Runtime'

const BADGES_SERVER_ORG = 'https://badges.decentraland.org'
const BADGES_SERVER_ZONE = 'https://badges.decentraland.zone'

async function resolveBadgesServerUrl(): Promise<string> {
  const { realmInfo } = await getRealm({})

  if (!realmInfo) {
    throw new Error('Unable to retrieve realm information')
  }

  // Local development / preview mode: the preview server proxies the award
  if (realmInfo.isPreview) {
    return realmInfo.baseUrl
  }

  // Staging / testing environment: a `.decentraland.zone` realm, matched on the hostname
  if (isZoneHost(realmInfo.baseUrl)) {
    return BADGES_SERVER_ZONE
  }

  // Production environment
  return BADGES_SERVER_ORG
}

function isZoneHost(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname
    return host === 'decentraland.zone' || host.endsWith('.decentraland.zone')
  } catch {
    return false
  }
}

let memoizedUrl: Promise<string> | null = null

/**
 * Determines the badges service base URL based on the current realm.
 *
 * - If `isPreview` is true, uses the realm's baseUrl (localhost)
 * - If the realm's host is under `decentraland.zone`, uses badges.decentraland.zone
 * - Otherwise, uses badges.decentraland.org (production)
 *
 * The realm never changes mid-session, so the result is memoized; a failed
 * resolution is not memoized so transient getRealm errors can be retried.
 *
 * @returns The badges service base URL
 */
export function getBadgesServerUrl(): Promise<string> {
  if (!memoizedUrl) {
    memoizedUrl = resolveBadgesServerUrl()
    memoizedUrl.catch(() => {
      memoizedUrl = null
    })
  }
  return memoizedUrl
}
