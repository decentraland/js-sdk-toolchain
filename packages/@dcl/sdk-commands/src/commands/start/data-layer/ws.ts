import { RpcServer } from '@dcl/rpc'
import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import { WebSocket } from 'ws'
import { DataLayerContext } from './rpc'
import { createFakeScene } from './rpc-engine'

export async function handleDataLayerWs(ws: WebSocket, rpcServer: RpcServer<DataLayerContext>) {
  const wsTransport = WebSocketTransport(ws as any)
  rpcServer.attachTransport(wsTransport, { engine: await createFakeScene() })

  ws.on('error', (error: any) => {
    console.error(error)
    ws.close()
  })

  ws.on('close', () => {
    console.debug('Websocket closed')
  })
}
