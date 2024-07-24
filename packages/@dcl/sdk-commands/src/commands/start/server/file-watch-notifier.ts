/* eslint-disable no-console */
import { sdk } from '@dcl/schemas'
import path from 'path'
import { WebSocket } from 'ws'
import chokidar from 'chokidar'
import { getDCLIgnorePatterns } from '../../../logic/dcl-ignore'
import { PreviewComponents } from '../types'
import { sceneUpdateClients } from './routes'
import { ProjectUnion } from '../../../logic/project-validations'
import { b64HashingFunction } from '../../../logic/project-files'
import {
  WsSceneMessage,
  UpdateModelType
} from '@dcl/protocol/out-js/decentraland/sdk/development/local_development.gen'

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
  projectKind: ProjectUnion['kind'],
  desktopClient: boolean
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
      }, 500)
    )
}

function isGLTFModel(file: string) {
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

/*
 */
/**
 * @deprecated old explorer (kernel)
 */
export function __LEGACY__updateScene(dir: string, clients: Set<WebSocket>, projectKind: ProjectUnion['kind']): void {
  console.log('update scene')
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
