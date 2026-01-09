import { sendBinary } from '~system/CommunicationsController'
import { engine } from '@dcl/ecs'
import { addSyncTransport } from './message-bus-sync'
import { getUserData } from '~system/UserIdentity'
import { boedo } from '@dcl/ecs/dist/serialization/crdt/boedoTest'

// initialize sync transport for sdk engine
const { getChildren, syncEntity, parentEntity, getParent, myProfile, removeParent, getFirstChild, isStateSyncronized } =
  addSyncTransport(engine, sendBinary, getUserData)

export { getFirstChild, getChildren, syncEntity, parentEntity, getParent, myProfile, removeParent, isStateSyncronized }
export { boedo }
