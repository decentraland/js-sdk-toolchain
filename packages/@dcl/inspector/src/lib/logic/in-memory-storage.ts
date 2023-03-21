import { FileSystemInterface } from '../data-layer/types'

export function createInMemoryStorage(initialFs: Record<string, Buffer> = {}) {
  const storage: Map<string, Buffer> = new Map()

  for (const [id, content] of Object.entries(initialFs)) {
    storage.set(id, content)
  }

  return {
    writeFile(fileId: string, content: Buffer): void {
      storage.set(fileId, content)
    },
    exist(fileId: string): boolean {
      return storage.has(fileId)
    },
    readFile(fileId: string): Buffer {
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

export function createFsInMemory(initialFs: Record<string, Buffer> = {}): FileSystemInterface {
  const fs = createInMemoryStorage(initialFs)

  // FOR DEBUGGING PROPORSES (You can inspect it in the console)
  ;(globalThis as any).inMemoryStorage = fs

  return {
    async existFile(filePath: string): Promise<boolean> {
      return fs.exist(filePath)
    },
    async readFile(filePath: string): Promise<Buffer> {
      return fs.readFile(filePath)
    },
    async writeFile(filePath: string, content: Buffer): Promise<void> {
      return fs.writeFile(filePath, content)
    },
    async readdir(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
      // TODO:
      //  => This implementation doesn't match with Nodejs one, it aproaches to a more recursive one
      //  => To match it, filter deeper file path is neccesary, in the Internal Storage map, there is no directory
      //    so it's also necessary to generate them on the fly

      return Array.from(fs.storage.keys())
        .filter((item) => item.startsWith(dirPath))
        .map((name) => ({ name, isDirectory: false }))
    }
  }
}
