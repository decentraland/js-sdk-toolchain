import { sdk } from '@dcl/schemas'
import path from 'path'
import { WebSocket } from 'ws'
import chokidar from 'chokidar'
import { dumpEngineToCrdtCommands } from '@dcl/inspector'
import { getDCLIgnorePatterns } from '../../../logic/dcl-ignore'
import { PreviewComponents } from '../types'
import { sceneUpdateClients } from './routes'
import { ProjectUnion } from '../../../logic/project-validations'
import { b64HashingFunction } from '../../../logic/project-files'
import {
  WsSceneMessage,
  UpdateModelType
} from '@dcl/protocol/out-js/decentraland/sdk/development/local_development.gen'
import { debounce } from '../../../logic/debounce'
import { buildEngineFromScene, mainEntitiesPath, readMainEntities } from '../../../logic/main-entities'
import { printError } from '../../../logic/beautiful-logs'

/**
 * This function gets file modification events and sends them to all the connected
 * websockets, it is used to hot-reload assets of the scene.
 *
 * IMPORTANT: this is a legacy protocol and needs to be revisited for SDK7
 */
export async function wireFileWatcherToWebSockets(
  components: Pick<PreviewComponents, 'fs' | 'ws' | 'logger'>,
  projectRoot: string,
  projectKind: ProjectUnion['kind'],
  desktopClient: boolean
) {
  const ignored = await getDCLIgnorePatterns(components, projectRoot)
  // Editor writes go through the /editor/changes endpoint which updates
  // main-entities.ts and regenerates main.crdt out-of-band. Treating
  // those writes as scene changes would force a full reload and reset
  // editor state mid-session.
  ignored.push('**/main-entities.ts', '**/main.crdt')
  const sceneId = b64HashingFunction(projectRoot)

  chokidar
    .watch(path.resolve(projectRoot), {
      atomic: false,
      ignored,
      ignoreInitial: false,
      cwd: projectRoot
    })
    .on('unlink', (_: unknown, file: string) => {
      if (desktopClient) {
        return removeModel(sceneId, file)
      }
    })
    .on(
      'all',
      debounce(async (a, file) => {
        if (desktopClient) {
          updateScene(sceneId, file)
        }
        return __LEGACY__updateScene(projectRoot, sceneUpdateClients, projectKind)
      }, 800)
    )
}

function isGLTFModel(file: string) {
  if (!file) return false
  return file.toLowerCase().endsWith('.glb') || file.toLowerCase().endsWith('.gltf')
}

function updateScene(sceneId: string, file: string) {
  let message: WsSceneMessage['message']
  if (isGLTFModel(file)) {
    message = {
      $case: 'updateModel',
      updateModel: { hash: b64HashingFunction(file), sceneId, src: file, type: UpdateModelType.UMT_CHANGE }
    }
  } else {
    message = {
      $case: 'updateScene',
      updateScene: { sceneId }
    }
  }
  sendSceneMessage({ message })
}

function removeModel(sceneId: string, file: string) {
  if (isGLTFModel(file)) {
    const sceneMessage: WsSceneMessage = {
      message: {
        $case: 'updateModel',
        updateModel: { sceneId, src: file, hash: b64HashingFunction(file), type: UpdateModelType.UMT_REMOVE }
      }
    }

    sendSceneMessage(sceneMessage)
  }
}

function sendSceneMessage(sceneMessage: WsSceneMessage) {
  const message = WsSceneMessage.encode(sceneMessage).finish()
  for (const client of sceneUpdateClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message, { binary: true })
    }
  }
}

/**
 * Watch main-entities.ts and regenerate main.crdt out of band when the file
 * changes. Designed to coexist with the synchronous regeneration in the
 * `/editor/changes` POST handler:
 *
 * - Editor drag → POST writes main-entities.ts AND main.crdt synchronously.
 *   The watcher fires ~300ms later, sees that main.crdt is at least as fresh
 *   as main-entities.ts, and skips. No double regen.
 *
 * - AI / human edits main-entities.ts directly (no POST) → main.crdt is
 *   older than main-entities.ts → watcher regenerates main.crdt.
 *
 * Does NOT notify scene update clients (main.crdt is in the main watcher's
 * ignore list), so editor sessions keep their state. Next reload picks up
 * the fresh CRDT.
 */
export function watchMainEntitiesFile(
  components: Pick<PreviewComponents, 'fs' | 'logger'>,
  workingDirectory: string
): void {
  const filePath = mainEntitiesPath(workingDirectory)
  const crdtPath = path.join(workingDirectory, 'main.crdt')

  const regen = debounce(async () => {
    try {
      // Skip if the POST handler already produced a fresh main.crdt.
      const entitiesMtime = (await components.fs.stat(filePath)).mtimeMs
      let crdtMtime = 0
      try {
        crdtMtime = (await components.fs.stat(crdtPath)).mtimeMs
      } catch {
        // main.crdt doesn't exist yet — definitely need to regen.
      }
      if (crdtMtime >= entitiesMtime) return

      const scene = await readMainEntities(components, workingDirectory)
      if (!scene || Object.keys(scene).length === 0) return
      const engine = buildEngineFromScene(scene)
      const crdtData = dumpEngineToCrdtCommands(engine as any)
      await components.fs.writeFile(crdtPath, crdtData)
      components.logger.log('[editor] regenerated main.crdt from main-entities.ts')
    } catch (err) {
      printError(components.logger, 'Failed to regenerate main.crdt', err as Error)
    }
  }, 300)

  chokidar
    .watch(filePath, { ignoreInitial: true, atomic: true })
    .on('add', regen)
    .on('change', regen)
}

/**
 * @deprecated old explorer (kernel)
 */
export function __LEGACY__updateScene(dir: string, clients: Set<WebSocket>, projectKind: ProjectUnion['kind']): void {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      const message: sdk.SceneUpdate = {
        type: sdk.SCENE_UPDATE,
        payload: { sceneId: b64HashingFunction(dir), sceneType: projectKind }
      }

      // Old explorer
      client.send(sdk.UPDATE, { binary: false })
      client.send(JSON.stringify(message), { binary: false })
    }
  }
}
