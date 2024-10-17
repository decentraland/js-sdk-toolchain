import { IEngine, Transport, RealmInfo, PlayerIdentityData } from '@dcl/ecs'
import { type SendBinaryRequest, type SendBinaryResponse } from '~system/CommunicationsController'

import { syncFilter } from './filter'
import { engineToCrdt } from './state'
import { BinaryMessageBus, CommsMessage, decodeString, encodeString } from './binary-message-bus'
import { fetchProfile } from './utils'
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
  const DEBUG_NETWORK_MESSAGES = () => (globalThis as any).DEBUG_NETWORK_MESSAGES ?? true
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

  let transportInitialzed = false
  // Add Sync Transport
  const transport: Transport = {
    filter: syncFilter(engine),
    send: async (message: Uint8Array) => {
      if (message.byteLength && transportInitialzed) {
        DEBUG_NETWORK_MESSAGES() &&
          console.log(...Array.from(serializeCrdtMessages('[NetworkMessage sent]:', message, engine)))
        binaryMessageBus.emit(CommsMessage.CRDT, message)
      }
      const messages = getMessagesToSend()
      const response = await sendBinary({ data: messages })
      binaryMessageBus.__processMessages(response.data)
      transportInitialzed = true
    },
    type: 'network'
  }
  engine.addTransport(transport)
  // End add sync transport

  // If we dont have any state initialized, and recieve a state message.
  binaryMessageBus.on(CommsMessage.RES_CRDT_STATE, (value) => {
    const { sender, data } = decodeCRDTState(value)
    if (sender !== myProfile.userId) return
    DEBUG_NETWORK_MESSAGES() && console.log('[Processing CRDT State]', data.byteLength)
    transport.onmessage!(data)
    stateIsSyncronized = true
  })

  binaryMessageBus.on(CommsMessage.REQ_CRDT_STATE, async (message, userId) => {
    console.log(`Sending CRDT State to: ${userId}`)
    transport.onmessage!(message)
    binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, encodeCRDTState(userId, engineToCrdt(engine)))
  })

  function sleep(ms: number) {
    return new Promise<void>((resolve) => {
      let timer = 0
      function sleepSystem(dt: number) {
        timer += dt
        if (timer * 1000 >= ms) {
          engine.removeSystem(sleepSystem)
          resolve()
        }
      }
      engine.addSystem(sleepSystem)
    })
  }

  const players = definePlayerHelper(engine)

  let stateIsSyncronized = false

  let requestCrdtStateWhenConnected = false

  async function requestState() {
    requestCrdtStateWhenConnected = false
    let players = Array.from(engine.getEntitiesWith(PlayerIdentityData))
    DEBUG_NETWORK_MESSAGES() && console.log(`Requesting state. Players connected: ${players.length - 1}`)
    binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, engineToCrdt(engine))
    await sleep(3000)
    players = Array.from(engine.getEntitiesWith(PlayerIdentityData))

    if (!stateIsSyncronized) {
      if (players.length > 1) {
        DEBUG_NETWORK_MESSAGES() &&
          console.log(`Requesting state again (no response). Players connected: ${players.length - 1}`)
        void requestState()
      } else {
        DEBUG_NETWORK_MESSAGES() && console.log('No active players. State syncronized')
        stateIsSyncronized = true
      }
    }
  }

  players.onEnterScene((player) => {
    DEBUG_NETWORK_MESSAGES() && console.log('[onEnterScene]', player.userId)
    if (player.userId === myProfile.userId && !requestCrdtStateWhenConnected) {
      if (RealmInfo.getOrNull(engine.RootEntity)?.isConnectedSceneRoom) {
        void requestState()
      } else {
        DEBUG_NETWORK_MESSAGES() && console.log('Waiting to be conneted')
        requestCrdtStateWhenConnected = true
      }
    }
  })

  RealmInfo.onChange(engine.RootEntity, (value) => {
    if (value?.isConnectedSceneRoom && requestCrdtStateWhenConnected) {
      void requestState()
    }
  })

  players.onLeaveScene((userId) => {
    DEBUG_NETWORK_MESSAGES() && console.log('[onLeaveScene]', userId)
    if (userId === myProfile.userId) {
      DEBUG_NETWORK_MESSAGES() && console.log('Disconnected from comms')
      stateIsSyncronized = false
      requestCrdtStateWhenConnected = false
    }
  })

  // Process CRDT messages here
  binaryMessageBus.on(CommsMessage.CRDT, (value) => {
    DEBUG_NETWORK_MESSAGES() &&
      console.log(Array.from(serializeCrdtMessages('[NetworkMessage received]:', value, engine)))
    transport.onmessage!(value)
  })

  function isStateSyncronized() {
    return stateIsSyncronized
  }

  return {
    ...entityDefinitions,
    myProfile,
    isStateSyncronized
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
