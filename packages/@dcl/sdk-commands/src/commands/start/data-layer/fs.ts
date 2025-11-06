import { FileSystemInterface } from '@dcl/inspector'
import path from 'path'
import { CliComponents } from '../../../components'

/**
 * Convert paths to posix stlye
 * .i.e: scene\\assets\\main.composite -> scene/assets/main.composite
 */
export function pathToPosix(value: string): string {
  return value.replace(/\\/g, '/')
}

export function createFileSystemInterfaceFromFsComponent(
  { fs }: Pick<CliComponents, 'fs'>,
  projectWorkingDirectory: string = process.cwd()
): FileSystemInterface {
  return {
    dirname(value: string): string {
      return pathToPosix(path.dirname(value))
    },
    basename(value: string): string {
      return pathToPosix(path.basename(value))
    },
    join(...paths: string[]): string {
      return path.join(...paths)
    },
    async existFile(filePath: string): Promise<boolean> {
      const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(projectWorkingDirectory, filePath)
      return fs.fileExists(resolvedPath)
    },
    async readFile(filePath: string): Promise<Buffer> {
      const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(projectWorkingDirectory, filePath)
      return fs.readFile(resolvedPath)
    },
    async writeFile(filePath: string, content: Buffer): Promise<void> {
      const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(projectWorkingDirectory, filePath)
      const folder = path.dirname(resolvedPath)
      if (!(await fs.directoryExists(folder))) {
        await fs.mkdir(folder, { recursive: true })
      }
      await fs.writeFile(resolvedPath, content as Uint8Array)
    },
    async rm(filePath: string) {
      const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(projectWorkingDirectory, filePath)
      await fs.rm(resolvedPath)
    },
    async readdir(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
      if (dirPath.indexOf('/../') !== -1) {
        throw new Error('The usage of /../ is not allowed')
      }

      const root = dirPath === '.' || dirPath === './' || dirPath === ''
      const resolvedPath = root ? projectWorkingDirectory : dirPath

      const result = await fs.readdir(resolvedPath)
      return Promise.all(
        result.map(async (name) => ({
          name: pathToPosix(name),
          isDirectory: await fs.directoryExists(path.resolve(dirPath, name))
        }))
      )
    },
    cwd(): string {
      return pathToPosix(projectWorkingDirectory)
    },
    async stat(filePath: string): Promise<{ size: number }> {
      const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(projectWorkingDirectory, filePath)
      const stats = await fs.stat(resolvedPath)
      return { size: Number(stats.size) }
    }
  }
}
