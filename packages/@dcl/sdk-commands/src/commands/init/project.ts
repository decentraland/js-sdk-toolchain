import path from 'path'
import { Scene } from '@dcl/schemas'

import { CliComponents } from '../../components'
import { SCENE_FILE } from '../../logic/scene-validations'

export function getMinimalSceneJson(): Partial<Scene> & { ecs7: boolean; runtimeVersion: string } {
  return {
    ecs7: true,
    runtimeVersion: '7',
    display: {
      title: 'SDK7 Scene Template',
      description: 'template scene with SDK7'
    },
    scene: {
      parcels: ['0,0'],
      base: '0,0'
    },
    main: 'bin/index.js'
  }
}

export async function createPxSceneJson(dir: string, fs: CliComponents['fs']) {
  const scene = {
    ...getMinimalSceneJson(),
    isPortableExperience: true,
    display: {
      title: 'SDK7 Portable Experience Scene Template',
      description: 'portable experience template scene with SDK7'
    }
  }
  await fs.writeFile(path.resolve(dir, SCENE_FILE), JSON.stringify(scene, null, 2), 'utf-8')
}
