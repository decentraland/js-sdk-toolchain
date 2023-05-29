import { ComponentDefinition, CrdtMessageType, Entity } from '@dcl/ecs'
import { Scene } from '@dcl/schemas'

import { FileSystemInterface } from '../types'
import { parseSceneFromComponent } from './utils/component'
import { EditorComponentIds, EditorComponentsTypes } from '../../sdk/components'

function getUpdatedSceneBuffer(sceneBuffer: Buffer, value: EditorComponentsTypes['Scene']) {
  const scene: Scene = JSON.parse(sceneBuffer.toString())
  const updatedScene: Scene = {
    ...scene,
    ...parseSceneFromComponent(value)
  }

  return Buffer.from(JSON.stringify(updatedScene), 'utf-8')
}

export function initSceneProvider(fs: FileSystemInterface) {
  return {
    onChange: function onChange(
      _: Entity,
      operation: CrdtMessageType,
      component: ComponentDefinition<unknown> | undefined,
      componentValue: unknown
    ) {
      if (operation === CrdtMessageType.PUT_COMPONENT && component?.componentName === EditorComponentIds.Scene) {
        fs.readFile('scene.json')
          .then((content) => {
            const value = componentValue as EditorComponentsTypes['Scene']
            fs.writeFile('scene.json', getUpdatedSceneBuffer(content, value)).catch((err) =>
              console.error('Failed saving scene.json: ', err)
            )
          })
          .catch((err) => console.error('Reading scene.json file failed: ', err))
      }
    }
  }
}
