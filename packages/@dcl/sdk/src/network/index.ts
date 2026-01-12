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

/**
 * Check if the room is ready to receive and send messages.
 * The room is ready when:
 * - Room instance is initialized
 * - commsAdapter is set
 * - isConnectedSceneRoom is true
 * - room identifier is set
 *
 * @returns true if room is ready, false otherwise
 */
export function isRoomReady(): boolean {
  return isRoomReadyAtom.getOrNull() ?? false
}

/**
 * Subscribe to room readiness changes.
 * Useful for reacting when the room becomes ready or disconnects.
 *
 * @param callback - Function called when room readiness changes
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = onRoomReadyChange((isReady) => {
 *   if (isReady) {
 *     console.log('Room is ready! You can now send messages.')
 *     room.send('myEvent', { message: 'Hello!' })
 *   } else {
 *     console.log('Room disconnected')
 *   }
 * })
 *
 * // Later: cleanup
 * unsubscribe()
 * ```
 */
export function onRoomReadyChange(callback: (isReady: boolean) => void): () => void {
  const fn = isRoomReadyAtom.observable.add(callback)
  return () => isRoomReadyAtom.observable.remove(fn)
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
  isRoomReadyAtom
} = addSyncTransport(engine, sendBinary, getUserData, isServerApi, 'network')

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
