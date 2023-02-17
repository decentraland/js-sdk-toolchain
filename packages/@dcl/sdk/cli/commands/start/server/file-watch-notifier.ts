import { sdk } from '@dcl/schemas'
import path from 'path'
import { WebSocket } from 'ws'
import chokidar from 'chokidar'
import { getDCLIgnorePatterns } from '../../../logic/dcl-ignore'
import { PreviewComponents } from '../types'

/**
 * This function gets file modification events and sends them to all the connected
 * websockets, it is used to hot-reload assets of the scene.
 *
 * IMPORTANT: this is a legacy protocol and needs to be revisited for SDK7
 */
export async function wireFileWatcherToWebSockets(
  components: Pick<PreviewComponents, 'fs' | 'ws'>,
  projectRoot: string
) {
  const { clients } = components.ws.ws
  const ignored = await getDCLIgnorePatterns(components, projectRoot)

  chokidar
    .watch(path.resolve(projectRoot), {
      ignored,
      ignoreInitial: false,
      cwd: projectRoot
    })
    .on('all', async (_, _file) => {
      // TODO: accumulate changes in an array and debounce
      return updateScene(projectRoot, clients)
    })
}

function updateScene(dir: string, clients: Set<WebSocket>): void {
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
