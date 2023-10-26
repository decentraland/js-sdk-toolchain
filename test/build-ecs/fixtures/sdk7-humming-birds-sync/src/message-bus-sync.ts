import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { EngineInfo, Entity, NetworkEntity, Transport, engine } from '@dcl/sdk/ecs'
import { componentNumberFromName } from '@dcl/ecs/dist/components/component-number'
import { syncFilter } from '@dcl/sdk/network-transport/utils'
import { engineToCrdt } from '@dcl/sdk/network-transport/state'
import { serializeCrdtMessages } from '@dcl/sdk/internal/transports/logger'
import { sendBinary } from '~system/CommunicationsController'
import { getUserData } from '~system/UserIdentity'
import { getPlayersInScene, getConnectedPlayers } from '~system/Players'
import { BinaryMessageBus, CommsMessage, encodeString } from './binary-message-bus'

// We use this flag to avoid sending over the wire all the initial messages that the engine add's to the rendererTransport
// INITIAL_CRDT_MESSAGES that are being processed on the onStart loop, before the onUpdate.
let INITIAL_CRDT_RENDERER_MESSAGES_SENT = false
function syncTransportIsReady() {
  if (!INITIAL_CRDT_RENDERER_MESSAGES_SENT) {
    const engineInfo = EngineInfo.getOrNull(engine.RootEntity)
    if (engineInfo && engineInfo.tickNumber > 1) {
      INITIAL_CRDT_RENDERER_MESSAGES_SENT = true
    }
  }
  return INITIAL_CRDT_RENDERER_MESSAGES_SENT
}

// List of MessageBuss messsages to be sent on every frame to comms
const pendingMessageBusMessagesToSend: Uint8Array[] = []
const binaryMessageBus = BinaryMessageBus((message) => pendingMessageBusMessagesToSend.push(message))
function getMessagesToSend() {
  const messages = [...pendingMessageBusMessagesToSend]
  pendingMessageBusMessagesToSend.length = 0
  return messages
}

// user that we asked for the inital crdt state
let REQ_CRDT_STATE_USER_ID: string | undefined
export function addSyncTransport() {
  binaryMessageBus.on(CommsMessage.RES_CRDT_STATE, (value, sender) => {
    console.log(Array.from(serializeCrdtMessages('[binaryMessageBus]: ', value, engine)))
    if (sender === REQ_CRDT_STATE_USER_ID) {
      transport.onmessage!(value)
    }
  })

  binaryMessageBus.on(CommsMessage.REQ_CRDT_STATE, (value) => {
    const buffer = new ReadWriteByteBuffer()
    buffer.writeBuffer(value, true)
    const userId = buffer.readUtf8String()
    if (userId === myProfile.userId) {
      binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, engineToCrdt(engine))
    }
  })

  // We process CRDT messages here
  binaryMessageBus.on(CommsMessage.CRDT, (value) => {
    console.log(Array.from(serializeCrdtMessages('[CRDT Receive]: ', value, engine)))
    transport.onmessage!(value)
  })

  const transport: Transport = {
    filter: syncFilter,
    send: async (message: Uint8Array) => {
      if (syncTransportIsReady() && message.byteLength) {
        console.log(Array.from(serializeCrdtMessages('[CRDT  Send]: ', message, engine)))
        binaryMessageBus.emit(CommsMessage.CRDT, message)
      }
      const messages = getMessagesToSend()
      const response = await sendBinary({ data: messages })
      binaryMessageBus.__processMessages(response.data)
    },
    type: 'network'
  }
  engine.addTransport(transport)
}

// UTILS
export let myProfile: { networkId: number; userId: string }
engine.addSystem(() => {
  const engineInfo = EngineInfo.getOrNull(engine.RootEntity)
  // Wait for comms to be ready ??
  if ((engineInfo?.tickNumber ?? 0) > 40 || REQ_CRDT_STATE_USER_ID) {
    return
  }
  async function enterScene() {
    await getUser()
    const scene = await getPlayersInScene({})
    const player = scene.players.find((p) => p.userId !== myProfile.userId)
    if (player?.userId) {
      REQ_CRDT_STATE_USER_ID = player.userId
    } else {
      const connected = await getConnectedPlayers({})
      const player = connected.players.find((p) => p.userId !== myProfile.userId)
      REQ_CRDT_STATE_USER_ID = player?.userId ?? ''
    }

    // There is no user connected, then there is no state.
    if (!REQ_CRDT_STATE_USER_ID) {
      console.log(`NO PLAYERS IN SCENE. CAN'T SHARE STATE`)
      return
    }
    const userIdBuffer = encodeString(REQ_CRDT_STATE_USER_ID)
    console.log('[binaryMessageBus_emit]: REQ_CRDT_STATE', { REQ_CRDT_STATE_USER_ID })
    binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, userIdBuffer)
  }
  void enterScene()
})

// Retrieve userId so we can start sending this info as the networkId
async function getUser() {
  if (myProfile) return myProfile
  const data = await getUserData({})
  if (data.data?.userId) {
    const userId = data.data.userId
    const networkId = componentNumberFromName(data.data?.userId)
    myProfile = { userId, networkId }
    console.log('[getUser]: ', myProfile)
    return myProfile
  }
  return undefined
}

// TODO: move this to sdk|ecs
export const addNetworkEntity = (entity: Entity) => {
  if (!myProfile.networkId) {
    throw new Error('Invalid user address')
  }
  NetworkEntity.create(entity, { entityId: entity, networkId: myProfile.networkId })
}
