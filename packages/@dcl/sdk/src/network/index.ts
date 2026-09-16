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
  eventBus
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
