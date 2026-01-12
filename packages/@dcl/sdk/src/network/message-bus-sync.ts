import { IEngine, Transport, RealmInfo } from '@dcl/ecs'
import { type SendBinaryRequest, type SendBinaryResponse } from '~system/CommunicationsController'

import { syncFilter } from './filter'
import { engineToCrdt } from './state'
import { BinaryMessageBus, CommsMessage } from './binary-message-bus'
import { fetchProfile } from './utils'
import { entityUtils } from './entities'
import { createServerValidator } from './server'
import { GetUserDataRequest, GetUserDataResponse } from '~system/UserIdentity'
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
  // Profile Info
  const myProfile: IProfile = {} as IProfile
  fetchProfile(myProfile!, getUserData)

  const isServerAtom = Atom<boolean>()
  const isRoomReadyAtom = Atom<boolean>(false)

  void isServerFn({}).then(($: IsServerResponse) => {
    return isServerAtom.swap(!!$.isServer)
  })

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

  /**
   * We need to wait till 2 ticks that is when the engine is ready to send new messages.
   * The first tick is for the client engine processing the CRDT messages,
   * and the second one are the messages created by the main() function.
   * So to avoid sending those messages, that all the clients have, through the network we put this validation here.
   */
  let tick = 0
  const TRANSPORT_INITIALIZED_NUMBER = isTestEnvironment() ? 0 : 2
  // Add Sync Transport
  const transport: Transport = {
    filter: syncFilter(engine),
    send: async (messages) => {
      if (tick <= TRANSPORT_INITIALIZED_NUMBER) tick++
      for (const message of tick > TRANSPORT_INITIALIZED_NUMBER ? [messages].flat() : []) {
        if (message.byteLength) {
          DEBUG_NETWORK_MESSAGES() &&
            console.log(...Array.from(serializeCrdtMessages('[NetworkMessage sent]:', message, engine)))

          // Convert regular messages to network messages for broadcasting with chunking
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

  // Server validation setup
  const serverValidator = createServerValidator({
    engine,
    binaryMessageBus
  })

  // Initialize Event Bus with registered schemas
  const eventBus = new Room(engine, binaryMessageBus, isServerAtom, isRoomReadyAtom)

  // Set global eventBus instance
  setGlobalRoom(eventBus)

  engine.addTransport(transport)
  // End add sync transport

  // Receive & Process CRDT_STATE
  binaryMessageBus.on(CommsMessage.REQ_CRDT_STATE, async (data, sender) => {
    DEBUG_NETWORK_MESSAGES() && console.log('[REQ_CRDT_STATE]', sender, Date.now())
    for (const chunk of engineToCrdt(engine)) {
      DEBUG_NETWORK_MESSAGES() && console.log('[Emiting:]', sender, Date.now())
      binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, chunk, [sender])
    }
  })
  binaryMessageBus.on(CommsMessage.RES_CRDT_STATE, async (data, sender) => {
    requestingState = false
    elapsedTimeSinceRequest = 0
    if (isServerAtom.getOrNull() || sender !== AUTH_SERVER_PEER_ID) return
    DEBUG_NETWORK_MESSAGES() && console.log('[Processing CRDT State]', data.byteLength / 1024, 'KB')
    transport.onmessage!(serverValidator.processClientMessages(data, sender))
    stateIsSyncronized = true

    // IMPORTANT: Only mark room as ready AFTER state is synchronized
    // This ensures comms is truly connected and working
    const realmInfo = RealmInfo.getOrNull(engine.RootEntity)
    if (realmInfo && checkRoomReady(realmInfo)) {
      DEBUG_NETWORK_MESSAGES() && console.log('[isRoomReady] Marking room as ready after state sync')
      isRoomReadyAtom.swap(true)
    }
  })

  // received message from the network
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
      // Process network messages from server and convert to regular messages
      transport.onmessage!(serverValidator.processClientMessages(value, sender))
    }
  })

  // received authoritative message from server - force apply to fix invalid local state
  binaryMessageBus.on(CommsMessage.CRDT_AUTHORITATIVE, (value, sender) => {
    // Only accept authoritative messages from authoritative server
    if (sender !== AUTH_SERVER_PEER_ID) return

    // DEBUG_NETWORK_MESSAGES() &&
    console.log('[AUTHORITATIVE] Received authoritative message from server:', value.byteLength, 'bytes')

    // Process authoritative messages by forcing them through normal CRDT processing
    // but with a timestamp that's guaranteed to be accepted
    const authoritativeBuffer = serverValidator.processClientMessages(value, sender, true)
    if (authoritativeBuffer.byteLength > 0) {
      // Apply authoritative message through normal transport, but the server's messages
      // should be processed as authoritative with special timestamp handling
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

  // Helper to check room ready conditions
  function checkRoomReady(realmInfo: ReturnType<typeof RealmInfo.getOrNull>): boolean {
    if (!realmInfo) return false

    try {
      // Check if room instance exists
      if (!eventBus) return false

      return !!(realmInfo.commsAdapter && realmInfo.isConnectedSceneRoom && realmInfo.room)
    } catch {
      return false
    }
  }

  // Asks for the REQ_CRDT_STATE when its connected to comms
  RealmInfo.onChange(engine.RootEntity, (value) => {
    const isServer = isServerAtom.getOrNull()

    if (!value?.isConnectedSceneRoom) {
      DEBUG_NETWORK_MESSAGES() && console.log('Disconnected from comms')
      isRoomReadyAtom.swap(false)
      if (!isServer) {
        stateIsSyncronized = false
      }
    }

    if (value?.isConnectedSceneRoom) {
      requestState()

      // For servers, mark as ready immediately when connected
      // (servers don't need to sync state from anyone)
      if (isServer && checkRoomReady(value)) {
        DEBUG_NETWORK_MESSAGES() && console.log('[isRoomReady] Server marking room as ready')
        isRoomReadyAtom.swap(true)
      }
      // For clients, room will be marked ready after receiving CRDT state (above)
    }
  })

  let requestingState = false
  let elapsedTimeSinceRequest = 0
  const STATE_REQUEST_RETRY_INTERVAL = 2.0 // seconds

  /**
   * Why we have to request the state if we have a server that can send us the state when we joined?
   * The thing is that when the server detects a new JOIN_PARTICIPANT on livekit room, it sends automatically the state to that peer.
   * But in unity, it takes more time, so that message is not being delivered to the client.
   * So instead, when we are finally connected to the room, we request the state, and then the server answers with the state :)
   *
   * If no response is received within 2 seconds, the request is automatically retried.
   */
  function requestState() {
    if (isServerAtom.getOrNull()) return
    if (RealmInfo.getOrNull(engine.RootEntity)?.isConnectedSceneRoom && !requestingState) {
      requestingState = true
      elapsedTimeSinceRequest = 0
      DEBUG_NETWORK_MESSAGES() && console.log('Requesting state...')
      binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, new Uint8Array())
    }
  }

  // System to retry state request if no response is received within the retry interval
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
