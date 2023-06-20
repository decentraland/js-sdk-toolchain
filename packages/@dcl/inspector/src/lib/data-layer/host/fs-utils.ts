import { FileSystemInterface } from '../types'
import { SceneProvider } from './scene'

export async function getFilesInDirectory(
  fs: FileSystemInterface,
  dirPath: string,
  files: string[],
  recursive: boolean = true,
  ignore: string[] = [] // This functionality can be extended, now only 'absolute' path can be ignored
) {
  const currentDirFiles = await fs.readdir(dirPath)
  for (const currentPath of currentDirFiles) {
    if (ignore.includes(currentPath.name)) continue

    const slashIfRequire = (dirPath.length && !dirPath.endsWith('/') && '/') || ''
    const fullPath = dirPath + slashIfRequire + currentPath.name

    if (currentPath.isDirectory && recursive) {
      await getFilesInDirectory(fs, fullPath, files, recursive)
    } else {
      files.push(fullPath)
    }
  }
  return files
}

export const DIRECTORY = {
  ASSETS: 'assets',
  SCENE: 'scene'
}

export const EXTENSIONS = ['.glb', '.png', '.composite', '.composite.bin', '.gltf', '.jpg']

export function withAssetDir(filePath: string = '') {
  return filePath ? `${DIRECTORY.ASSETS}/${filePath}` : DIRECTORY.ASSETS
}

export function getFileName(fileName: string, ext: string) {
  if (EXTENSIONS.some(($) => fileName.endsWith($))) return fileName
  return `${fileName}.${ext}`
}

export function getCurrentCompositePath() {
  return withAssetDir(`${DIRECTORY.SCENE}/main.composite`)
}
