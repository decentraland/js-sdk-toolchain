import { sdk } from '@dcl/schemas'
import path from 'path'
import { WebSocket } from 'ws'
import chokidar from 'chokidar'
import { getDCLIgnorePatterns } from '../../../logic/dcl-ignore'
import { PreviewComponents } from '../types'
import { sceneUpdateClients } from './routes'
import { ProjectUnion } from '../../../logic/project-validations'
import { b64HashingFunction } from '../../../logic/project-files'

function debounce<T extends (...args: any[]) => void>(callback: T, delay: number) {
  let debounceTimer: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => callback(...args), delay)
  }
}
/**
 * This function gets file modification events and sends them to all the connected
 * websockets, it is used to hot-reload assets of the scene.
 *
 * IMPORTANT: this is a legacy protocol and needs to be revisited for SDK7
 */
export async function wireFileWatcherToWebSockets(
  components: Pick<PreviewComponents, 'fs' | 'ws'>,
  projectRoot: string,
  projectKind: ProjectUnion['kind']
) {
  const ignored = await getDCLIgnorePatterns(components, projectRoot)

  chokidar
    .watch(path.resolve(projectRoot), {
      ignored,
      ignoreInitial: false,
      cwd: projectRoot
    })
    .on(
      'all',
      debounce(async (_, _file) => {
        // TODO: accumulate changes in an array and debounce
        return updateScene(projectRoot, sceneUpdateClients, projectKind)
      }, 500)
    )
}

/*
 * IMPORTANT: this is a legacy protocol and needs to be revisited for SDK7
 */
function updateScene(dir: string, clients: Set<WebSocket>, projectKind: ProjectUnion['kind']): void {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      const message: sdk.SceneUpdate = {
        type: sdk.SCENE_UPDATE,
        payload: { sceneId: b64HashingFunction(dir), sceneType: projectKind }
      }

      client.send(sdk.UPDATE)
      client.send(JSON.stringify(message))
    }
  }
}
