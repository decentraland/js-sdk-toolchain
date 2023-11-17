import { Transport, engine } from '@dcl/ecs'
import { sendBinary } from '~system/CommunicationsController'

import { syncFilter } from './filter'
import { engineToCrdt } from './state'
import { serializeCrdtMessages } from '../internal/transports/logger'
import { BinaryMessageBus, CommsMessage } from './binary-message-bus'
import {
  addOnLeaveSceneListener,
  getOwnProfile,
  oldestUser,
  setInitialized,
  stateInitialized,
  stateInitializedChecker,
  syncTransportIsReady
} from './utils'

// List of MessageBuss messsages to be sent on every frame to comms
const pendingMessageBusMessagesToSend: Uint8Array[] = []
const binaryMessageBus = BinaryMessageBus((message) => pendingMessageBusMessagesToSend.push(message))
function getMessagesToSend() {
  const messages = [...pendingMessageBusMessagesToSend]
  pendingMessageBusMessagesToSend.length = 0
  return messages
}

// user that we asked for the inital crdt state
export async function addSyncTransport() {
  await getOwnProfile()

  // Add Sync Transport
  const transport: Transport = {
    filter: syncFilter,
    send: async (message: Uint8Array) => {
      if (syncTransportIsReady() && message.byteLength) {
        binaryMessageBus.emit(CommsMessage.CRDT, message)
      }
      const messages = getMessagesToSend()
      const response = await sendBinary({ data: messages })
      binaryMessageBus.__processMessages(response.data)
    },
    type: 'network'
  }
  engine.addTransport(transport)
  // End add sync transport

  // Add state intialized checker
  engine.addSystem(stateInitializedChecker)

  // Listener to have the oldest list up-to-date
  addOnLeaveSceneListener()

  // Request initial state
  binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, new Uint8Array())

  // If we dont have any state initialized, and recieve a state message.
  binaryMessageBus.on(CommsMessage.RES_CRDT_STATE, (value) => {
    console.log(Array.from(serializeCrdtMessages('[binaryMessageBus]: ', value, engine)))
    if (!stateInitialized) {
      setInitialized()
      transport.onmessage!(value)
    }
  })

  // If we are the oldest user and we recieve a req of a state we send it.
  binaryMessageBus.on(CommsMessage.REQ_CRDT_STATE, () => {
    if (stateInitialized && oldestUser()) {
      binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, engineToCrdt(engine))
    }
  })

  // Process CRDT messages here
  binaryMessageBus.on(CommsMessage.CRDT, (value) => {
    transport.onmessage!(value)
  })
}
