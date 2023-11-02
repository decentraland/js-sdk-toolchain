import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { EngineInfo, Entity, NetworkEntity, Transport, engine, SyncComponents } from '@dcl/sdk/ecs'
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
    // console.log(Array.from(serializeCrdtMessages('[CRDT Receive]: ', value, engine)))
    transport.onmessage!(value)
  })

  const transport: Transport = {
    filter: syncFilter,
    send: async (message: Uint8Array) => {
      if (syncTransportIsReady() && message.byteLength) {
        // console.log(Array.from(serializeCrdtMessages('[CRDT  Send]: ', message, engine)))
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
      // console.log(`NO PLAYERS IN SCENE. CAN'T SHARE STATE`)
      return
    }
    const userIdBuffer = encodeString(REQ_CRDT_STATE_USER_ID)
    // console.log('[binaryMessageBus_emit]: REQ_CRDT_STATE', { REQ_CRDT_STATE_USER_ID })
    binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, userIdBuffer)
  }
  void enterScene()
})

// Retrieve userId so we can start sending this info as the networkId
async function getUser() {
  if (myProfile) return myProfile
  const { data } = await getUserData({})
  if (data?.userId) {
    const userId = data.userId
    const networkId = componentNumberFromName(data.userId)
    myProfile = { userId, networkId }
    // console.log('[getUser]: ', myProfile)
    return myProfile
  }
  return undefined
}
void getUser()

export function syncEntity(entity: Entity, components: number[], id?: number) {
  if (!myProfile.networkId) {
    throw new Error('USER_ID NOT INITIALIZED')
  }
  // It it has an identifier, then the networkId and the identifier should be the same for everyone
  // If not, use the profile as the networkId, and the real entityId to then map the entity
  const networkEntity =
    id !== undefined ? { entityId: id as Entity, networkId: 0 } : { entityId: entity, networkId: myProfile.networkId }
  NetworkEntity.create(entity, networkEntity)
  SyncComponents.create(entity, { componentIds: components })
}

// enum Entities {
//   HOUSE = 1,
//   DOOR = 2
// }
// Syncronize Entities that are created on every client, inside the main function.
// Same entity for all clients.
// This is usefull when you have static entities that are created on every client, and you want to syncronized something about them.
// For example a door of a house. You want to every client create the same entity.
// We use the Entities enum to tag the entity with an unique identifier, so every client knows which entity you are modifying, no matter the order they are created
// This is used for code that is being executed on every client, and you want to sync some component about it. If you dont tag them, you can't be sure that both clients are talking about the same entity.
// Maybe for client A the door is the entity 512, but for client B its 513, and you will have some missmatch there.
// i.e.
// const houseEntity = engine.addEntity()
// syncEntity(houseEntity, [Transform.componentId], Entities.HOUSE)

// Syncronize RUNTIME/DYNAMIC entities
// When you want to create an entity after some condition, or interacion of the client, and want to replicate this new entity to all the clients.
// The client that runs this code will create an UNIQUE entity and will be replicated.
// For example bullets of a gun. Every client will have their own bullets, and every time they shot the gun
// a new entity (bullet) will be created and replicated on every client.
// Another example could be the spawn cubes. Every client that spawns a cube, will spawn an unique cube, and will be replicated on the others.
// All this examples have the same pattern, code that is being executed in only one client, and need to be sync/replicated on the other ones.
// function onShoot() {
//  const bullet = engine.addEntity()
//  Transform.create(bullet, {})
//  Material.create(bullet, {})
//  syncEntity(bullet, [Transform.componentId, Material.componentId])
// }
// If we dont use the SyncStaticEntities for static models like the house. Then each client will create a new House, and that House will be replicated
// on every client. So if you have 10 clients, you will have 10 houses being syncronized.
// That's why we use the SyncStaticEntities identifier for things that you want to be created only once, and can syncronized if some component changed.
