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
  const players = definePlayerHelper(engine)

  let stateIsSyncronized = false
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

  // Receive & Process CRDT_STATE
  binaryMessageBus.on(CommsMessage.RES_CRDT_STATE, (value) => {
    const { sender, data } = decodeCRDTState(value)
    if (sender !== myProfile.userId) return
    DEBUG_NETWORK_MESSAGES() && console.log('[Processing CRDT State]', data.byteLength)
    transport.onmessage!(data)
    stateIsSyncronized = true
  })

  // Answer to REQ_CRDT_STATE
  binaryMessageBus.on(CommsMessage.REQ_CRDT_STATE, async (message, userId) => {
    console.log(`Sending CRDT State to: ${userId}`)
    transport.onmessage!(message)
    binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, encodeCRDTState(userId, engineToCrdt(engine)))
  })

  // Process CRDT messages here
  binaryMessageBus.on(CommsMessage.CRDT, (value) => {
    DEBUG_NETWORK_MESSAGES() &&
      console.log(Array.from(serializeCrdtMessages('[NetworkMessage received]:', value, engine)))
    transport.onmessage!(value)
  })

  async function requestState(retryCount: number = 1) {
    let players = Array.from(engine.getEntitiesWith(PlayerIdentityData))
    DEBUG_NETWORK_MESSAGES() && console.log(`Requesting state. Players connected: ${players.length - 1}`)

    if (!RealmInfo.getOrNull(engine.RootEntity)?.isConnectedSceneRoom) {
      DEBUG_NETWORK_MESSAGES() && console.log(`Aborting Requesting state?. Disconnected`)
      return
    }

    binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, engineToCrdt(engine))

    // Wait ~5s for the response.
    await sleep(5000)

    players = Array.from(engine.getEntitiesWith(PlayerIdentityData))

    if (!stateIsSyncronized) {
      if (players.length > 1 && retryCount <= 2) {
        DEBUG_NETWORK_MESSAGES() &&
          console.log(`Requesting state again ${retryCount} (no response). Players connected: ${players.length - 1}`)
        void requestState(retryCount + 1)
      } else {
        DEBUG_NETWORK_MESSAGES() && console.log('No active players. State syncronized')
        stateIsSyncronized = true
      }
    }
  }

  players.onEnterScene((player) => {
    DEBUG_NETWORK_MESSAGES() && console.log('[onEnterScene]', player.userId)
  })

  // Asks for the REQ_CRDT_STATE when its connected to comms
  RealmInfo.onChange(engine.RootEntity, (value) => {
    if (!value?.isConnectedSceneRoom) {
      DEBUG_NETWORK_MESSAGES() && console.log('Disconnected from comms')
      stateIsSyncronized = false
    }

    if (value?.isConnectedSceneRoom) {
      DEBUG_NETWORK_MESSAGES() && console.log('Connected to comms')
    }

    if (value?.isConnectedSceneRoom && !stateIsSyncronized) {
      void requestState()
    }
  })

  players.onLeaveScene((userId) => {
    DEBUG_NETWORK_MESSAGES() && console.log('[onLeaveScene]', userId)
  })

  function isStateSyncronized() {
    return stateIsSyncronized
  }

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
