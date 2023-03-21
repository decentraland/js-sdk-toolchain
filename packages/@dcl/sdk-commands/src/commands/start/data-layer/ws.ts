import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import { WebSocket } from 'ws'
import { DataLayer } from './rpc'

export async function handleDataLayerWs(ws: WebSocket, dataLayer: DataLayer) {
  const wsTransport = WebSocketTransport(ws as any)
  dataLayer.rpcServer.attachTransport(wsTransport, dataLayer.context)

  ws.on('error', (error: any) => {
    console.error(error)
    ws.close()
  })

  ws.on('close', () => {
    console.debug('Websocket closed')
  })
}
