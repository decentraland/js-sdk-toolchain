import { FileSystemInterface } from '../data-layer/types'
import { Storage } from './storage/types'

function normalizePath(path: string) {
  const regex = /^\/+/g // matches a "/" character at the beggining of a string
  return path.replace(regex, '')
}

export function createFileSystemInterface(storage: Storage): FileSystemInterface {
  // FOR DEBUGGING PROPORSES (You can inspect it in the console)
  ;(globalThis as any).storage = storage

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
      return storage.exists(normalizePath(filePath))
    },
    async readFile(filePath: string): Promise<Buffer> {
      return storage.readFile(normalizePath(filePath))
    },
    async writeFile(filePath: string, content: Buffer): Promise<void> {
      return storage.writeFile(normalizePath(filePath), content)
    },
    async rm(filePath: string): Promise<void> {
      return storage.delete(normalizePath(filePath))
    },
    async readdir(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
      const resolvedDirPath = normalizePath(dirPath).replace(/^\.\/|^\.+/g, '')
      return storage.list(resolvedDirPath)
    },
    cwd(): string {
      return 'scene'
    }
  }
}
