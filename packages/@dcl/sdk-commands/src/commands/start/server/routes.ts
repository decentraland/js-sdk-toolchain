import { Router } from '@well-known-components/http-server'
import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'
import { WebSocket } from 'ws'
import { DataLayer } from '../data-layer/rpc'
import { handleDataLayerWs } from '../data-layer/ws'
import { PreviewComponents } from '../types'
import { setupEcs6Endpoints } from './endpoints'
import { setupRealmAndComms } from './realm'

export async function wireRouter(components: PreviewComponents, dir: string, dataLayer?: DataLayer) {
  const router = new Router<PreviewComponents>()

  const sceneUpdateClients = new Set<WebSocket>()

  if (dataLayer) {
    router.get('/data-layer', async (ctx, next) => {
      if (ctx.request.headers.get('upgrade') === 'websocket') {
        return upgradeWebSocketResponse((ws) => handleDataLayerWs(components, ws, dataLayer))
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
  setupEcs6Endpoints(components, dir, router)

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
