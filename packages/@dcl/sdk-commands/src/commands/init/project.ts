import path from 'path'

import { SCENE_FILE } from '../../logic/scene-validations'
import { Options } from '.'
import { ScaffoldedProject } from './repos'
import { Scene } from '@dcl/schemas'

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

export async function augmentProject(project: ScaffoldedProject, dest: string, options: Options) {
  if (project === 'px-template') {
    const scene = {
      ...getMinimalSceneJson(),
      isPortableExperience: true,
      display: {
        title: 'SDK7 Portable Experience Scene Template',
        description: 'portable experience template scene with SDK7'
      }
    }
    await options.components.fs.writeFile(path.resolve(dest, SCENE_FILE), JSON.stringify(scene, null, 2), 'utf-8')
  }
}
