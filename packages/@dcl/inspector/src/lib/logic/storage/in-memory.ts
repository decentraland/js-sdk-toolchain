import { Storage } from './types'

export function createInMemoryStorage(initialFs: Record<string, Buffer> = {}): Storage {
  const storage: Map<string, Buffer> = new Map()

  for (const [id, content] of Object.entries(initialFs)) {
    storage.set(id, content)
  }

  return {
    async writeFile(path: string, content: Buffer) {
      storage.set(path, content)
    },
    async exists(path: string) {
      return storage.has(path)
    },
    async readFile(path: string) {
      const content = storage.get(path)
      if (!content) {
        throw new Error(`File ${path} doesn't exists`)
      }
      return content
    },
    async delete(path: string) {
      storage.delete(path)
    },
    async list(path: string) {
      const files: { name: string; isDirectory: boolean }[] = []
      for (const _path of Array.from(storage.keys())) {
        if (!_path.startsWith(path)) continue

        const fileName = _path.substring(path.length)
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
    }
  }
}
