import { EngineInfo, Entity, NetworkEntity, Transport, engine } from '@dcl/sdk/ecs'
import { polyfillTextEncoder } from '@dcl/sdk/ethereum-provider/text-encoder'
import { componentNumberFromName } from '@dcl/ecs/dist/components/component-number'
import { onEnterSceneObservable } from '@dcl/sdk/observables'
import { MessageBus } from '@dcl/sdk/message-bus'
import { syncFilter } from '@dcl/sdk/network-transport/utils'
import { engineToCrdt } from '@dcl/sdk/network-transport/state'
import { serializeCrdtMessages } from '@dcl/sdk/internal/transports/logger'
import { sendBinary } from '~system/CommunicationsController'
import { getUserData } from '~system/UserIdentity'

export function addSyncTransport() {
  polyfillTextEncoder()
  const messageBus = new MessageBus()
  onEnterSceneObservable.add((data) => {
    // its me
    if (data.userId === userId) return
    const crdtMessages = engineToCrdt(engine)
    console.log('asd', { crdtMessages }, crdtMessages.byteLength)
    messageBus.emit('CRDT_INITIAL_STATE', { userId: data.userId, crdtMessages })
  })
  messageBus.on('CRDT_INITIAL_STATE', (value) => {
    console.log('[CRDT_INITIAL_STATE]', value)
    // message not for me
    const { crdtMessages } = value
    const messages = new (globalThis as any).TextEncoder().encode(crdtMessages)
    console.log({ messages, crdtMessages })

    if (value.userId !== userId || !crdtMessages) return
  })

  const initialCrdtMessages = []
  // We use this flag to avoid sending over the wire all the initial messages that the engine add's to the rendererTransport
  // INITIAL_CRDT_MESSAGES that are being processed on the onStart loop, before the onUpdate.
  let INITIAL_CRDT_RENDERER_MESSAGES_SENT = false
  const transport: Transport = {
    filter: syncFilter,
    send: async (message: Uint8Array) => {
      if (!INITIAL_CRDT_RENDERER_MESSAGES_SENT) {
        const engineInfo = EngineInfo.getOrNull(engine.RootEntity)
        if (engineInfo && engineInfo.tickNumber > 1) {
          INITIAL_CRDT_RENDERER_MESSAGES_SENT = true
        } else {
          return
        }
      }
      message.byteLength && console.log(Array.from(serializeCrdtMessages('[CRDT Send]: ', message, engine)))
      const messagesToProcess = await sendBinary({ data: message })
      if (messagesToProcess.data.length && transport.onmessage) {
        for (const byteArray of messagesToProcess.data) {
          console.log(Array.from(serializeCrdtMessages('[CRDT Receive]: ', byteArray, engine)))
          transport.onmessage(byteArray)
        }
      }
    },
    type: 'network'
  }
  engine.addTransport(transport)
}

let networkId: number
let userId: string
async function getUser() {
  const data = await getUserData({})
  if (data.data?.userId) {
    userId = data.data.userId
    networkId = componentNumberFromName(data.data?.userId)
  }
}
void getUser()

export const addNetworkEntity = (entity: Entity) => {
  if (!networkId) {
    throw new Error('Invalid user address')
  }
  NetworkEntity.create(entity, { entityId: entity, networkId })
}
