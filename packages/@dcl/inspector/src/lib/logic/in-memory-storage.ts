export function createInMemoryStorage() {
  const storage: Map<string, unknown> = new Map()

  return {
    async writeFile<T>(fileId: string, content: T): Promise<void> {
      storage.set(fileId, content)
    },
    async exist(fileId: string): Promise<boolean> {
      return storage.has(fileId)
    },
    async readFile<T>(fileId: string): Promise<T> {
      return storage.get(fileId) as T
    },
    async delete(fileId: string): Promise<boolean> {
      return storage.delete(fileId)
    }
  }
}
