import { resolve } from 'path'
import { Scene } from '@dcl/schemas'
import i18next from 'i18next'

import { CliError } from './error'
import { CliComponents } from '../components'
export interface IFile {
  path: string
  content: Buffer
  size: number
}

export const SMART_WEARABLE_FILE = 'wearable.json'

/**
 * Composes the path to the `scene.json` file based on the provided path.
 * @param projectRoot The path to the directory containing the scene file.
 */
export function getSmartWearableFile(projectRoot: string): string {
  return resolve(projectRoot, SMART_WEARABLE_FILE)
}

export function assertValidSmartWearable(scene: Scene) {
  if (!Scene.validate(scene)) {
    const errors: string[] = []
    if (Scene.validate.errors) {
      for (const error of Scene.validate.errors) {
        errors.push(`Error validating scene.json: ${error.message}`)
      }
    }
    throw new CliError(
      'PORTABLE_EXPERIENCE_SW_INVALID_SCENE_JSON',
      i18next.t('errors.portable_experience_sw_validations.invalid_scene_json', { errors: errors.join('\n') })
    )
  }
  // TODO
  return true
}

/**
 * Get valid Scene JSON
 */
export async function getValidWearableJson(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  projectRoot: string
): Promise<Scene> {
  try {
    const wearableJsonRaw = await components.fs.readFile(getSmartWearableFile(projectRoot), 'utf8')
    const wearableJson = JSON.parse(wearableJsonRaw) as Scene
    return wearableJson
  } catch (err: any) {
    throw new CliError(
      'PORTABLE_EXPERIENCE_SW_INVALID_SCENE_JSON',
      i18next.t('errors.portable_experience_sw_validations.invalid_scene_json', { errors: err.message })
    )
  }
}
