import {
  getSceneStorageKey,
  getWorldStorage,
  getWorldValue,
  setWorldValue,
  deleteWorldValue,
  loadServerStorage
} from '../../../../../packages/@dcl/sdk-commands/src/commands/start/server/runtime-env'

/**
 * In-memory stand-in for the single `.runtime-data/server-storage.json` file that
 * runtime-env reads and writes. Path is ignored — there is only one file.
 */
function makeComponents(initialFile?: string) {
  let fileContent = initialFile
  const fs = {
    fileExists: jest.fn(async () => fileContent !== undefined),
    readFile: jest.fn(async () => fileContent ?? ''),
    directoryExists: jest.fn(async () => true),
    mkdir: jest.fn(async () => undefined),
    writeFile: jest.fn(async (_path: string, content: string) => {
      fileContent = content
    })
  }
  const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), log: jest.fn(), warn: jest.fn() }
  return { components: { fs, logger } as any, logger, readFile: () => fileContent }
}

describe('runtime-env world storage namespacing', () => {
  describe('getSceneStorageKey', () => {
    it('normalizes spacing so equivalent parcels map to one bucket', () => {
      expect(getSceneStorageKey('60,-9')).toBe('60,-9')
      expect(getSceneStorageKey('60, -9')).toBe('60,-9')
      expect(getSceneStorageKey(' 10 , 20 ')).toBe('10,20')
    })
  })

  describe('world get/set/delete', () => {
    it('isolates values stored under different scene keys', async () => {
      const { components } = makeComponents()

      await setWorldValue(components, '60,-9', 'score', 100)
      await setWorldValue(components, '10,20', 'score', 999)

      expect(await getWorldValue(components, '60,-9', 'score')).toBe(100)
      expect(await getWorldValue(components, '10,20', 'score')).toBe(999)
    })

    it('returns undefined for a key in another scene bucket', async () => {
      const { components } = makeComponents()

      await setWorldValue(components, '60,-9', 'score', 100)

      expect(await getWorldValue(components, '10,20', 'score')).toBeUndefined()
    })

    it('getWorldStorage returns only the requested scene bucket, {} when absent', async () => {
      const { components } = makeComponents()

      await setWorldValue(components, '60,-9', 'a', 1)
      await setWorldValue(components, '60,-9', 'b', 2)

      expect(await getWorldStorage(components, '60,-9')).toEqual({ a: 1, b: 2 })
      expect(await getWorldStorage(components, '10,20')).toEqual({})
    })

    it('delete only affects the target scene bucket', async () => {
      const { components } = makeComponents()

      await setWorldValue(components, '60,-9', 'score', 100)
      await setWorldValue(components, '10,20', 'score', 999)

      expect(await deleteWorldValue(components, '60,-9', 'score')).toBe(true)
      expect(await getWorldValue(components, '60,-9', 'score')).toBeUndefined()
      // Other scene bucket untouched
      expect(await getWorldValue(components, '10,20', 'score')).toBe(999)
      // Deleting a missing key returns false
      expect(await deleteWorldValue(components, '60,-9', 'score')).toBe(false)
    })
  })

  describe('loadServerStorage legacy handling', () => {
    it('resets the legacy flat world shape (key -> primitive value)', async () => {
      const legacy = JSON.stringify({ env: {}, world: { highScore: 42 }, players: {} })
      const { components, logger } = makeComponents(legacy)

      const storage = await loadServerStorage(components)

      expect(storage.world).toEqual({})
      expect(logger.debug).toHaveBeenCalled()
    })

    it('preserves the namespaced world shape (coords -> key -> value)', async () => {
      const current = JSON.stringify({ env: {}, world: { '60,-9': { highScore: 42 } }, players: {} })
      const { components, logger } = makeComponents(current)

      const storage = await loadServerStorage(components)

      expect(storage.world).toEqual({ '60,-9': { highScore: 42 } })
      expect(logger.debug).not.toHaveBeenCalled()
    })
  })
})
