import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import { WebSocket } from 'ws'

import { DataLayerRpc } from './rpc'

export async function handleDataLayerWs(ws: WebSocket, { rpcServer, engine }: DataLayerRpc) {
  const wsTransport = WebSocketTransport(ws as any)
  rpcServer.attachTransport(wsTransport, { engine })

  ws.on('error', (error: any) => {
    console.error(error)
    ws.close()
  })

  ws.on('close', () => {
    console.debug('Websocket closed')
  })
}
