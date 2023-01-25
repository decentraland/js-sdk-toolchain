import { resolve } from 'path'
import { Scene } from '@dcl/schemas'

import { readFile } from '../../utils/fs'
import { CliError } from '../../utils/error'
import { getObject, inBounds, getBounds, areConnected } from './coordinates'
import { IFileSystemComponent } from '../../components/fs'

export const SCENE_FILE = 'scene.json'

/**
 * Returns true if the given URL is a valid websocket URL.
 * @param url The given URL.
 */
function isWebSocket(url: string): boolean {
  return /wss?\:\/\//gi.test(url)
}

/**
 * Returns `true` if the provided path contains a valid main file format.
 * @param path The path to the main file.
 */
function isValidMainFormat(path: string | null): boolean {
  const supportedExtensions = new Set(['js', 'html', 'xml'])
  const mainExt = path ? path.split('.').pop() : null
  return path === null || !!(mainExt && supportedExtensions.has(mainExt))
}

/**
 * Composes the path to the `scene.json` file based on the provided path.
 * @param dir The path to the directory containing the scene file.
 */
export function getSceneFilePath(dir: string): string {
  return resolve(dir, SCENE_FILE)
}

/**
 * Returns an object containing the contents of the `scene.json` file.
 */
export async function getSceneFile(dir: string): Promise<Scene> {
  try {
    const sceneFile = JSON.parse(await readFile(getSceneFilePath(dir)))
    return sceneFile as any as Scene
  } catch (e) {
    throw new CliError(`Unable to read 'scene.json' file. Try initializing the project using 'dcl init'.
        \t > Folder: ${dir}
        `)
  }
}

/**
 * Fails the execution if one of the parcel data is invalid
 * @param sceneFile The JSON parsed file of scene.json
 */
export function validateSceneData(sceneFile: Scene): void {
  const { base, parcels } = sceneFile.scene
  const parcelSet = new Set(parcels)

  if (!base) {
    throw new CliError('Missing scene base attribute at scene.json')
  }

  if (!parcels) {
    throw new CliError('Missing scene parcels attribute at scene.json')
  }

  if (parcelSet.size < parcels.length) {
    throw new CliError(`There are duplicated parcels at scene.json.`)
  }

  if (!parcelSet.has(base)) {
    throw new CliError(`Your base parcel ${base} should be included on parcels attribute at scene.json`)
  }

  const objParcels = parcels.map(getObject)
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
}

/**
 * Fails the execution if one of the parcel data is invalid
 */
export async function validateSceneOptions(dir: string): Promise<void> {
  const sceneFile = await getSceneFile(dir)
  return validateSceneData(sceneFile)
}

/**
 * Validates all the conditions required to operate over an existing project.
 * Throws if a project contains an invalid main path or if the `scene.json` file is missing.
 */
export async function validateExistingProject(components: { fs: IFileSystemComponent }, dir: string) {
  const sceneFile = await getSceneFile(dir)

  if (!isWebSocket(sceneFile.main)) {
    if (!isValidMainFormat(sceneFile.main)) {
      throw new CliError(`Main scene format file (${sceneFile.main}) is not a supported format`)
    }

    if (sceneFile.main !== null && !(await components.fs.existPath(resolve(dir, sceneFile.main)))) {
      throw new CliError(`Main scene file ${sceneFile.main} is missing in folder ${dir}`)
    }
  }
}
