import { sdk } from '@dcl/schemas'
import path from 'path'
import { WebSocket } from 'ws'
import chokidar from 'chokidar'
import { getDCLIgnorePatterns } from '../../../logic/dcl-ignore'
import { PreviewComponents } from '../types'
import { sceneUpdateClients } from './routes'
import { ProjectUnion } from '../../../logic/project-validations'
import { b64UrlHashingFunction } from '../../../logic/project-files'
import {
  WsSceneMessage,
  UpdateModelType
} from '@dcl/protocol/out-js/decentraland/sdk/development/local_development.gen'
import { debounce } from '../../../logic/debounce'

/**
 * This function gets file modification events and sends them to all the connected
 * websockets, it is used to hot-reload assets of the scene.
 */
export async function wireFileWatcherToWebSockets(
  components: Pick<PreviewComponents, 'fs' | 'ws' | 'logger'>,
  projectRoot: string,
  projectKind: ProjectUnion['kind'],
  onProjectChanged?: () => void
) {
  const ignored = await getDCLIgnorePatterns(components, projectRoot)
  const sceneId = b64UrlHashingFunction(projectRoot)

  // ignoreInitial is false because the desktop client wants the initial scan,
  // but asset bundles must not: the first conversion already reads current
  // content, so an invalidate from the scan re-converts identical input. It
  // fired on essentially every boot, and if the cold conversion was still
  // running the two runs wrote the same cache directory concurrently.
  //
  // Recorded per event rather than checked inside the debounce: chokidar emits
  // 'ready' as soon as the scan finishes, which is well inside the 800ms
  // trailing window, so a flag read in the callback is always true by then.
  // The undebounced listener is registered first, so it has already run for
  // each event by the time the debounced one is scheduled.
  let scanned = false
  let changedSinceScan = false

  chokidar
    .watch(path.resolve(projectRoot), {
      atomic: false,
      ignored,
      ignoreInitial: false,
      cwd: projectRoot
    })
    .on('ready', () => {
      scanned = true
    })
    .on('unlink', (file: string) => {
      removeModel(sceneId, file)
    })
    .on('all', () => {
      if (scanned) changedSinceScan = true
    })
    .on(
      'all',
      debounce(async (_, file) => {
        // Before the reload notification: whatever the client refetches next
        // must not be bundles built from the previous version of these files.
        if (changedSinceScan) {
          changedSinceScan = false
          onProjectChanged?.()
        }
        updateScene(sceneId, file)
        // Legacy JSON protocol: still the only one Bevy and Godot explorers understand.
        // Remove once both consume the protobuf WsSceneMessage.
        __LEGACY__updateScene(projectRoot, sceneUpdateClients, projectKind)
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
      updateModel: { hash: b64UrlHashingFunction(file), sceneId, src: file, type: UpdateModelType.UMT_CHANGE }
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
        updateModel: { sceneId, src: file, hash: b64UrlHashingFunction(file), type: UpdateModelType.UMT_REMOVE }
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
 * @deprecated legacy JSON protocol, consumed by Bevy and Godot explorers
 */
export function __LEGACY__updateScene(dir: string, clients: Set<WebSocket>, projectKind: ProjectUnion['kind']): void {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      const message: sdk.SceneUpdate = {
        type: sdk.SCENE_UPDATE,
        payload: { sceneId: b64UrlHashingFunction(dir), sceneType: projectKind }
      }

      client.send(sdk.UPDATE, { binary: false })
      client.send(JSON.stringify(message), { binary: false })
    }
  }
}
