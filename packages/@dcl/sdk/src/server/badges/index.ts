import { sendBadgeAwarded } from '../../network/internal-messages'
import { getBadgesTarget } from '../badges-url'
import { assertIsServer, wrapSignedFetch } from '../utils'

const MODULE_NAME = 'Badges'

// A wallet address, any casing. Lowercased into the award path.
const ADDRESS = /^0x[0-9a-fA-F]{40}$/
// The creator's badge slug as registered for the world.
const BADGE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/

/**
 * Badges lets an authoritative scene server award a scene badge, registered
 * for this world, to a player currently in the scene.
 */
export interface IBadges {
  /**
   * Awards `badgeId` to `address`.
   *
   * The request is signed by the host with the scene's delegation only when
   * `address` is a player currently connected to this scene; otherwise the
   * badges service rejects it. Resolves to `true` when the service recorded
   * the award (including when it already existed), `false` otherwise. Never
   * throws for a rejected award; check the result.
   *
   * @param address - The player's wallet address
   * @param badgeId - The badge id, as registered for this world
   * @throws Error if not running on a server-side scene
   */
  award(address: string, badgeId: string): Promise<boolean>
}

export const Badges: IBadges = {
  async award(address: string, badgeId: string): Promise<boolean> {
    assertIsServer(MODULE_NAME)

    if (!ADDRESS.test(address)) {
      console.error(`[${MODULE_NAME}] award rejected: '${address}' is not a wallet address`)
      return false
    }
    if (!BADGE_ID.test(badgeId)) {
      console.error(`[${MODULE_NAME}] award rejected: '${badgeId}' is not a valid badge id`)
      return false
    }

    let serverUrl: string
    let world: string
    try {
      ;({ serverUrl, world } = await getBadgesTarget())
    } catch (e) {
      console.error(`[${MODULE_NAME}] award of '${badgeId}' failed: ${(e as Error).message}`)
      return false
    }

    const url = `${serverUrl}/worlds/${encodeURIComponent(world)}/badges/${badgeId}/awards/${address.toLowerCase()}`

    const [error, , status] = await wrapSignedFetch({
      url,
      init: {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: '{}'
      }
    })

    if (error) {
      console.error(`[${MODULE_NAME}] award of '${badgeId}' to ${address} rejected (${status ?? 'network'}): ${error}`)
      return false
    }

    if (status === 201) void sendBadgeAwarded(address, badgeId)

    return true
  }
}
