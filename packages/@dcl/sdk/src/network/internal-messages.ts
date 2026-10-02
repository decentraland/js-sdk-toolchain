import { Schemas } from '@dcl/ecs'
import { getEventRegistry, getRoom, Room } from './events/implementation'
import { DEBUG_NETWORK_MESSAGES } from './message-bus-sync'

declare let require: any

// Not in @dcl/protocol yet; older explorers don't expose it.
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
    await getRoom<typeof InternalMessages>().send(BADGE_AWARDED, { badgeId }, { to: [address] })
  } catch (error) {
    DEBUG_NETWORK_MESSAGES() && console.log('[Badges] awarded hint not sent', error)
  }
}

async function checkBadgeAwards(): Promise<void> {
  try {
    const badges: BadgesModule | undefined = require('~system/Badges')
    await badges?.checkAwards({})
  } catch (error) {
    DEBUG_NETWORK_MESSAGES() && console.log('[Badges] ~system/Badges unavailable', error)
  }
}
