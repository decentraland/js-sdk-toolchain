import { Entity, Transport, engine } from '@dcl/sdk/ecs'
import { componentNumberFromName } from '@dcl/ecs/dist/components/component-number'

import { syncFilter, NetworkEntity } from '@dcl/sdk/network-transport/utils'
import { serializeCrdtMessages } from '@dcl/sdk/internal/transports/logger'
import { sendBinary } from '~system/CommunicationsController'
import { getUserData } from '~system/UserIdentity'

export function addSyncTransport() {
  const transport: Transport = {
    filter: syncFilter,
    send: async (message: Uint8Array) => {
      const messagesToProcess = await sendBinary({ data: message })
      if (messagesToProcess.data.length) {
        if (transport.onmessage) {
          for (const byteArray of messagesToProcess.data) {
            console.log(Array.from(serializeCrdtMessages('[CRDT Receive]: ', byteArray, engine)))
            transport.onmessage(byteArray)
          }
        }
      }
    },
    type: 'network'
  }
  engine.addTransport(transport)
}

let userId: number
async function getUser() {
  const data = await getUserData({})
  if (data.data?.userId) {
    userId = componentNumberFromName(data.data?.userId)
  }
}
void getUser()

export const addNetworkEntity = (entity: Entity) => {
  if (!userId) {
    throw new Error('Invalid user address')
  }
  NetworkEntity.create(entity, { entityId: entity, userId })
}
