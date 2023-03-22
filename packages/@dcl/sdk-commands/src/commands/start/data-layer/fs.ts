import { FileSystemInterface } from '@dcl/inspector'
import fs from 'fs-extra'

export function createFsFromNode(): FileSystemInterface {
  return {
    async existFile(filePath: string): Promise<boolean> {
      return fs.existsSync(filePath)
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
