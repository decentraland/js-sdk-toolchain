import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import { WebSocket } from 'ws'
import { RpcServer } from '@dcl/rpc'

import { DataLayerContext } from './rpc'

export async function handleDataLayerWs(ws: WebSocket, rpcServer: RpcServer<DataLayerContext>) {
  const wsTransport = WebSocketTransport(ws as any)
  rpcServer.attachTransport(wsTransport, {})

  ws.on('error', (error: any) => {
    console.error(error)
    ws.close()
  })

  ws.on('close', () => {
    console.debug('Websocket closed')
  })
}
