import { Router } from '@well-known-components/http-server'
import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'
import { WebSocket } from 'ws'
import { Workspace } from '../../../logic/workspace-validations'
import { DataLayer } from '../data-layer/rpc'
import { handleDataLayerWs } from '../data-layer/ws'
import { PreviewComponents } from '../types'
import { setupEcs6Endpoints } from './endpoints'
import { setupRealmAndComms } from './realm'

export const sceneUpdateClients = new Set<WebSocket>()
export async function wireRouter(components: PreviewComponents, workspace: Workspace, dataLayer?: DataLayer) {
  const router = new Router<PreviewComponents>()

  if (dataLayer) {
    router.get('/data-layer', async (ctx, next) => {
      if (ctx.request.headers.get('upgrade') === 'websocket') {
        return upgradeWebSocketResponse((ws) => handleDataLayerWs(components, ws as any, dataLayer))
      }

      return next()
    })
  }

  router.get('/', async (ctx, next) => {
    if (ctx.request.headers.get('upgrade') === 'websocket') {
      return upgradeWebSocketResponse((ws) => initWsConnection(ws as any as WebSocket, sceneUpdateClients))
    }

    return next()
  })

  setupRealmAndComms(components, router)
  await setupEcs6Endpoints(components, router, workspace)

  components.server.setContext(components)
  components.server.use(router.allowedMethods())
  components.server.use(router.middleware())
}

const initWsConnection = (ws: WebSocket, clients: Set<WebSocket>) => {
  if (ws.readyState === ws.OPEN) {
    clients.add(ws)
  } else {
    ws.on('open', () => clients.add(ws))
  }
  ws.on('close', () => clients.delete(ws))
}
