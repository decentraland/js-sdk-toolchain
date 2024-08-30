import { IEngine, PlayerIdentityData, Transport } from '@dcl/ecs'
import type { SendBinaryRequest, SendBinaryResponse } from '~system/CommunicationsController'

import { syncFilter } from './filter'
import { engineToCrdt } from './state'
import { BinaryMessageBus, CommsMessage, decodeString, encodeString } from './binary-message-bus'
import { fetchProfile, setInitialized, stateInitializedChecker } from './utils'
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

  // Add Sync Transport
  const transport: Transport = {
    filter: syncFilter(engine),
    send: async (message: Uint8Array) => {
      if (message.byteLength) {
        // console.log(Array.from(serializeCrdtMessages('[send CRDT]: ', message, engine)))
        binaryMessageBus.emit(CommsMessage.CRDT, message)
      }
      const messages = getMessagesToSend()
      const response = await sendBinary({ data: messages })
      binaryMessageBus.__processMessages(response.data)
    },
    type: 'network'
  }
  engine.addTransport(transport)
  // End add sync transport

  // Add state intialized checker
  engine.addSystem(() => stateInitializedChecker(engine, myProfile, entityDefinitions.syncEntity))

  // If we dont have any state initialized, and recieve a state message.
  binaryMessageBus.on(CommsMessage.RES_CRDT_STATE, (value) => {
    const { sender, data } = decodeCRDTState(value)
    console.log('[RES_CRDT_STATE]', sender, data)
    if (sender !== myProfile.userId) return
    setInitialized()
    transport.onmessage!(data)
  })
  const players = definePlayerHelper(engine)

  let connectedPlayers: Set<string> = new Set()

  async function logPlayers() {
    let dirty = false
    const players = new Set<string>()
    const component = engine.getComponent(PlayerIdentityData.componentId) as typeof PlayerIdentityData
    for (const[entity, player] of engine.getEntitiesWith(component)) {
      if (!connectedPlayers.has(player.address)) {
        dirty = true
      }
      players.add(player.address)
    }
    if (dirty || players.size !== connectedPlayers.size) {
      console.log(...Array.from(players))
    }
    connectedPlayers = players
    await wait(1000)
    logPlayers()
  }
  logPlayers()

  players.onEnterScene((player) => {
    console.log('[onEnterScene]', player.userId)

    async function sendCRDT(userId: string) {
      // Wait till the user is connected to comms
      // TODO: create an API or a Component to know this.
      // Then the user when joins the scene can request de state and each player answer to that request.
      await wait(2000)
      // if the user is still in the scene
      if (players.getPlayer({ userId })) {
        binaryMessageBus.emit(CommsMessage.RES_CRDT_STATE, encodeCRDTState(userId, engineToCrdt(engine)))
      }
    }
    if (player.userId === myProfile.userId) return
    void sendCRDT(player.userId)
  })

  players.onLeaveScene((userId) => {
    console.log('[onLeaveScene]', userId)
    if (userId === myProfile.userId) {
      setInitialized(false)
    }
  })

  // Process CRDT messages here
  binaryMessageBus.on(CommsMessage.CRDT, (value) => {
    console.log(Array.from(serializeCrdtMessages('[receive CRDT]: ', value, engine)))
    transport.onmessage!(value)
  })

  async function wait(ms: number) {
    return new Promise<void>((resolve) => {
      let timer = 0
      function timerFn(dt: number) {
        timer += dt
        if (timer * 1000 >= ms) {
          resolve()
          engine.removeSystem(timerFn)
        }
      }
      engine.addSystem(timerFn)
    })
  }

  return {
    ...entityDefinitions,
    myProfile
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
