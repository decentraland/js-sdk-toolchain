import * as utf8 from '@protobufjs/utf8'
import { getHeaders } from '~system/SignedFetch'
import { changeRealm } from '~system/RestrictedActions'

import { encodeString } from '../network-transport/utils'
import { Socket } from '../network-transport/types'

export enum MessageType {
  Auth = 1,
  Match = 2
}

export function craftMessage(msgType: MessageType, payload: Uint8Array): Uint8Array {
  const msg = new Uint8Array(payload.byteLength + 1)
  msg.set([msgType])
  msg.set(payload, 1)
  return msg
}

export async function connectToMatchMackingServer(serverUrl: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      const ws = new WebSocket(serverUrl) as Socket
      ws.binaryType = 'arraybuffer'

      ws.onopen = async () => {
        console.log('WS Matchmaking server connected')
        const { headers } = await getHeaders({ url: serverUrl, init: { headers: {} } })
        ws.send(craftMessage(MessageType.Auth, encodeString(JSON.stringify(headers))))
        resolve()
      }

      ws.onmessage = (event) => {
        if (event.data.byteLength) {
          let offset = 0
          const r = new Uint8Array(event.data)
          const view = new DataView(r.buffer)
          const msgType = view.getUint8(offset)
          offset += 1

          if (msgType === MessageType.Match) {
            const s = r.subarray(offset)
            const realm = utf8.read(s, 0, s.length)
            changeRealm({ realm })
              .then(() => resolve())
              .catch(reject)
          }
        }
      }

      ws.onerror = (e) => {
        console.error(e)
        reject(e)
      }
      ws.onclose = () => {
        reject(new Error('socket closed'))
      }
    } catch (err) {
      reject(err)
    }
  })
}
