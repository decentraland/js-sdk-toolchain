import { IEngine, Transport, RealmInfo, PlayerIdentityData, Entity, NetworkEntity, AppendValueOperation, CrdtMessage, CrdtMessageHeader, CrdtMessageProtocol, CrdtMessageType, DeleteComponent, DeleteComponentNetwork, DeleteEntity, DeleteEntityNetwork, PutComponentOperation, PutNetworkComponentOperation, DeleteComponentNetworkMessage, DeleteEntityNetworkMessage, PutNetworkComponentMessage } from '@dcl/ecs'
import { type SendBinaryRequest, type SendBinaryResponse } from '~system/CommunicationsController'

import { syncFilter } from './filter'
import { engineToCrdt } from './state'
import { BinaryMessageBus, CommsMessage, decodeString, encodeString } from './binary-message-bus'
import { fetchProfile } from './utils'
import { entityUtils } from './entities'
import { GetUserDataRequest, GetUserDataResponse } from '~system/UserIdentity'
import { definePlayerHelper } from '../players'
import { serializeCrdtMessages } from '../internal/transports/logger'
import { isServer as isServerFn } from '~system/EngineApi'
import { Atom } from '../atom'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'


export type IProfile = { networkId: number; userId: string }
// user that we asked for the inital crdt state
export function addSyncTransport(
  engine: IEngine,
  sendBinary: (msg: SendBinaryRequest) => Promise<SendBinaryResponse>,
  getUserData: (value: GetUserDataRequest) => Promise<GetUserDataResponse>
) {
  const AUTH_SERVER_PEER_ID = 'authorative-server'
  const DEBUG_NETWORK_MESSAGES = () => (globalThis as any).DEBUG_NETWORK_MESSAGES ?? false
  const CLIENT_SERVER_ARCH = () => (globalThis as any).CLIENT_SERVER_ARCH ?? true
  // Profile Info
  const myProfile: IProfile = {} as IProfile
  fetchProfile(myProfile!, getUserData)

  const isServerAtom = Atom<boolean>()
  isServerFn({}).then($ => isServerAtom.swap(!!$.isServer))

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
  binaryMessageBus.on(CommsMessage.RES_CRDT_STATE, async (value, fromPeer) => {
    if (isServerAtom.getOrNull() || fromPeer !== AUTH_SERVER_PEER_ID) return
    const { sender, data } = decodeCRDTState(value)
    if (sender !== myProfile.userId) return
    DEBUG_NETWORK_MESSAGES() && console.log('[Processing CRDT State]', data.byteLength / 1024, 'KB')
    transport.onmessage!(data)
    stateIsSyncronized = true
  })

  // Answer to REQ_CRDT_STATE
  binaryMessageBus.on(CommsMessage.REQ_CRDT_STATE, async (_, userId) => {
    if (await isServerAtom) return
    DEBUG_NETWORK_MESSAGES() && console.log(`Sending CRDT State to: ${userId}`)

    for (const chunk of engineToCrdt(engine)) {
      binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, encodeCRDTState(userId, chunk), [userId])
    }
  })

  // Process CRDT messages here
  binaryMessageBus.on(CommsMessage.CRDT_SERVER, (value, sender) => {
    const isServer = isServerAtom.getOrNull()
    if (isServer || sender !== AUTH_SERVER_PEER_ID) return
    
    for (const message of readMessages(value)) {
    }
  })

  function readMessages(data: Uint8Array) {
    const buffer = new ReadWriteByteBuffer(data)
    const messages: ((PutNetworkComponentMessage | DeleteComponentNetworkMessage | DeleteEntityNetworkMessage) & { messageBuffer: Uint8Array })[] = []
    let header: CrdtMessageHeader | null
    while ((header = CrdtMessageProtocol.getHeader(buffer))) {
      const offset = buffer.currentReadOffset()
      let message: CrdtMessage | undefined = undefined
      if (header.type === CrdtMessageType.DELETE_COMPONENT_NETWORK) {
        message = DeleteComponentNetwork.read(buffer)!
      } else if (header.type === CrdtMessageType.PUT_COMPONENT_NETWORK) {
        message = PutNetworkComponentOperation.read(buffer)!
      } else if (header.type === CrdtMessageType.DELETE_ENTITY_NETWORK) {
        message = DeleteEntityNetwork.read(buffer)!
      } else {
        // consume the message
        buffer.incrementReadOffset(header.length)
      }
      if (message) {
        messages.push({
          ...message,
          messageBuffer: buffer.buffer().subarray(offset, buffer.currentReadOffset())
        })
      }
    }
    return messages
  }

  binaryMessageBus.on(CommsMessage.CRDT, (value, sender) => {
    DEBUG_NETWORK_MESSAGES() &&
      console.log(Array.from(serializeCrdtMessages('[NetworkMessage received]:', value, engine)))
    const isServer = isServerAtom.getOrNull()
    if (isServer) {
      // 1. read each message
      // 2. if there is no network entity, create the entity
      // 3. get the component and run the validation
      // 4. if its a DELETE_ENTITY check if that user has permissions to delete sync: 'all' | 'owner'  | 'server' ?
      // 5. if its an update component check if it has permissions, and also run the custom validation. component.runValidation(entity, componenet.getOrNull(entity), value, address)
      //    5.1 if this validations returns true, then broadcast that message to every peer.
      //    5.2 if its invalid, then ignore, or send the correct CRDT to the peer.
      // we need to run validations and broadcast the message if its valid.
    } else {
      if (sender !== AUTH_SERVER_PEER_ID) return
      transport.onmessage!(value)
    }
  })

  async function requestState(retryCount: number = 1) {
    if (CLIENT_SERVER_ARCH()) {
      return
    }

    let players = Array.from(engine.getEntitiesWith(PlayerIdentityData))
    DEBUG_NETWORK_MESSAGES() && console.log(`Requesting state. Players connected: ${players.length - 1}`)

    if (!RealmInfo.getOrNull(engine.RootEntity)?.isConnectedSceneRoom) {
      DEBUG_NETWORK_MESSAGES() && console.log(`Aborting Requesting state?. Disconnected`)
      return
    }

    binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, new Uint8Array())

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
    if (!isServerAtom.getOrNull()) return
    for (const chunk of engineToCrdt(engine)) {
      binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, encodeCRDTState(player.userId, chunk), [player.userId])
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
