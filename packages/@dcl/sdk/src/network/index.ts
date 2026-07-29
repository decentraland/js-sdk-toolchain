/**
 * Public facade of `@dcl/sdk/network`.
 *
 * Boot lives in `addSyncTransport`, which takes every runtime dependency as a
 * parameter; this module is the one place that binds them to the real `~system`
 * APIs and the global engine. The call stays at module scope because a scene
 * only ever imports this module — the generated entrypoint calls `onStart` /
 * `onUpdate` and never an initializer, so importing has to be what boots the
 * layer. Tests call `addSyncTransport` directly instead of importing here.
 */
import { sendBinary } from '~system/CommunicationsController'
import { engine } from '@dcl/ecs'
import { addSyncTransport } from './message-bus-sync'
import { getUserData } from '~system/UserIdentity'
import { isServer as isServerApi } from '~system/EngineApi'

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
  isServerAtom
} = addSyncTransport(engine, sendBinary, getUserData, isServerApi, 'network')

// Helper function to check if running on server
export function isServer(): boolean {
  return isServerAtom.getOrNull() ?? false
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
