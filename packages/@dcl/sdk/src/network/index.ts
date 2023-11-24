import { engine } from '@dcl/ecs'
import { addSyncTransport } from './message-bus-sync'

// initialize sync transport for sdk engine
const { getChilds, getFirstChild, syncEntity, parentEntity, getParent, myProfile } = addSyncTransport(engine)

export { getChilds, getFirstChild, syncEntity, parentEntity, getParent, myProfile }
