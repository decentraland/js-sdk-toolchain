import { engine } from '@dcl/ecs'
import { addSyncTransport } from './message-bus-sync'

// initialize sync transport for sdk engine
const { getChildren, syncEntity, parentEntity, getParent, myProfile, removeParent, getFirstChild } =
  addSyncTransport(engine)

export { getFirstChild, getChildren, syncEntity, parentEntity, getParent, myProfile, removeParent }
