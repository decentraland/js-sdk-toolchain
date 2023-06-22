import { FileSystemInterface } from '@dcl/inspector'
import path from 'path'
import { CliComponents } from '../../../components'

/**
 * Normalizes a path based on the platform.
 * We managed posix paths, so for windows we need to normalize it
 */
function normalizePath(value: string): string {
  return path.normalize(value)
}

/**
 * Convert paths to posix stlye
 * .i.e: scene\\assets\\main.composite -> scene/assets/main.composite
 */
function pathToPosix(value: string): string {
  return normalizePath(value).replace(/\\/g, '/')
}

export function createFileSystemInterfaceFromFsComponent({ fs }: Pick<CliComponents, 'fs'>): FileSystemInterface {
  return {
    dirname(value: string): string {
      return pathToPosix(path.dirname(value))
    },
    basename(value: string): string {
      return pathToPosix(path.basename(normalizePath(value)))
    },
    join(...paths: string[]): string {
      return path.join(...paths)
    },
    async existFile(filePath: string): Promise<boolean> {
      return fs.fileExists(normalizePath(filePath))
    },
    async readFile(filePath: string): Promise<Buffer> {
      return fs.readFile(normalizePath(filePath))
    },
    async writeFile(filePath: string, content: Buffer): Promise<void> {
      const folder = normalizePath(path.dirname(filePath))
      if (!(await fs.directoryExists(folder))) {
        await fs.mkdir(folder, { recursive: true })
      }
      await fs.writeFile(normalizePath(filePath), content)
    },
    async rm(filePath: string) {
      await fs.rm(normalizePath(filePath))
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
