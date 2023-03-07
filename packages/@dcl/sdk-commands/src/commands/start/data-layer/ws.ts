import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import path from 'path'
import { WebSocket } from 'ws'
import { RpcServer } from '@dcl/rpc'

import { CliComponents } from '../../../components'
import { DataLayerContext } from './rpc'
import { createEngine } from './engine'

export async function handleDataLayerWs(
  components: Pick<CliComponents, 'fs'>,
  ws: WebSocket,
  rpcServer: RpcServer<DataLayerContext>,
  projectRoot: string
) {
  const engineState = JSON.parse(await components.fs.readFile(path.resolve(projectRoot, 'engine-state.json'), 'utf8'))
  const engine = await createEngine(engineState)
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
