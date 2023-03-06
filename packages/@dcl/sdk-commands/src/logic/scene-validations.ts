import { resolve } from 'path'
import { Scene } from '@dcl/schemas'

import { CliError } from './error'
import { getObject, inBounds, getBounds, areConnected } from './coordinates'
import { CliComponents } from '../components'
import { getPublishableFiles } from './project-files'

export interface IFile {
  path: string
  content: Buffer
  size: number
}

export const SCENE_FILE = 'scene.json'
export const MAX_FILE_SIZE_BYTES = 50 * 1e6 // 50mb

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
}

/**
 * Get valid Scene JSON
 */
export async function getValidSceneJson(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  projectRoot: string
): Promise<Scene> {
  try {
    const sceneJsonRaw = await components.fs.readFile(getSceneFilePath(projectRoot), 'utf8')
    const sceneJson = JSON.parse(sceneJsonRaw) as Scene
    assertValidScene(sceneJson)
    return sceneJson
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

/**
 * Returns a promise of an array of objects containing the path and the content for all the files in the project.
 * All the paths added to the `.dclignore` file will be excluded from the results.
 * Windows directory separators are replaced for POSIX separators.
 * @param ignoreFile The contents of the .dclignore file
 */
export async function getFiles(components: Pick<CliComponents, 'fs' | 'logger'>, dir: string): Promise<IFile[]> {
  const files = await getPublishableFiles(components, dir)
  const data: IFile[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const filePath = resolve(dir, file)
    const stat = await components.fs.stat(filePath)

    const content = await components.fs.readFile(filePath)

    data.push({
      path: file.replace(/\\/g, '/'),
      content: Buffer.from(content),
      size: stat.size
    })
  }

  return data
}

export function validateFilesSizes(files: IFile[]) {
  for (const { path, size } of files) {
    if (size > MAX_FILE_SIZE_BYTES) {
      throw new CliError(`Maximum file size exceeded: '${path}' is larger than ${MAX_FILE_SIZE_BYTES / 1e6}MB`)
    }
  }
}
