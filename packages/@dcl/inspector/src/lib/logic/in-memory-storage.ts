import { FileSystemInterface, SupportedFormat } from '../data-layer/types'

export function createInMemoryStorage<T = string>(initialFs: Record<string, T> = {}) {
  const storage: Map<string, T> = new Map()

  for (const [id, content] of Object.entries(initialFs)) {
    storage.set(id, content)
  }

  return {
    writeFile(fileId: string, content: T): void {
      storage.set(fileId, content)
    },
    exist(fileId: string): boolean {
      return storage.has(fileId)
    },
    readFile(fileId: string): T {
      const content = storage.get(fileId)
      if (!content) {
        throw new Error(`File ${fileId} doesn't exists`)
      }
      return content
    },
    delete(fileId: string): boolean {
      return storage.delete(fileId)
    },
    storage
  }
}

export function createFsInMemory(initialFs: Record<string, string> = {}): FileSystemInterface {
  const fs = createInMemoryStorage(initialFs)

  return {
    async existFile(filePath: string): Promise<boolean> {
      return fs.exist(filePath)
    },
    async readFile<T = string | Uint8Array>(filePath: string, format: 'string' | 'uint8array'): Promise<T> {
      const stringContent = fs.readFile(filePath)

      if (format === 'string') {
        return stringContent as T
      } else {
        return new TextEncoder().encode(stringContent) as T
      }
    },
    async writeFile(filePath: string, content: Uint8Array | string): Promise<void> {
      if (content instanceof Uint8Array) {
        fs.writeFile(filePath, new TextDecoder().decode(content))
      } else {
        fs.writeFile(filePath, content)
      }
    },
    async getDirectoryFiles(dirPath: string): Promise<string[]> {
      return Array.from(fs.storage.keys()).filter((item) => item.startsWith(dirPath))
    }
  }
}
