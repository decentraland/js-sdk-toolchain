import path from 'path'
import {
  getSceneStorageKey,
  getWorldStorage,
  getWorldValue,
  setWorldValue,
  deleteWorldValue,
  migrateLegacyWorldStorage
} from '../../../../../packages/@dcl/sdk-commands/src/commands/start/server/runtime-env'

const BASE_DIR = '/project'
const STORAGE_PATH = path.join(BASE_DIR, '.runtime-data', 'server-storage.json')

/**
 * Path-aware in-memory stand-in for the project's `.runtime-data/` directory. Tracks
 * writes by path so the tmp-file + rename atomic save cycle behaves as it does on disk.
 */
function makeComponents(initialFile?: string) {
  const files = new Map<string, string>()
  if (initialFile !== undefined) files.set(STORAGE_PATH, initialFile)
  const fs = {
    fileExists: jest.fn(async (filePath: string) => files.has(filePath)),
    readFile: jest.fn(async (filePath: string) => files.get(filePath) ?? ''),
    directoryExists: jest.fn(async () => true),
    mkdir: jest.fn(async () => undefined),
    writeFile: jest.fn(async (filePath: string, content: string) => {
      files.set(filePath, content)
    }),
    rename: jest.fn(async (from: string, to: string) => {
      files.set(to, files.get(from)!)
      files.delete(from)
    })
  }
  const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), log: jest.fn(), warn: jest.fn() }
  return { components: { fs, logger } as any, fs, logger, read: () => files.get(STORAGE_PATH) }
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

      await setWorldValue(components, BASE_DIR, '60,-9', 'score', 100)
      await setWorldValue(components, BASE_DIR, '10,20', 'score', 999)

      expect(await getWorldValue(components, BASE_DIR, '60,-9', 'score')).toBe(100)
      expect(await getWorldValue(components, BASE_DIR, '10,20', 'score')).toBe(999)
    })

    it('returns undefined for a key in another scene bucket', async () => {
      const { components } = makeComponents()

      await setWorldValue(components, BASE_DIR, '60,-9', 'score', 100)

      expect(await getWorldValue(components, BASE_DIR, '10,20', 'score')).toBeUndefined()
    })

    it('getWorldStorage returns only the requested scene bucket, {} when absent', async () => {
      const { components } = makeComponents()

      await setWorldValue(components, BASE_DIR, '60,-9', 'a', 1)
      await setWorldValue(components, BASE_DIR, '60,-9', 'b', 2)

      expect(await getWorldStorage(components, BASE_DIR, '60,-9')).toEqual({ a: 1, b: 2 })
      expect(await getWorldStorage(components, BASE_DIR, '10,20')).toEqual({})
    })

    it('delete only affects the target scene bucket', async () => {
      const { components } = makeComponents()

      await setWorldValue(components, BASE_DIR, '60,-9', 'score', 100)
      await setWorldValue(components, BASE_DIR, '10,20', 'score', 999)

      expect(await deleteWorldValue(components, BASE_DIR, '60,-9', 'score')).toBe(true)
      expect(await getWorldValue(components, BASE_DIR, '60,-9', 'score')).toBeUndefined()
      expect(await getWorldValue(components, BASE_DIR, '10,20', 'score')).toBe(999)
      expect(await deleteWorldValue(components, BASE_DIR, '60,-9', 'score')).toBe(false)
    })
  })

  describe('durable project-local location', () => {
    it('reads and writes under <baseDir>/.runtime-data/, not the sdk-commands package', async () => {
      const { components, fs, read } = makeComponents()

      await setWorldValue(components, BASE_DIR, '60,-9', 'score', 100)

      const tmpPath: string = fs.writeFile.mock.calls[0][0]
      expect(tmpPath.startsWith(path.join(BASE_DIR, '.runtime-data'))).toBe(true)
      expect(fs.rename).toHaveBeenCalledWith(tmpPath, STORAGE_PATH)
      expect(JSON.parse(read()!).world).toEqual({ '60,-9': { score: 100 } })
    })
  })

  describe('migrateLegacyWorldStorage', () => {
    it('moves a legacy flat world map into the current scene bucket, preserving env/players', async () => {
      const legacy = JSON.stringify({ env: { A: '1' }, world: { highScore: 42 }, players: { '0xabc': { c: 1 } } })
      const { components, logger, read } = makeComponents(legacy)

      await migrateLegacyWorldStorage(components, BASE_DIR, '60,-9')

      const stored = JSON.parse(read()!)
      expect(stored.world).toEqual({ '60,-9': { highScore: 42 } })
      expect(stored.env).toEqual({ A: '1' })
      expect(stored.players).toEqual({ '0xabc': { c: 1 } })
      expect(logger.debug).toHaveBeenCalled()
    })

    it('is a no-op for an already-namespaced world (no rewrite)', async () => {
      const current = JSON.stringify({ env: {}, world: { '60,-9': { highScore: 42 } }, players: {} })
      const { components, fs, logger } = makeComponents(current)

      await migrateLegacyWorldStorage(components, BASE_DIR, '10,20')

      expect(fs.writeFile).not.toHaveBeenCalled()
      expect(logger.debug).not.toHaveBeenCalled()
    })
  })
})
