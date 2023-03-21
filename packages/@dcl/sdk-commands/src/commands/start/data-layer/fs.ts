import { FileSystemInterface } from '@dcl/inspector'
import fs from 'fs-extra'
import path from 'path'

async function getFilesInDirectory(p: string, files: string[] = []) {
  const res = await fs.readdir(p, { withFileTypes: true })
  for (const child of res) {
    const currentPath = path.resolve(p, child.name)
    if (child.isDirectory()) {
      await getFilesInDirectory(currentPath, files)
    } else {
      files.push(currentPath)
    }
  }
  return files
}

// TODO: use IFileSystemComponent
export function createFsFromNode(): FileSystemInterface {
  return {
    async existFile(filePath: string): Promise<boolean> {
      return fs.existsSync(filePath)
    },
    async readFile<T = string | Uint8Array>(filePath: string, format: 'string' | 'uint8array'): Promise<T> {
      const bufferContent = await fs.readFile(filePath)

      if (format === 'string') {
        return bufferContent.toString() as T
      } else {
        return new Uint8Array(bufferContent) as T
      }
    },
    async writeFile(filePath: string, content: Uint8Array | string): Promise<void> {
      await fs.writeFile(filePath, content)
    },
    async getDirectoryFiles(dirPath: string): Promise<string[]> {
      return getFilesInDirectory(path.resolve(process.cwd(), dirPath))
    }
  }
}
