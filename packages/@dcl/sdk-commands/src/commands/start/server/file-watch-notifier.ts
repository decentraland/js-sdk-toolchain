import path from 'path'
import { WebSocket } from 'ws'
import chokidar from 'chokidar'
import { getDCLIgnorePatterns } from '../../../logic/dcl-ignore'
import { PreviewComponents } from '../types'
import { sceneUpdateClients } from './routes'
import { b64HashingFunction } from '../../../logic/project-files'
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
  projectRoot: string
) {
  const ignored = await getDCLIgnorePatterns(components, projectRoot)
  const sceneId = b64HashingFunction(projectRoot)

  chokidar
    .watch(path.resolve(projectRoot), {
      atomic: false,
      ignored,
      ignoreInitial: false,
      cwd: projectRoot
    })
    .on('unlink', (_: unknown, file: string) => {
      removeModel(sceneId, file)
    })
    .on(
      'all',
      debounce(async (_, file) => {
        updateScene(sceneId, file)
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
