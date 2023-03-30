import { FileSystemInterface } from '../types'

export async function getFilesInDirectory(
  fileSystem: FileSystemInterface,
  dirPath: string,
  files: string[],
  recursive: boolean = true,
  ignore: string[] = [] // This functionality can be extended, now only 'absolute' path can be ignored
) {
  const currentDirFiles = await fileSystem.readdir(dirPath)
  for (const currentPath of currentDirFiles) {
    if (ignore.includes(currentPath.name)) continue

    const slashIfRequire = (dirPath.length && !dirPath.endsWith('/') && '/') || ''
    const fullPath = dirPath + slashIfRequire + currentPath.name

    if (currentPath.isDirectory && recursive) {
      await getFilesInDirectory(fileSystem, fullPath, files, recursive)
    } else {
      files.push(fullPath)
    }
  }
  return files
}
