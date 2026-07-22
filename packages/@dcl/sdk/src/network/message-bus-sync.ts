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
  const DEBUG_NETWORK_MESSAGES = () => (globalThis as any).DEBUG_NETWORK_MESSAGES ?? false
  // Profile Info
  const myProfile: IProfile = {} as IProfile
  fetchProfile(myProfile!, getUserData)

  // Entity utils
  const entityDefinitions = entityUtils(engine, myProfile)

  // List of MessageBuss messsages to be sent on every frame to comms
  const pendingMessageBusMessagesToSend: { data: Uint8Array[]; address: string[] }[] = []

  const binaryMessageBus = BinaryMessageBus((data, address) => {
    pendingMessageBusMessagesToSend.push({ data: [data], address: address ?? [] })
  })

  function getMessagesToSend(): typeof pendingMessageBusMessagesToSend {
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
    send: async (messages) => {
      for (const message of [messages].flat()) {
        if (message.byteLength && transportInitialzed) {
          DEBUG_NETWORK_MESSAGES() &&
            console.log(...Array.from(serializeCrdtMessages('[NetworkMessage sent]:', message, engine)))
          binaryMessageBus.emit(CommsMessage.CRDT, message)
        }
      }
      const peerMessages = getMessagesToSend()
      let totalSize = 0
      for (const message of peerMessages) {
        for (const data of message.data) {
          totalSize += data.byteLength
        }
      }
      if (totalSize) {
        DEBUG_NETWORK_MESSAGES() && console.log('Sending network messages: ', totalSize / 1024, 'KB')
      }
      const response = await sendBinary({ data: [], peerData: peerMessages })
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
    DEBUG_NETWORK_MESSAGES() && console.log('[Processing CRDT State]', data.byteLength / 1024, 'KB')
    transport.onmessage!(data)
    aloneResolvedWithoutState = false
    if (!stateIsSyncronized) {
      DEBUG_NETWORK_MESSAGES() && console.log('State syncronized. Initial CRDT state received')
      stateIsSyncronized = true
    }
  })

  // Answer to REQ_CRDT_STATE
  binaryMessageBus.on(CommsMessage.REQ_CRDT_STATE, async (_, userId) => {
    DEBUG_NETWORK_MESSAGES() && console.log(`Sending CRDT State to: ${userId}`)

    const chunks = engineToCrdt(engine)
    if (!chunks.length) chunks.push(new Uint8Array())
    for (const chunk of chunks) {
      binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, encodeCRDTState(userId, chunk), [userId])
    }
  })

  // Process CRDT messages here
  binaryMessageBus.on(CommsMessage.CRDT, (value) => {
    DEBUG_NETWORK_MESSAGES() &&
      console.log(Array.from(serializeCrdtMessages('[NetworkMessage received]:', value, engine)))
    transport.onmessage!(value)
  })

  const REQUEST_STATE_INITIAL_RETRY_MS = 1000
  const REQUEST_STATE_MAX_RETRY_MS = 30000
  const REQUEST_STATE_MIN_ALONE_ATTEMPT = 3
  const REQUEST_STATE_GIVE_UP_MS = 60_000
  let requestingState = false
  let resetBackoff = false
  let aloneResolvedWithoutState = false

  async function requestState() {
    if (requestingState) return
    requestingState = true
    try {
      let waitedMs = 0
      for (let attempt = 0; !stateIsSyncronized; attempt++) {
        if (resetBackoff) {
          resetBackoff = false
          attempt = 0
          waitedMs = 0
        }
        if (!RealmInfo.getOrNull(engine.RootEntity)?.isConnectedSceneRoom) {
          DEBUG_NETWORK_MESSAGES() && console.log(`Aborting Requesting state?. Disconnected`)
          return
        }

        const players = Array.from(engine.getEntitiesWith(PlayerIdentityData))
        if (attempt >= REQUEST_STATE_MIN_ALONE_ATTEMPT && players.length <= 1) {
          DEBUG_NETWORK_MESSAGES() && console.log('No active players. State syncronized')
          aloneResolvedWithoutState = true
          stateIsSyncronized = true
          return
        }
        if (waitedMs >= REQUEST_STATE_GIVE_UP_MS && players.length > 1) {
          console.error(
            `No answer to REQ_CRDT_STATE after ${waitedMs}ms with other players present — proceeding as synced; late state still merges on arrival`
          )
          stateIsSyncronized = true
          return
        }

        DEBUG_NETWORK_MESSAGES() &&
          console.log(`Requesting state. Attempt: ${attempt + 1}. Players connected: ${players.length - 1}`)
        binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, new Uint8Array())

        const delay = Math.min(REQUEST_STATE_INITIAL_RETRY_MS * 2 ** attempt, REQUEST_STATE_MAX_RETRY_MS)
        waitedMs += delay
        await sleep(delay)
      }
    } finally {
      requestingState = false
    }
  }

  players.onEnterScene((player) => {
    DEBUG_NETWORK_MESSAGES() && console.log('[onEnterScene]', player.userId)
    if (aloneResolvedWithoutState) {
      aloneResolvedWithoutState = false
      stateIsSyncronized = false
      void requestState()
    }
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
      resetBackoff = true
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
