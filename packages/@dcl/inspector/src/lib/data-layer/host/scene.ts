import { CrdtMessageType, OnChangeFunction } from '@dcl/ecs'
import { Scene } from '@dcl/schemas'

import { FileSystemInterface } from '../types'
import { parseSceneFromComponent } from './utils/component'
import { EditorComponentNames, EditorComponentsTypes } from '../../sdk/components'

type SceneWithDefaults = Scene & {
  display: {
    title: string
  }
}

export interface SceneProvider {
  onChange: OnChangeFunction
  getScene: () => SceneWithDefaults
}

function bufferToScene(sceneBuffer: Buffer): Scene {
  return JSON.parse(new TextDecoder().decode(sceneBuffer))
}

function sceneToBuffer(scene: Scene): Buffer {
  return Buffer.from(JSON.stringify(scene, null, 2), 'utf-8')
}

function updateScene(scene: Scene, value: EditorComponentsTypes['Scene']): Scene {
  return {
    ...scene,
    ...parseSceneFromComponent(value)
  }
}

async function getScene(fs: FileSystemInterface): Promise<SceneWithDefaults> {
  let scene: Scene = {} as Scene
  try {
    scene = bufferToScene(await fs.readFile('scene.json'))
  } catch (e) {
    console.error('Reading scene.json file failed: ', e)
  }

  const sceneWithDefaults = augmentDefaults(fs, scene)
  return sceneWithDefaults
}

function augmentDefaults(fs: FileSystemInterface, scene: Scene): SceneWithDefaults {
  return {
    ...scene,
    display: {
      ...scene.display,
      title: scene.display?.title || fs.cwd()
    }
  }
}

export async function initSceneProvider(fs: FileSystemInterface): Promise<SceneProvider> {
  let scene: SceneWithDefaults = await getScene(fs)

  return {
    onChange(_, operation, component, componentValue) {
      if (operation === CrdtMessageType.PUT_COMPONENT && component?.componentName === EditorComponentNames.Scene) {
        const updatedScene = updateScene(scene, componentValue as EditorComponentsTypes['Scene'])
        scene = augmentDefaults(fs, updatedScene)
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
