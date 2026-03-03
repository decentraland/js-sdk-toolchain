import QRCode from 'qrcode'
import { Router } from '@well-known-components/http-server'
import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'
import { WebSocket } from 'ws'
import { Workspace } from '../../../logic/workspace-validations'
import { DataLayer } from '../data-layer/rpc'
import { handleDataLayerWs } from '../data-layer/ws'
import { PreviewComponents } from '../types'
import { setupEcs6Endpoints } from './endpoints'
import { setupStorageEndpoints } from './storage-service'
import { setupRealmAndComms } from './realm'
import { getLanUrl } from '../utils'

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

  const localSceneParcels: string[] = []
  const baseParcel = workspace.projects[0].scene.scene.base
  for (const project of workspace.projects) {
    for (const parcel of project.scene.scene.parcels) {
      localSceneParcels.push(parcel)
    }
  }

  // Mobile preview QR code endpoint
  router.get('/mobile-preview', async (ctx) => {
    const lanUrl = getLanUrl(ctx.url.port)
    if (!lanUrl) {
      return {
        status: 404,
        body: { ok: false, error: 'No LAN IP address found' }
      }
    }

    const [x, y] = baseParcel.split(',')
    const deepLink = `decentraland://open?preview=${lanUrl}&position=${x},${y}`
    const qrDataUrl = await QRCode.toDataURL(deepLink)

    return {
      headers: { 'content-type': 'application/json' },
      body: {
        ok: true,
        data: {
          url: deepLink,
          qr: qrDataUrl
        }
      }
    }
  })

  setupRealmAndComms(components, router, localSceneParcels)
  setupStorageEndpoints(components, router, workspace)
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
