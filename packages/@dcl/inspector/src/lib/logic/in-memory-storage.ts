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

function normalizePath(path: string) {
  return path.replace(/^\/+/g, '')
}

export function createFsInMemory(initialFs: Record<string, Buffer> = {}): FileSystemInterface {
  const fs = createInMemoryStorage(initialFs)

  // FOR DEBUGGING PROPORSES (You can inspect it in the console)
  ;(globalThis as any).inMemoryStorage = fs

  return {
    dirname(path: string): string {
      return normalizePath(path).substring(0, path.lastIndexOf('/'))
    },
    basename(path: string): string {
      return normalizePath(path).split('/').pop() || ''
    },
    join(...paths: string[]): string {
      return paths.map(($) => normalizePath($)).join('/')
    },
    async existFile(filePath: string): Promise<boolean> {
      return fs.exist(normalizePath(filePath))
    },
    async readFile(filePath: string): Promise<Buffer> {
      return fs.readFile(normalizePath(filePath))
    },
    async writeFile(filePath: string, content: Buffer): Promise<void> {
      return fs.writeFile(normalizePath(filePath), content)
    },
    async rm(filePath: string): Promise<void> {
      fs.delete(normalizePath(filePath))
    },
    async readdir(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
      const resolvedDirPath = normalizePath(dirPath).replace(/^\.\/|^\.+/g, '')

      const files: { name: string; isDirectory: boolean }[] = []
      for (const path of Array.from(fs.storage.keys())) {
        if (!path.startsWith(resolvedDirPath)) continue

        const fileName = path.substring(resolvedDirPath.length)
        const slashPosition = fileName.indexOf('/')
        if (slashPosition !== -1) {
          const directoryName = fileName.substring(0, slashPosition)
          if (!files.find((item) => item.name === directoryName)) {
            files.push({ name: directoryName, isDirectory: true })
          }
        } else {
          files.push({ name: fileName, isDirectory: false })
        }
      }
      return files
    },
    cwd(): string {
      return 'scene'
    }
  }
}
