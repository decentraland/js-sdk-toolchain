import path from 'path'
import chokidar from 'chokidar'
import { sdk } from '@dcl/schemas'
import { WebSocket } from 'ws'
import { setupBffAndComms } from './bff'
import { Router } from '@well-known-components/http-server'
import { setupEcs6Endpoints } from './endpoints'
import { PreviewComponents } from './types'
import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'
import { getDCLIgnorePatterns } from '../../utils/dcl-ignore'

export async function wire(components: PreviewComponents, dir: string, watch: boolean = false) {
  const router = new Router<PreviewComponents>()

  const sceneUpdateClients = new Set<WebSocket>()

  router.get('/', async (ctx, next) => {
    if (ctx.request.headers.get('upgrade') === 'websocket') {
      return upgradeWebSocketResponse((ws) => initWsConnection(ws as any as WebSocket, sceneUpdateClients))
    }

    return next()
  })

  setupBffAndComms(components, router)
  setupEcs6Endpoints(components, dir, router)

  components.server.setContext(components)
  components.server.use(router.allowedMethods())
  components.server.use(router.middleware())

  if (watch) {
    const { clients } = components.ws.ws
    const ignored = await getDCLIgnorePatterns(components, dir)

    chokidar
      .watch(path.resolve(dir), {
        ignored,
        ignoreInitial: false,
        cwd: dir
      })
      .on('all', async (_, _file) => {
        // TODO: accumulate changes in an array and debounce
        return updateScene(dir, clients)
      })
  }
}

const initWsConnection = (ws: WebSocket, clients: Set<WebSocket>) => {
  if (ws.readyState === ws.OPEN) {
    clients.add(ws)
  } else {
    ws.on('open', () => clients.add(ws))
  }
  ws.on('close', () => clients.delete(ws))
}

const updateScene = (dir: string, clients: Set<WebSocket>): void => {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      const message: sdk.SceneUpdate = {
        type: sdk.SCENE_UPDATE,
        payload: { sceneId: 'b64-' + Buffer.from(dir).toString('base64'), sceneType: sdk.ProjectType.SCENE }
      }

      client.send(sdk.UPDATE)
      client.send(JSON.stringify(message))
    }
  }
}
