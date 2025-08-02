import { sendBinary } from '~system/CommunicationsController'
import { engine } from '@dcl/ecs'
import { addSyncTransport } from './message-bus-sync'
import { getUserData } from '~system/UserIdentity'
import { isServer } from '~system/EngineApi'

// initialize sync transport for sdk engine
const { getChildren, syncEntity, parentEntity, getParent, myProfile, removeParent, getFirstChild, isStateSyncronized } =
  addSyncTransport(engine, sendBinary, getUserData, isServer, 'network')

export { getFirstChild, getChildren, syncEntity, parentEntity, getParent, myProfile, removeParent, isStateSyncronized }
