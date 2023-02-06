import path from 'path'
import fs from 'fs-extra'
import chokidar from 'chokidar'
import { sdk } from '@dcl/schemas'
import { WebSocket } from 'ws'
import { resolve } from 'path'

import { getSceneFile } from '../preview/project'
import { CliComponents } from '../../components'
import { setupBffAndComms } from './bff'
import { Router } from '@well-known-components/http-server'
import { setupEcs6Endpoints } from './endpoints'
import { CliError } from '../../utils/error'
import { PreviewComponents } from './types'
import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'

export async function wire(
  components: Pick<CliComponents, 'fs'>,
  dir: string,
  previewComponents: PreviewComponents,
  watch: boolean = false
) {
  const npmModulesPath = path.resolve(dir, 'node_modules')

  // TODO: dcl.project.needsDependencies() should do this
  if (!fs.pathExistsSync(npmModulesPath)) {
    throw new CliError(`Couldn\'t find ${npmModulesPath}, please run: npm install`)
  }

  const router = new Router<PreviewComponents>()

  const sceneUpdateClients = new Set<WebSocket>()

  router.get('/', async (ctx, next) => {
    if (ctx.request.headers.get('upgrade') === 'websocket') {
      return upgradeWebSocketResponse((ws) => initWsConnection(ws as any as WebSocket, sceneUpdateClients))
    }

    return next()
  })

  setupBffAndComms(previewComponents, router)
  setupEcs6Endpoints(dir, router)

  previewComponents.server.setContext(previewComponents)
  previewComponents.server.use(router.allowedMethods())
  previewComponents.server.use(router.middleware())

  if (watch) {
    const { clients } = previewComponents.ws.ws
    chokidar
      .watch(resolve(dir, 'bin'), {
        ignoreInitial: false,
        cwd: dir
      })
      .on('all', async (_, file) => {
        if (await shouldUpdateScene(components, dir, file)) {
          return updateScene(dir, clients)
        }
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

const shouldUpdateScene = async (
  components: Pick<CliComponents, 'fs'>,
  dir: string,
  file: string
): Promise<boolean> => {
  const sceneFile = await getSceneFile(components, dir)
  if (resolve(file) !== resolve(dir, sceneFile.main)) {
    // ignore source files
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      return false
    }
  }

  return true
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
