import { Schemas } from '@dcl/ecs'
import { getEventRegistry, getRoom, Room } from './events/implementation'

declare let require: any

// Read lazily, like message-bus-sync does, without importing it (that import was a cycle).
const debug = () => (globalThis as any).DEBUG_NETWORK_MESSAGES ?? false

// TODO: replace with the generated `~system/Badges` types once decentraland/protocol#497
// is published. Older explorers don't expose the module, hence the guarded require.
type BadgesModule = { checkAwards(body: Record<string, never>): Promise<unknown> }

const BADGE_AWARDED = '__dcl:badgeAwarded'

const InternalMessages = {
  [BADGE_AWARDED]: Schemas.Map({ badgeId: Schemas.String })
}

/**
 * @internal
 */
export function installInternalMessages(room: Room): void {
  Object.assign(getEventRegistry(), InternalMessages)
  room.onMessage(BADGE_AWARDED, (_data, context) => {
    if (context) return
    void checkBadgeAwards()
  })
}

/**
 * @internal
 */
export async function sendBadgeAwarded(address: string, badgeId: string): Promise<void> {
  try {
    // Peer ids are lowercased addresses; the award path lowercases too.
    await getRoom<typeof InternalMessages>().send(BADGE_AWARDED, { badgeId }, { to: [address.toLowerCase()] })
  } catch (error) {
    debug() && console.log('[Badges] awarded hint not sent', error)
  }
}

async function checkBadgeAwards(): Promise<void> {
  try {
    const badges: BadgesModule | undefined = require('~system/Badges')
    await badges?.checkAwards({})
  } catch (error) {
    debug() && console.log('[Badges] ~system/Badges unavailable', error)
  }
}
