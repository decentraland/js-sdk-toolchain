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
      const result = await fs.readdir(dirPath, { withFileTypes: true })
      return result.map((item) => ({
        name: item.name,
        isDirectory: item.isDirectory()
      }))
    }
  }
}
