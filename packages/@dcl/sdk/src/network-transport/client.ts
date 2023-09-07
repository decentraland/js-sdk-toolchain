import { serializeCrdtMessages } from '../internal/transports/logger'
import { craftMessage, createNetworkEntityFactory, encodeString, syncFilter } from './utils'
import { Transport, engine } from '@dcl/ecs'
import { getHeaders } from '~system/SignedFetch'

import { MessageType, NetworkEntityFactory, Socket } from './types'

export type ClientTransportConfig = {
  serverUrl: string
}

export async function createClientTransport({ serverUrl }: ClientTransportConfig): Promise<NetworkEntityFactory> {
  const messagesToProcess: Uint8Array[] = []

  return new Promise<NetworkEntityFactory>((resolve, reject) => {
    try {
      const ws = new WebSocket(serverUrl) as Socket
      ws.binaryType = 'arraybuffer'

      ws.onopen = async () => {
        console.log('WS Server Sync connected')
        const { headers } = await getHeaders({ url: serverUrl, init: { headers: {} } })
        ws.send(craftMessage(MessageType.Auth, encodeString(JSON.stringify(headers))))

        const transport: Transport = {
          filter: syncFilter,
          send: async (message: Uint8Array) => {
            ws.send(craftMessage(MessageType.Crdt, message))
            if (messagesToProcess && messagesToProcess.length) {
              if (transport.onmessage) {
                for (const byteArray of messagesToProcess) {
                  // Log messages
                  // const logMessages = Array.from(serializeCrdtMessages('RecievedMessages', byteArray, engine))
                  // if (logMessages.length) console.log(logMessages)
                  // Log messages
                  transport.onmessage(byteArray)
                }
              }
            }
            messagesToProcess.length = 0
          }
        }
        engine.addTransport(transport)
      }

      ws.onmessage = (event) => {
        if (event.data.byteLength) {
          let offset = 0
          const r = new Uint8Array(event.data)
          const view = new DataView(r.buffer)
          const msgType = view.getUint8(offset)
          offset += 1

          if (msgType === MessageType.Crdt) {
            messagesToProcess.push(r.subarray(offset))
          } else if (msgType === MessageType.Init) {
            const start = view.getUint32(offset)
            offset += 4
            const size = view.getUint32(offset)
            offset += 4
            const localEntitiesReserved = view.getUint32(offset)
            offset += 4
            resolve(createNetworkEntityFactory(localEntitiesReserved, [start, start + size]))
            messagesToProcess.push(r.subarray(offset))
          }
        }
      }

      ws.onerror = (e) => {
        console.error(e)
        reject(e)
      }
    } catch (err) {
      reject(err)
    }
  })
}
