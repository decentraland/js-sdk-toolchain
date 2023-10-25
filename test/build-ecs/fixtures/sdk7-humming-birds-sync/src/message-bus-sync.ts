import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { EngineInfo, Entity, NetworkEntity, Transport, engine } from '@dcl/sdk/ecs'
import { componentNumberFromName } from '@dcl/ecs/dist/components/component-number'
import { syncFilter } from '@dcl/sdk/network-transport/utils'
import { engineToCrdt } from '@dcl/sdk/network-transport/state'
import { serializeCrdtMessages } from '@dcl/sdk/internal/transports/logger'
import { MessageBus } from '@dcl/sdk/message-bus'
import { sendBinary } from '~system/CommunicationsController'
import { getUserData } from '~system/UserIdentity'
import { getPlayersInScene } from '~system/Players'

enum CommsMessage {
  CRDT = 1,
  REQ_CRDT_STATE = 2,
  RES_CRDT_STATE = 3
}

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
const binaryMessageBus = BinaryMessageBus()
function getMessagesToSend() {
  const messages = [...pendingMessageBusMessagesToSend]
  pendingMessageBusMessagesToSend.length = 0
  return messages
}

// user that we asked for the inital crdt state
let userIdRequestInitState: string
export function addSyncTransport() {
  binaryMessageBus.on(CommsMessage.RES_CRDT_STATE, (value, sender) => {
    console.log(Array.from(serializeCrdtMessages('[binaryMessageBus]: ', value, engine)))
    if (sender.toLocaleLowerCase() === userIdRequestInitState.toLocaleLowerCase()) {
      transport.onmessage!(value)
    }
  })
  binaryMessageBus.on(CommsMessage.REQ_CRDT_STATE, (value) => {
    const buffer = new ReadWriteByteBuffer()
    buffer.writeBuffer(value, true)
    const userId = buffer.readUtf8String()
    console.log('[binaryMessageBus]: REQ_CRDT_STATE', { userId })
    if (userId === myProfile.userId) {
      binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, engineToCrdt(engine))
    }
  })

  // We process CRDT messages here
  binaryMessageBus.on(CommsMessage.CRDT, (value) => {
    if (!syncTransportIsReady()) return
    console.log(Array.from(serializeCrdtMessages('[CRDT Receive]: ', value, engine)))
    transport.onmessage!(value)
  })

  const transport: Transport = {
    filter: syncFilter,
    send: async (message: Uint8Array) => {
      const messages = getMessagesToSend()
      if (syncTransportIsReady() && message.byteLength) {
        console.log(Array.from(serializeCrdtMessages('[CRDT  Send]: ', message, engine)))
        messages.push(craftMessage(CommsMessage.CRDT, message))
      }
      const response = await sendBinary({ data: messages })
      binaryMessageBus.__processMessages(response.data)
    },
    type: 'network'
  }
  engine.addTransport(transport)
}

// UTILS
async function enterScene() {
  const { players } = await getPlayersInScene({})
  if (!players.length) return
  userIdRequestInitState = players[0].userId
  const userIdBuffer = encodeString(userIdRequestInitState)
  binaryMessageBus.emit(CommsMessage.REQ_CRDT_STATE, userIdBuffer)
}
void enterScene()

let myProfile: { networkId: number; userId: string }
async function getUser() {
  const data = await getUserData({})
  if (data.data?.userId) {
    const userId = data.data.userId
    const networkId = componentNumberFromName(data.data?.userId)
    myProfile = { userId, networkId }
  }
}
void getUser()

export const addNetworkEntity = (entity: Entity) => {
  if (!myProfile.networkId) {
    throw new Error('Invalid user address')
  }
  NetworkEntity.create(entity, { entityId: entity, networkId: myProfile.networkId })
}

function BinaryMessageBus<T extends CommsMessage>() {
  const mapping: Map<T, (value: Uint8Array, sender: string) => void> = new Map()
  return {
    on: <K extends T>(message: K, callback: (value: Uint8Array, sender: string) => void) => {
      mapping.set(message, callback)
    },
    emit: <K extends T>(message: K, value: Uint8Array) => {
      console.log('[EMIT]: ', message)
      pendingMessageBusMessagesToSend.push(craftMessage<T>(message, value))
    },
    __processMessages: (messages: Uint8Array[]) => {
      for (const message of messages) {
        const commsMsg = decodeMessage<T>(message)
        if (!commsMsg) continue
        const { sender, messageType, data } = commsMsg
        const fn = mapping.get(messageType)
        if (fn) fn(data, sender), sender
      }
    }
  }
}

export function craftMessage<T extends CommsMessage>(messageType: T, payload: Uint8Array): Uint8Array {
  const msg = new Uint8Array(payload.byteLength + 1)
  msg.set([messageType])
  msg.set(payload, 1)
  return msg
}

export function decodeMessage<T extends CommsMessage>(
  data: Uint8Array
): { sender: string; messageType: T; data: Uint8Array } | undefined {
  try {
    let offset = 0
    const r = new Uint8Array(data)
    const view = new DataView(r.buffer)
    const senderLength = view.getUint8(offset)
    offset += 1
    const sender = decodeString(data.subarray(1, senderLength + 1))
    offset += senderLength
    const messageType = view.getUint8(offset) as T
    offset += 1
    const message = r.subarray(offset)

    return {
      sender,
      messageType,
      data: message
    }
  } catch (e) {
    console.error('Invalid Comms message', e)
  }
}

export function decodeString(data: Uint8Array): string {
  const buffer = new ReadWriteByteBuffer()
  buffer.writeBuffer(data, true)
  return buffer.readUtf8String()
}

export function encodeString(s: string): Uint8Array {
  const buffer = new ReadWriteByteBuffer()
  buffer.writeUtf8String(s)
  return buffer.readBuffer()
}

const messageBus = new MessageBus()
messageBus.on('hola', (value, sender) => console.log({ value, sender }))
messageBus.emit('hola', { boedo: 'casla ' })
