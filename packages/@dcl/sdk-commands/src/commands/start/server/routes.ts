import { WebSocket } from 'ws'
import { setupRealmAndComms } from './realm'
import { Router } from '@well-known-components/http-server'
import { setupEcs6Endpoints } from './endpoints'
import { PreviewComponents } from '../types'
import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'

export async function wireRouter(components: PreviewComponents, dir: string) {
  const router = new Router<PreviewComponents>()

  const sceneUpdateClients = new Set<WebSocket>()

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
