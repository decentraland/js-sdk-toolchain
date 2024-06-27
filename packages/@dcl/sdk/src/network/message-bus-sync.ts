import { IEngine, Transport } from '@dcl/ecs'
import type { SendBinaryRequest, SendBinaryResponse } from '~system/CommunicationsController'

import { syncFilter } from './filter'
import { engineToCrdt } from './state'
import { BinaryMessageBus, CommsMessage } from './binary-message-bus'
import { fetchProfile, setInitialized, stateInitialized, stateInitializedChecker, syncTransportIsReady } from './utils'
import { entityUtils } from './entities'
import { GetUserDataRequest, GetUserDataResponse } from '~system/UserIdentity'

export type IProfile = { networkId: number; userId: string }
// user that we asked for the inital crdt state
export function addSyncTransport(
  engine: IEngine,
  sendBinary: (msg: SendBinaryRequest) => Promise<SendBinaryResponse>,
  getUserData: (value: GetUserDataRequest) => Promise<GetUserDataResponse>
) {
  // Profile Info
  const myProfile: IProfile = {} as IProfile
  const myProfilePromise = fetchProfile(engine, myProfile, getUserData)
  // Entity utils
  const entityDefinitions = entityUtils(engine, myProfile, myProfilePromise)

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
      if (syncTransportIsReady(engine) && message.byteLength) {
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
  engine.addSystem(() => stateInitializedChecker(engine))

  // Request initial state
  binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, new Uint8Array())

  // If we dont have any state initialized, and recieve a state message.
  binaryMessageBus.on(CommsMessage.RES_CRDT_STATE, (value) => {
    if (!stateInitialized) {
      setInitialized()
      transport.onmessage!(value)
    }
  })

  // If we are the oldest user and we recieve a req of a state we send it.
  binaryMessageBus.on(CommsMessage.REQ_CRDT_STATE, () => {
    if (stateInitialized) {
      binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, engineToCrdt(engine))
    }
  })

  // Process CRDT messages here
  binaryMessageBus.on(CommsMessage.CRDT, (value) => {
    transport.onmessage!(value)
  })

  return {
    ...entityDefinitions,
    myProfile
  }
}
