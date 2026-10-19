import { sendBinary } from '~system/CommunicationsController'
import { engine } from '@dcl/ecs'
import { addSyncTransport } from './message-bus-sync'
import { getUserData } from '~system/UserIdentity'
import { isServer as isServerApi } from '~system/EngineApi'
import { Atom } from '../atom'
import type { ClockSyncStats } from './clock-sync'

// Create isServer atom for consistent state
const isServerAtom = Atom<boolean>(false)
void isServerApi({}).then((response) => {
  isServerAtom.swap(!!response.isServer)
})

// Helper function to check if running on server
export function isServer(): boolean {
  return isServerAtom.getOrNull() ?? false
}

// initialize sync transport for sdk engine
const {
  getChildren,
  syncEntity,
  parentEntity,
  getParent,
  myProfile,
  removeParent,
  getFirstChild,
  isStateSyncronized,
  binaryMessageBus,
  eventBus,
  clockSync
} = addSyncTransport(engine, sendBinary, getUserData, isServerApi, 'network')

/**
 * Estimated authoritative-server clock, in milliseconds since the epoch, or undefined until the first
 * ping has been answered. Every client in the room converges on this clock, so it is the one to schedule
 * shared events against (countdowns, song positions, race starts). Corrections are slewed rather than
 * jumped and the value never decreases while connected. The server returns its own clock.
 * @public
 */
export function getServerTime(): number | undefined {
  return clockSync.getServerTime()
}

/**
 * Quality of the current server-clock estimate: offset, round trip, sample count, frozen flag.
 * Undefined until the first ping has been answered. Clients only.
 * @public
 */
export function getClockSyncStats(): ClockSyncStats | undefined {
  return clockSync.getStats()
}

/**
 * Hold the server-clock estimate fixed so `getServerTime()` keeps a constant rate while something
 * time-critical runs, for example a synchronized performance. Safe to call every frame; a freeze requested
 * before the first reply holds the first estimate. Pass false to slew back to the live estimate. Clients only.
 * @public
 */
export function freezeServerClock(frozen: boolean) {
  clockSync.freeze(frozen)
}

/**
 * Server only: the median of a player's recent round trips in milliseconds, capped at 500, or undefined if
 * that player has not acknowledged a clock reply yet. A client can inflate it up to the cap by delaying its
 * acks, so treat it as a bound on how early a client may claim an input happened, never as a fact.
 * @public
 */
export function getPlayerLatency(userId: string): number | undefined {
  return clockSync.getPlayerLatency(userId)
}

export type { ClockSyncStats }

// Re-export the room messaging system
export { registerMessages, getRoom } from './events'

export {
  getFirstChild,
  getChildren,
  syncEntity,
  parentEntity,
  getParent,
  myProfile,
  removeParent,
  isStateSyncronized,
  binaryMessageBus,
  eventBus
}
