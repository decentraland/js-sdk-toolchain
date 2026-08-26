import { IEngine, Transport, RealmInfo } from '@dcl/ecs'
import type { SendBinaryRequest, SendBinaryResponse } from '~system/CommunicationsController'

import { syncFilter } from './filter'
import { engineToCrdt } from './state'
import { BinaryMessageBus, CommsMessage } from './binary-message-bus'
import { fetchProfile } from './utils'
import { entityUtils } from './entities'
import { createServerValidator } from './server'
import type { GetUserDataRequest, GetUserDataResponse } from '~system/UserIdentity'
import { definePlayerHelper } from '../players'
import { serializeCrdtMessages } from '../internal/transports/logger'
import { IsServerRequest, IsServerResponse } from '~system/EngineApi'
import { Atom } from '../atom'
import { setGlobalRoom, Room } from './events/implementation'

export type IProfile = { networkId: number; userId: string }
// user that we asked for the inital crdt state
export const AUTH_SERVER_PEER_ID = 'authoritative-server'
export const DEBUG_NETWORK_MESSAGES = () => (globalThis as any).DEBUG_NETWORK_MESSAGES ?? false

// Test environment detection without 'as any'
const isTestEnvironment = (): boolean => {
  try {
    if (typeof globalThis === 'undefined') return false
    const globalWithProcess = globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } }
    return globalWithProcess.process?.env?.NODE_ENV === 'test'
  } catch {
    return false
  }
}

export function addSyncTransport(
  engine: IEngine,
  sendBinary: (msg: SendBinaryRequest) => Promise<SendBinaryResponse>,
  getUserData: (value: GetUserDataRequest) => Promise<GetUserDataResponse>,
  isServerFn: (request: IsServerRequest) => Promise<IsServerResponse>,
  name: string
) {
  const myProfile: IProfile = {} as IProfile
  fetchProfile(myProfile!, getUserData)

  const isServerAtom = Atom<boolean>()
  const isRoomReadyAtom = Atom<boolean>(false)

  void isServerFn({}).then(($: IsServerResponse) => {
    return isServerAtom.swap(!!$.isServer)
  })

  const entityDefinitions = entityUtils(engine, myProfile)
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
  let tick = 0
  const TRANSPORT_INITIALIZED_NUMBER = isTestEnvironment() ? 0 : 2
  const transport: Transport = {
    filter: syncFilter(engine),
    send: async (messages) => {
      if (tick <= TRANSPORT_INITIALIZED_NUMBER) tick++
      for (const message of tick > TRANSPORT_INITIALIZED_NUMBER ? [messages].flat() : []) {
        if (message.byteLength) {
          DEBUG_NETWORK_MESSAGES() &&
            console.log(...Array.from(serializeCrdtMessages('[NetworkMessage sent]:', message, engine)))
          for (const chunk of serverValidator.convertRegularToNetworkMessage(message)) {
            binaryMessageBus.emit(CommsMessage.CRDT, chunk)
          }
        }
      }
      const peerMessages = getMessagesToSend()
      const response = await sendBinary({ data: [], peerData: peerMessages })
      binaryMessageBus.__processMessages(response.data)
    },
    type: name
  }

  const serverValidator = createServerValidator({
    engine,
    binaryMessageBus
  })

  const eventBus = new Room(engine, binaryMessageBus, isServerAtom, isRoomReadyAtom)
  setGlobalRoom(eventBus)
  engine.addTransport(transport)

  binaryMessageBus.on(CommsMessage.REQ_CRDT_STATE, async (data, sender) => {
    DEBUG_NETWORK_MESSAGES() && console.log('[REQ_CRDT_STATE]', sender, Date.now())
    const chunks = engineToCrdt(engine)
    if (chunks.length === 0) {
      DEBUG_NETWORK_MESSAGES() && console.log('[Emiting empty state:]', sender, Date.now())
      binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, new Uint8Array(), [sender])
    } else {
      for (const chunk of chunks) {
        DEBUG_NETWORK_MESSAGES() && console.log('[Emiting:]', sender, Date.now())
        binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, chunk, [sender])
      }
    }
  })
  binaryMessageBus.on(CommsMessage.RES_CRDT_STATE, async (data, sender) => {
    if (isServerAtom.getOrNull() || sender !== AUTH_SERVER_PEER_ID) return
    requestingState = false
    elapsedTimeSinceRequest = 0
    DEBUG_NETWORK_MESSAGES() && console.log('[Processing CRDT State]', data.byteLength / 1024, 'KB')
    if (data.byteLength > 0) {
      transport.onmessage!(serverValidator.processClientMessages(data, sender))
    }
    stateIsSyncronized = true

    const realmInfo = RealmInfo.getOrNull(engine.RootEntity)
    if (realmInfo) {
      DEBUG_NETWORK_MESSAGES() && console.log('[isRoomReady] Marking room as ready after state sync')
      isRoomReadyAtom.swap(true)
    }
  })

  binaryMessageBus.on(CommsMessage.CRDT, (value, sender) => {
    const isServer = isServerAtom.getOrNull()
    DEBUG_NETWORK_MESSAGES() &&
      console.log(
        transport.type,
        ...Array.from(serializeCrdtMessages('[NetworkMessage received]:', value, engine)),
        isServer
      )
    if (isServer) {
      transport.onmessage!(serverValidator.processServerMessages(value, sender))
    } else if (sender === AUTH_SERVER_PEER_ID) {
      transport.onmessage!(serverValidator.processClientMessages(value, sender))
    }
  })

  binaryMessageBus.on(CommsMessage.CRDT_AUTHORITATIVE, (value, sender) => {
    if (sender !== AUTH_SERVER_PEER_ID) return
    console.log('[AUTHORITATIVE] Received authoritative message from server:', value.byteLength, 'bytes')
    const authoritativeBuffer = serverValidator.processClientMessages(value, sender, true)
    if (authoritativeBuffer.byteLength > 0) {
      transport.onmessage!(authoritativeBuffer)
      DEBUG_NETWORK_MESSAGES() && console.log('[AUTHORITATIVE] Applied server authoritative message to local state')
    }
  })

  players.onEnterScene((player) => {
    DEBUG_NETWORK_MESSAGES() && console.log('[onEnterScene]', player.userId)
    if (!isServerAtom.getOrNull() && myProfile.userId === player.userId) {
      requestState()
    }
  })

  RealmInfo.onChange(engine.RootEntity, (value) => {
    const isServer = isServerAtom.getOrNull()

    if (!value?.isConnectedSceneRoom) {
      if (isRoomReadyAtom.getOrNull() === true) {
        DEBUG_NETWORK_MESSAGES() && console.log('Disconnected from comms')
        isRoomReadyAtom.swap(false)
        if (!isServer) {
          stateIsSyncronized = false
        }
      }
    }

    if (value?.isConnectedSceneRoom) {
      requestState()

      if (isServer && isRoomReadyAtom.getOrNull() === false) {
        DEBUG_NETWORK_MESSAGES() && console.log('[isRoomReady] Server marking room as ready')
        isRoomReadyAtom.swap(true)
      }
    }
  })

  let requestingState = false
  let elapsedTimeSinceRequest = 0
  const STATE_REQUEST_RETRY_INTERVAL = 2.0

  function requestState() {
    if (isServerAtom.getOrNull()) return
    if (RealmInfo.getOrNull(engine.RootEntity)?.isConnectedSceneRoom && !requestingState) {
      requestingState = true
      elapsedTimeSinceRequest = 0
      DEBUG_NETWORK_MESSAGES() && console.log('Requesting state...')
      binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, new Uint8Array())
    }
  }

  engine.addSystem((dt: number) => {
    if (requestingState && !stateIsSyncronized) {
      elapsedTimeSinceRequest += dt
      if (elapsedTimeSinceRequest >= STATE_REQUEST_RETRY_INTERVAL) {
        DEBUG_NETWORK_MESSAGES() && console.log('State request timed out, retrying...')
        elapsedTimeSinceRequest = 0
        requestingState = false
        requestState()
      }
    }
  })

  players.onLeaveScene((userId) => {
    DEBUG_NETWORK_MESSAGES() && console.log('[onLeaveScene]', userId)
  })

  function isStateSyncronized() {
    return stateIsSyncronized
  }

  return {
    ...entityDefinitions,
    myProfile,
    isStateSyncronized,
    binaryMessageBus,
    eventBus,
    isRoomReadyAtom
  }
}
