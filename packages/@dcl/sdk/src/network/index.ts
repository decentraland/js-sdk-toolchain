import { sendBinary } from '~system/CommunicationsController'
import { engine } from '@dcl/ecs'
import { addSyncTransport } from './message-bus-sync'
import { getUserData } from '~system/UserIdentity'
import { isServer as isServerApi } from '~system/EngineApi'
import { Atom } from '../atom'

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
 * shared events against (countdowns, song positions, race starts). The server returns its own clock.
 * @public
 */
export function getServerTime(): number | undefined {
  return isServer() ? Date.now() : clockSync.getServerTime()
}

/**
 * Quality of the current server-clock estimate: offset, round trip, sample count, frozen flag.
 * Undefined until the first ping has been answered. Clients only.
 * @public
 */
export function getClockSyncStats() {
  return clockSync.getStats()
}

/**
 * Hold the server-clock estimate fixed so `getServerTime()` cannot jump while something time-critical runs,
 * for example a synchronized performance. Pass false to resume following the live estimate. Clients only.
 * @public
 */
export function freezeServerClock(frozen: boolean) {
  clockSync.freeze(frozen)
}

/**
 * Server only: the last measured round trip to a connected player in milliseconds, or undefined if that
 * player has not acknowledged a clock reply yet. Use half of it to bound how early a client may claim an
 * input happened relative to the server's own arrival time.
 * @public
 */
export function getPlayerLatency(userId: string): number | undefined {
  return clockSync.getPlayerLatency(userId)
}

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
