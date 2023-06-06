import { FileSystemInterface } from '../types'

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
  ASSETS: 'assets'
}

export function createAssetsFs(fs: FileSystemInterface): FileSystemInterface {
  const ASSETS_PATH = DIRECTORY.ASSETS

  function withAssetDir(filePath: string = '') {
    return `${ASSETS_PATH}/${filePath}`
  }

  return {
    existFile: (filePath: string) => fs.existFile(withAssetDir(filePath)),
    readFile: (filePath: string) => fs.readFile(withAssetDir(filePath)),
    writeFile: (filePath: string, content: Buffer) => fs.writeFile(withAssetDir(filePath), content),
    readdir: (filePath: string) => fs.readdir(withAssetDir(filePath)),
    rm: (filePath: string) => fs.rm(withAssetDir(filePath)),
    cwd: async () => `${await fs.cwd()}/${ASSETS_PATH}`
  }
}
