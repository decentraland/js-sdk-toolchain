import { FileSystemInterface } from '@dcl/inspector'
import { CliComponents } from '../../../components'

export function createFileSystemInterfaceFromFsComponent({ fs }: Pick<CliComponents, 'fs'>): FileSystemInterface {
  return {
    async existFile(filePath: string): Promise<boolean> {
      return fs.fileExists(filePath)
    },
    async readFile(filePath: string): Promise<Buffer> {
      return fs.readFile(filePath)
    },
    async writeFile(filePath: string, content: Buffer): Promise<void> {
      await fs.writeFile(filePath, content)
    },
    async readdir(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
      if (dirPath.indexOf('/../') !== -1) {
        throw new Error('The usage of /../ is not allowed')
      }

      const root = dirPath === '.' || dirPath === './' || dirPath === ''
      const path = root ? process.cwd() : dirPath

      const result = await fs.readdir(path)
      return Promise.all(
        result.map(async (name) => ({
          name: name,
          isDirectory: await fs.directoryExists(name)
        }))
      )
    }
  }
}
