import { FileSystemInterface } from '@dcl/inspector'
import { IFileSystemComponent } from '../../../components/fs'

export function createFsFromFsComponent(fs: IFileSystemComponent): FileSystemInterface {
  return {
    async existFile(filePath: string): Promise<boolean> {
      try {
        await fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK)
        return true
      } catch (error) {
        return false
      }
    },
    async readFile(filePath: string): Promise<Buffer> {
      return fs.readFile(filePath)
    },
    async writeFile(filePath: string, content: Buffer): Promise<void> {
      await fs.writeFile(filePath, content)
    },
    async readdir(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
      const result = await fs.readdir(dirPath)
      return Promise.all(
        result.map(async (name) => ({
          name: name,
          isDirectory: await fs.directoryExists(name)
        }))
      )
    }
  }
}
