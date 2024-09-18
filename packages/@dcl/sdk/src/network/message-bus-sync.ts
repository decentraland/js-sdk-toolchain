import { IEngine, Transport } from '@dcl/ecs'
import type { SendBinaryRequest, SendBinaryResponse } from '~system/CommunicationsController'

import { syncFilter } from './filter'
import { engineToCrdt } from './state'
import { BinaryMessageBus, CommsMessage } from './binary-message-bus'
import {
  definePlayersInScene,
  fetchProfile,
  oldestUser as _oldestUser,
  setInitialized,
  stateInitialized,
  stateInitializedChecker
} from './utils'
import { entityUtils } from './entities'
import { GetUserDataRequest, GetUserDataResponse } from '~system/UserIdentity'
// import { serializeCrdtMessages } from '../internal/transports/logger'

export type IProfile = { networkId: number; userId: string }
// user that we asked for the inital crdt state
export function addSyncTransport(
  engine: IEngine,
  sendBinary: (msg: SendBinaryRequest) => Promise<SendBinaryResponse>,
  getUserData: (value: GetUserDataRequest) => Promise<GetUserDataResponse>
) {
  definePlayersInScene(engine)
  // Profile Info
  const myProfile: IProfile = {} as IProfile
  fetchProfile(myProfile!, getUserData)

  // Entity utils
  const entityDefinitions = entityUtils(engine, myProfile)

  // List of MessageBuss messsages to be sent on every frame to comms
  const pendingMessageBusMessagesToSend: Uint8Array[] = []
  const binaryMessageBus = BinaryMessageBus((message) => pendingMessageBusMessagesToSend.push(message))
  function getMessagesToSend() {
    const messages = [...pendingMessageBusMessagesToSend]
    pendingMessageBusMessagesToSend.length = 0
    return messages
  }

  // Add Sync Transport
  const transport: Transport = {
    filter: syncFilter(engine),
    send: async (message: Uint8Array) => {
      if (message.byteLength) {
        // console.log(Array.from(serializeCrdtMessages('[send CRDT]: ', message, engine)))
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
  engine.addSystem(() => stateInitializedChecker(engine, myProfile, entityDefinitions.syncEntity))

  // Request initial state
  binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, new Uint8Array())

  // If we dont have any state initialized, and recieve a state message.
  binaryMessageBus.on(CommsMessage.RES_CRDT_STATE, (value) => {
    if (!stateInitialized) {
      setInitialized()
      transport.onmessage!(value)
    }
  })

  binaryMessageBus.on(CommsMessage.REQ_CRDT_STATE, () => {
    // TODO: maybe remove this line ?
    // If we send an outdated CRDT, the other clients will ignore it.
    // But maybe, two clients enters at the same time with custom network entities
    // and if the state was not initialized, those entities were never sent.
    if (stateInitialized) {
      binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, engineToCrdt(engine))
    }
  })

  // Process CRDT messages here
  binaryMessageBus.on(CommsMessage.CRDT, (value) => {
    // console.log(Array.from(serializeCrdtMessages('[receive CRDT]: ', value, engine)))
    transport.onmessage!(value)
  })

  return {
    ...entityDefinitions,
    myProfile
  }
}
