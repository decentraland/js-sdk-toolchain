import { CrdtMessageType, OnChangeFunction } from '@dcl/ecs'
import { Scene } from '@dcl/schemas'

import { FileSystemInterface } from '../types'
import { parseSceneFromComponent } from './utils/component'
import { EditorComponentIds, EditorComponentsTypes } from '../../sdk/components'

export interface SceneProvider {
  onChange: OnChangeFunction
  getScene: () => Scene
}

function bufferToScene(sceneBuffer: Buffer): Scene {
  return JSON.parse(sceneBuffer.toString())
}

function sceneToBuffer(scene: Scene): Buffer {
  return Buffer.from(JSON.stringify(scene), 'utf-8')
}

function updateScene(scene: Scene, value: EditorComponentsTypes['Scene']): Scene {
  return {
    ...scene,
    ...parseSceneFromComponent(value)
  }
}

async function getScene(fs: FileSystemInterface): Promise<Scene> {
  try {
    return bufferToScene(await fs.readFile('scene.json'))
  } catch (e) {
    console.error('Reading scene.json file failed: ', e)
  }

  // maybe some defaults? idk...
  return {} as Scene
}

export async function initSceneProvider(fs: FileSystemInterface): Promise<SceneProvider> {
  let scene: Scene = await getScene(fs)

  return {
    onChange(_, operation, component, componentValue) {
      if (operation === CrdtMessageType.PUT_COMPONENT && component?.componentName === EditorComponentIds.Scene) {
        scene = updateScene(scene, componentValue as EditorComponentsTypes['Scene'])
        fs.writeFile('scene.json', sceneToBuffer(scene)).catch((err) =>
          console.error('Failed saving scene.json: ', err)
        )
      }
    },
    getScene() {
      return scene
    }
  }
}
