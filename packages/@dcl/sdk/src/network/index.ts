import { engine } from '@dcl/ecs'
import { addSyncTransport } from './message-bus-sync'

// initialize sync transport for sdk engine
const { getChildren, syncEntity, parentEntity, getParent, myProfile, removeParent } = addSyncTransport(engine)

export { getChildren, syncEntity, parentEntity, getParent, myProfile, removeParent }
