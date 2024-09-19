import { IEngine, Transport, RealmInfo } from '@dcl/ecs'
import { type SendBinaryRequest, type SendBinaryResponse } from '~system/CommunicationsController'

import { syncFilter } from './filter'
import { engineToCrdt } from './state'
import { BinaryMessageBus, CommsMessage, decodeString, encodeString } from './binary-message-bus'
import { fetchProfile, setInitialized, stateInitializedChecker } from './utils'
import { entityUtils } from './entities'
import { GetUserDataRequest, GetUserDataResponse } from '~system/UserIdentity'
import { definePlayerHelper } from '../players'
import { serializeCrdtMessages } from '../internal/transports/logger'

export type IProfile = { networkId: number; userId: string }
// user that we asked for the inital crdt state
export function addSyncTransport(
  engine: IEngine,
  sendBinary: (msg: SendBinaryRequest) => Promise<SendBinaryResponse>,
  getUserData: (value: GetUserDataRequest) => Promise<GetUserDataResponse>
) {
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

  // If we dont have any state initialized, and recieve a state message.
  binaryMessageBus.on(CommsMessage.RES_CRDT_STATE, (value) => {
    const { sender, data } = decodeCRDTState(value)
    if (sender !== myProfile.userId) return
    console.log('[Received CRDT State]', data.byteLength)
    setInitialized()
    transport.onmessage!(data)
  })

  binaryMessageBus.on(CommsMessage.REQ_CRDT_STATE, (_, userId) => {
    console.log('[RECIEVE REQ CRDT] from:', userId)
    if (players.getPlayer({ userId })) {
      binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, encodeCRDTState(userId, engineToCrdt(engine)))
    }
  })
  const players = definePlayerHelper(engine)

  let requestCrdtStateWhenConnected = false

  players.onEnterScene((player) => {
    console.log('[onEnterScene]', player.userId, myProfile.userId)
    if (player.userId === myProfile.userId) {
      console.log('request CRDT state when we are connected to comms.')
      if (RealmInfo.getOrNull(engine.RootEntity)?.isConnectedSceneRoom) {
        console.log('Requesting state')
        binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, new Uint8Array())
      } else {
        console.log('Waiting to be conneted')
        requestCrdtStateWhenConnected = true
      }
    }
  })

  RealmInfo.onChange(engine.RootEntity, (value) => {
    console.log('RealmInfo changed')
    if (value?.isConnectedSceneRoom && requestCrdtStateWhenConnected) {
      console.log('Conneted! Emiting req crdt state')
      requestCrdtStateWhenConnected = false
      binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, new Uint8Array())
    }
  })

  players.onLeaveScene((userId) => {
    console.log('[onLeaveScene]', userId)
    if (userId === myProfile.userId) {
      requestCrdtStateWhenConnected = false
      setInitialized(false)
    }
  })

  // Process CRDT messages here
  binaryMessageBus.on(CommsMessage.CRDT, (value) => {
    console.log(Array.from(serializeCrdtMessages('[receive CRDT]: ', value, engine)))
    transport.onmessage!(value)
  })

  return {
    ...entityDefinitions,
    myProfile
  }
}

/**
 * Messages Protocol Encoding
 *
 * CRDT: Plain Uint8Array
 *
 * CRDT_STATE_RES { sender: string, data: Uint8Array}
 */
function decodeCRDTState(data: Uint8Array) {
  let offset = 0
  const r = new Uint8Array(data)
  const view = new DataView(r.buffer)
  const senderLength = view.getUint8(offset)
  offset += 1
  const sender = decodeString(data.subarray(1, senderLength + 1))
  offset += senderLength
  const state = r.subarray(offset)

  return { sender, data: state }
}

function encodeCRDTState(address: string, data: Uint8Array) {
  // address to uint8array
  const addressBuffer = encodeString(address)
  const addressOffset = 1
  const messageLength = addressOffset + addressBuffer.byteLength + data.byteLength

  const serializedMessage = new Uint8Array(messageLength)
  serializedMessage.set(new Uint8Array([addressBuffer.byteLength]), 0)
  serializedMessage.set(addressBuffer, 1)
  serializedMessage.set(data, addressBuffer.byteLength + 1)
  return serializedMessage
}
