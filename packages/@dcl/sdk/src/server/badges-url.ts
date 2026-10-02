import { getRealm, getSceneInformation } from '~system/Runtime'

const BADGES_SERVER_ORG = 'https://badges.decentraland.org'
const BADGES_SERVER_ZONE = 'https://badges.decentraland.zone'

type BadgesTarget = { serverUrl: string; world: string }

// Preview reports realmName "LocalPreview"; the delegation is bound to scene.json's world.
async function getPreviewWorldName(): Promise<string | undefined> {
  try {
    const { metadataJson } = await getSceneInformation({})
    const name = JSON.parse(metadataJson)?.worldConfiguration?.name
    return typeof name === 'string' && name ? name.toLowerCase() : undefined
  } catch {
    return undefined
  }
}

async function resolveBadgesTarget(): Promise<BadgesTarget> {
  const { realmInfo } = await getRealm({})

  if (!realmInfo) {
    throw new Error('Unable to retrieve realm information')
  }

  // The world name is what the scene's delegation claim is bound to; the badges
  // service checks the award path's world against it.
  const world = (realmInfo.isPreview && (await getPreviewWorldName())) || realmInfo.realmName
  if (!world) {
    throw new Error('Unable to retrieve the realm name')
  }

  // Local development / preview mode: the realm's own origin (a local stub)
  if (realmInfo.isPreview) {
    return { serverUrl: realmInfo.baseUrl, world }
  }

  // Staging / testing environment
  if (realmInfo.baseUrl.includes('.zone')) {
    return { serverUrl: BADGES_SERVER_ZONE, world }
  }

  // Production environment
  return { serverUrl: BADGES_SERVER_ORG, world }
}

let memoized: Promise<BadgesTarget> | null = null

/**
 * Resolves the badges service base URL and the world this scene runs in.
 *
 * - If `isPreview` is true, the URL is the realm's baseUrl (localhost) and the
 *   world is scene.json's `worldConfiguration.name` (falling back to the realm name)
 * - If the realm's baseUrl contains `.zone`, badges.decentraland.zone
 * - Otherwise badges.decentraland.org (production)
 *
 * The realm never changes mid-session, so the result is memoized; a failed
 * resolution is not memoized so transient getRealm errors can be retried.
 */
export function getBadgesTarget(): Promise<BadgesTarget> {
  if (!memoized) {
    memoized = resolveBadgesTarget()
    memoized.catch(() => {
      memoized = null
    })
  }
  return memoized
}
