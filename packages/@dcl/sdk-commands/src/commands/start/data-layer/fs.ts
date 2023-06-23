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

export function createFileSystemInterfaceFromFsComponent({ fs }: Pick<CliComponents, 'fs'>): FileSystemInterface {
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
      return fs.fileExists(filePath)
    },
    async readFile(filePath: string): Promise<Buffer> {
      return fs.readFile(filePath)
    },
    async writeFile(filePath: string, content: Buffer): Promise<void> {
      const folder = path.dirname(filePath)
      if (!(await fs.directoryExists(folder))) {
        await fs.mkdir(folder, { recursive: true })
      }
      await fs.writeFile(filePath, content)
    },
    async rm(filePath: string) {
      await fs.rm(filePath)
    },
    async readdir(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
      if (dirPath.indexOf('/../') !== -1) {
        throw new Error('The usage of /../ is not allowed')
      }

      const root = dirPath === '.' || dirPath === './' || dirPath === ''
      const resolvedPath = root ? process.cwd() : dirPath

      const result = await fs.readdir(resolvedPath)
      return Promise.all(
        result.map(async (name) => ({
          name: pathToPosix(name),
          isDirectory: await fs.directoryExists(path.resolve(dirPath, name))
        }))
      )
    },
    cwd(): string {
      return pathToPosix(path.basename(process.cwd()))
    }
  }
}
