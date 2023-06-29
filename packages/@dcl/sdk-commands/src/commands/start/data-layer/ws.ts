import { WebSocketTransport, IWebSocket } from '@dcl/rpc/dist/transports/WebSocket'
import { WebSocket } from 'ws'
import { PreviewComponents } from '../types'
import { DataLayer } from './rpc'

// TODO: dataLayer should be an optional component after WKC supports it
export async function handleDataLayerWs(components: PreviewComponents, ws: WebSocket, dataLayer: DataLayer) {
  const wsTransport = WebSocketTransport(ws as IWebSocket)
  dataLayer.rpcServer.attachTransport(wsTransport, dataLayer.context)

  ws.on('error', (error: any) => {
    components.logger.error(error)
    ws.close()
  })

  ws.on('close', () => {
    components.logger.debug('Websocket closed')
  })
}
