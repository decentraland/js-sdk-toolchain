import { relative, resolve } from 'path'
import fs from 'fs-extra'
import ignore, { Ignore } from 'ignore'
import { Scene } from '@dcl/schemas'

import { fail, warn } from './log'
import { CliError } from './error'

export interface IFile {
  path: string
  content: Buffer
  size: number
}

export const MAX_FILE_SIZE_BYTES = 50 * 1e6 // 50mb

/**
 * Returns a promise of an array containing all the file paths for the given directory.
 * @param dir The given directory where to list the file paths.
 */
export const getAllFilePaths = async (
  dir: string,
  ignoredFiles: Ignore,
  relativeDir: string = dir
): Promise<string[]> => {
  try {
    const files = await fs.readdir(dir)
    let tmpFiles: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const filePath = resolve(dir, file)
      const relativePath = relative(relativeDir, filePath)
      const stat = await fs.stat(filePath)

      if (!ignoredFiles.test(relativePath).ignored) {
        if (stat.isDirectory()) {
          const folderFiles = await getAllFilePaths(filePath, ignoredFiles, relativePath)
          tmpFiles = tmpFiles.concat(folderFiles)
        } else {
          tmpFiles.push(filePath)
        }
      }
    }

    return tmpFiles
  } catch (e) {
    return []
  }
}

/**
 * Returns a promise of an array of objects containing the path and the content for all the files in the project.
 * All the paths added to the `.dclignore` file will be excluded from the results.
 * Windows directory separators are replaced for POSIX separators.
 * @param ignoreFile The contents of the .dclignore file
 */
export const getFiles = async ({
  dir,
  ignoreFiles = []
}: {
  dir: string
  ignoreFiles?: string[]
}): Promise<IFile[]> => {
  const files = await getAllFilePaths(dir, ignore().add(ignoreFiles.map(($) => $.trim())))
  const data: IFile[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const filePath = resolve(dir, file)
    const stat = await fs.stat(filePath)

    if (stat.size > MAX_FILE_SIZE_BYTES) {
      throw new CliError(`Maximum file size exceeded: '${file}' is larger than ${MAX_FILE_SIZE_BYTES / 1e6}MB`)
    }

    const content = await fs.readFile(filePath)

    data.push({
      path: file.replace(/\\/g, '/'),
      content: Buffer.from(content),
      size: stat.size
    })
  }
  return data
}

function checkMissingOrDefault<T extends Record<string, unknown>>(obj: T, defaults: T) {
  const missingKeys = Object.entries(defaults).reduce((acc: string[], [key, value]) => {
    return obj[key] && obj[key] !== value ? acc : acc.concat(key)
  }, [])
  return missingKeys
}

export function validateScene(sceneJson: Scene, log: boolean = false): boolean {
  const validScene = Scene.validate(sceneJson)
  if (!validScene) {
    const error = (Scene.validate.errors || []).map((a) => `${a.data} ${a.message}`).join('')

    log && fail(`Invalid scene.json: ${error}`)
    return false
  }

  const defaults: Scene['display'] = {
    title: 'DCL Scene',
    description: 'My new Decentraland project',
    navmapThumbnail: 'images/scene-thumbnail.png'
  }
  const sceneDisplay = sceneJson.display || {}

  const missingKeys = checkMissingOrDefault<NonNullable<Scene['display']>>(sceneDisplay, defaults)

  if (log) {
    if (missingKeys.length) {
      warn(`Don't forget to update your scene.json metadata: [${missingKeys.join(', ')}]
        'https://docs.decentraland.org/development-guide/scene-metadata/'
      `)
    }
  }

  return !missingKeys.length
}
