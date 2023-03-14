import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import { WebSocket } from 'ws'

import { DataLayerRPC } from './rpc'

export async function handleDataLayerWs(ws: WebSocket, { rpcServer, engine }: DataLayerRPC) {
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
