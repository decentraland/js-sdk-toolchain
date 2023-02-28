import { resolve } from 'path'
import { Scene } from '@dcl/schemas'
import { CliError } from './error'
import { getObject, inBounds, getBounds, areConnected } from './coordinates'
import { CliComponents } from '../components'
import { getSceneJson } from './project-files'

export const SCENE_FILE = 'scene.json'

/**
 * Composes the path to the `scene.json` file based on the provided path.
 * @param projectRoot The path to the directory containing the scene file.
 */
export function getSceneFilePath(projectRoot: string): string {
  return resolve(projectRoot, SCENE_FILE)
}

export function assertValidScene(scene: Scene) {
  if (!Scene.validate(scene)) {
    const errors: string[] = []
    if (Scene.validate.errors) {
      for (const error of Scene.validate.errors) {
        errors.push(`Error validating scene.json: ${error.message}`)
      }
    }
    throw new CliError('Invalid scene.json file:\n' + errors.join('\n'))
  }

  const parcelSet = new Set(scene.scene?.parcels)

  if (parcelSet.size < scene.scene?.parcels?.length) {
    throw new CliError(`There are duplicated parcels at scene.json.`)
  }

  if (!parcelSet.has(scene.scene?.base)) {
    throw new CliError(`Your base parcel ${scene.scene?.base} should be included on parcels attribute at scene.json`)
  }

  const objParcels = scene.scene?.parcels?.map(getObject)
  objParcels.forEach(({ x, y }) => {
    if (inBounds(x, y)) {
      return
    }
    const { minX, maxX } = getBounds()
    throw new CliError(`Coordinates ${x},${y} are outside of allowed limits (from ${minX} to ${maxX})`)
  })

  if (!areConnected(objParcels)) {
    throw new CliError('Parcels described on scene.json are not connected. They should be one next to each other')
  }

  if (!scene.main?.endsWith('.js')) {
    throw new CliError(`Main scene format file (${scene.main}) is not a supported format`)
  }

  return scene
}

/**
 * Fails the execution if one of the parcel data is invalid
 */
export async function validateSceneJson(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  projectRoot: string
): Promise<Scene> {
  try {
    const sceneJson = await getSceneJson(components, projectRoot)

    return assertValidScene(sceneJson)
  } catch (err: any) {
    throw new CliError(`Error reading the scene.json file: ${err.message}`)
  }
}

export function getBaseCoords(scene: Scene): { x: number; y: number } {
  const [x, y] = scene.scene.base
    .replace(/\ /g, '')
    .split(',')
    .map((a) => parseInt(a))
  return { x, y }
}
