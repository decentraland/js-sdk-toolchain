import { Schemas } from '@dcl/ecs'
import { Atom } from '../atom'
import { CommsMessage } from './binary-message-bus'
import { decodeEvent, encodeEvent } from './events/protocol'

declare let require: any

// Read lazily, like message-bus-sync does, without importing it (that import was a cycle).
const debug = () => (globalThis as any).DEBUG_NETWORK_MESSAGES ?? false

// TODO: replace with the generated `~system/Badges` types once decentraland/protocol#497
// is published. Older explorers don't expose the module, hence the guarded require.
type BadgesModule = { checkAwards(body: Record<string, never>): Promise<unknown> }

const BADGE_AWARDED = 'badgeAwarded'

// The SDK's own messages. They travel on CommsMessage.SDK_EVENT, a channel of their own, so
// a scene's Room never sees them and the creators' registry and listeners stay untouched.
const InternalMessages = {
  [BADGE_AWARDED]: Schemas.Map({ badgeId: Schemas.String })
}

type InternalBus = {
  on(message: CommsMessage, callback: (data: Uint8Array, sender: string) => void): void
  emit(message: CommsMessage, data: Uint8Array, toPeerAddress?: string[]): void
}

let bus: InternalBus | undefined

/**
 * Wires the SDK's internal channel. Hints are acted on by clients only, and only when they
 * come from the authoritative server.
 * @internal
 */
export function installInternalMessages(binaryMessageBus: InternalBus, isServer: Atom<boolean>, authServerPeerId: string): void {
  bus = binaryMessageBus

  binaryMessageBus.on(CommsMessage.SDK_EVENT, (data, sender) => {
    if (isServer.getOrNull() || sender !== authServerPeerId) return
    try {
      const { eventType } = decodeEvent(data, InternalMessages)
      if (eventType === BADGE_AWARDED) void checkBadgeAwards()
    } catch (error) {
      debug() && console.log('[Badges] ignored an SDK event', error)
    }
  })
}

/**
 * Server side: tell one player's client that an award landed, so it asks the explorer to
 * check. Carries only the badge id, which the client does not act on.
 * @internal
 */
export async function sendBadgeAwarded(address: string, badgeId: string): Promise<void> {
  try {
    if (!bus) throw new Error('network transport not initialized')
    // Peer ids are lowercased addresses; the award path lowercases too.
    bus.emit(CommsMessage.SDK_EVENT, encodeEvent(BADGE_AWARDED, { badgeId }, InternalMessages), [address.toLowerCase()])
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
