import { FileSystemInterface } from '../types'

export async function getFilesInDirectory(
  fs: FileSystemInterface,
  dirPath: string,
  files: string[],
  recursive: boolean = true,
  ignore: string[] = [] // This functionality can be extended, now only 'absolute' path can be ignored
): Promise<string[]> {
  try {
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
  } catch (_) {
    return []
  }
}

export const DIRECTORY = {
  ASSETS: 'assets',
  SCENE: 'scene',
  THUMBNAILS: 'thumbnails'
}

export const EXTENSIONS = [
  '.glb',
  '.png',
  '.composite',
  '.composite.bin',
  '.gltf',
  '.jpg',
  '.mp3',
  '.ogg',
  '.wav',
  '.mp4'
]

export function withAssetDir(filePath: string = '') {
  return filePath ? `${DIRECTORY.ASSETS}/${filePath}` : DIRECTORY.ASSETS
}

export function isFileInAssetDir(filePath: string = '') {
  return filePath.startsWith(DIRECTORY.ASSETS)
}

export function getFileName(fileName: string, ext: string) {
  if (EXTENSIONS.some(($) => fileName.endsWith($))) return fileName
  return `${fileName}.${ext}`
}

export function getCurrentCompositePath() {
  return withAssetDir(`${DIRECTORY.SCENE}/main.composite`)
}

export function transformBinaryToBase64Resource(content: Uint8Array): string {
  return `data:image/png;base64,${Buffer.from(content).toString('base64')}`
}

export function transformBase64ResourceToBinary(base64Resource: string): Buffer {
  const header = 'data:image/png;base64,'
  return Buffer.from(base64Resource.slice(header.length), 'base64')
}
