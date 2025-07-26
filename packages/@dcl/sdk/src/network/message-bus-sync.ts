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

export type IProfile = { networkId: number; userId: string }
// user that we asked for the inital crdt state
export function addSyncTransport(
  engine: IEngine,
  sendBinary: (msg: SendBinaryRequest) => Promise<SendBinaryResponse>,
  getUserData: (value: GetUserDataRequest) => Promise<GetUserDataResponse>,
  isServerFn: (request: IsServerRequest) => Promise<IsServerResponse>,
  name: string
) {
  const AUTH_SERVER_PEER_ID = 'authorative-server'
  const DEBUG_NETWORK_MESSAGES = () => true //(globalThis as any).DEBUG_NETWORK_MESSAGES ?? false
  // Profile Info
  const myProfile: IProfile = {} as IProfile
  fetchProfile(myProfile!, getUserData)

  const isServerAtom = Atom<boolean>()
  void isServerFn({}).then(($: IsServerResponse) => isServerAtom.swap(!!$.isServer))

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
      for (const message of transportInitialzed ? [messages].flat(): []) {
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
      transportInitialzed = true
    },
    type: name
  }

  // Server validation setup
  const serverValidator = createServerValidator({
    engine,
    binaryMessageBus,
    transport,
    authServerPeerId: AUTH_SERVER_PEER_ID,
    debugNetworkMessages: DEBUG_NETWORK_MESSAGES
  })

  engine.addTransport(transport)
  // End add sync transport

  // Receive & Process CRDT_STATE
  binaryMessageBus.on(CommsMessage.REQ_CRDT_STATE, async (data, sender) => {
    DEBUG_NETWORK_MESSAGES() && console.log('[REQ_CRDT_STATE]', sender, Date.now())
    for (const chunk of engineToCrdt(engine)) {
      binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, chunk, [sender])
    }
  })
  binaryMessageBus.on(CommsMessage.RES_CRDT_STATE, async (data, sender) => {
    requestingState = false
    if (isServerAtom.getOrNull() || sender !== AUTH_SERVER_PEER_ID) return
    DEBUG_NETWORK_MESSAGES() && console.log('[Processing CRDT State]', data.byteLength / 1024, 'KB')
    transport.onmessage!(serverValidator.processClientMessages(data, sender))
    stateIsSyncronized = true
  })

  // received message from the network
  binaryMessageBus.on(CommsMessage.CRDT, (value, sender) => {
    DEBUG_NETWORK_MESSAGES() &&
      console.log(transport.type, ...Array.from(serializeCrdtMessages('[NetworkMessage received]:', value, engine)))
    const isServer = isServerAtom.getOrNull()
    if (isServer) {
      serverValidator.processServerMessages(value, sender)
    } else {
      if (sender !== AUTH_SERVER_PEER_ID) return
      // Process network messages from server and convert to regular messages
      transport.onmessage!(serverValidator.processClientMessages(value, sender))
    }
  })

  players.onEnterScene((player) => {
    DEBUG_NETWORK_MESSAGES() && console.log('[onEnterScene]', player.userId)
    if (!isServerAtom.getOrNull() && myProfile.userId === player.userId) {
      requestState()
    }
  })

  // Asks for the REQ_CRDT_STATE when its connected to comms
  RealmInfo.onChange(engine.RootEntity, (value) => {
    if (!value?.isConnectedSceneRoom) {
      DEBUG_NETWORK_MESSAGES() && console.log('Disconnected from comms')
    }

    if (value?.isConnectedSceneRoom) {
      requestState()
    }
  })
  
  let requestingState = false
  function requestState() {
    if (RealmInfo.getOrNull(engine.RootEntity)?.isConnectedSceneRoom && !requestingState) {
      requestingState = true
      DEBUG_NETWORK_MESSAGES() && console.log('Requesting state...')
      binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, new Uint8Array())
    }
  }

  players.onLeaveScene((userId) => {
    DEBUG_NETWORK_MESSAGES() && console.log('[onLeaveScene]', userId)
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
