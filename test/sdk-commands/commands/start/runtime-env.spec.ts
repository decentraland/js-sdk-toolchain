import {
  loadServerStorage,
  saveServerStorage,
  setEnvValue,
  setWorldValue,
  setPlayerValue,
  getPlayerValue
} from '../../../../packages/@dcl/sdk-commands/src/commands/start/server/runtime-env'

/**
 * In-memory stand-in for the `.runtime-data/` directory that runtime-env reads and
 * writes. Async fns yield at each `await`, so concurrent read-modify-write cycles
 * interleave exactly as they would on Node's event loop. runtime-env derives the
 * storage path from its own package location, so it is learned from the first access.
 */
function makeComponents(initialFile?: string) {
  const files = new Map<string, string>()
  const mtimes = new Map<string, number>()
  let mainPath = ''
  const learn = (filePath: string) => {
    if (filePath.endsWith('.tmp')) return
    mainPath = filePath
    if (initialFile !== undefined && !files.has(filePath)) files.set(filePath, initialFile)
  }
  const fs = {
    fileExists: jest.fn(async (filePath: string) => {
      learn(filePath)
      return files.has(filePath)
    }),
    readFile: jest.fn(async (filePath: string) => files.get(filePath) ?? ''),
    directoryExists: jest.fn(async () => true),
    mkdir: jest.fn(async () => undefined),
    writeFile: jest.fn(async (filePath: string, content: string, options?: { flag?: string }) => {
      if (options?.flag === 'wx' && files.has(filePath)) {
        throw Object.assign(new Error(`EEXIST: file already exists, open '${filePath}'`), { code: 'EEXIST' })
      }
      files.set(filePath, content)
      mtimes.set(filePath, Date.now())
    }),
    stat: jest.fn(async (filePath: string) => {
      if (!files.has(filePath)) throw Object.assign(new Error(`ENOENT: ${filePath}`), { code: 'ENOENT' })
      return { mtimeMs: mtimes.get(filePath) ?? Date.now() }
    }),
    unlink: jest.fn(async (filePath: string) => {
      if (!files.delete(filePath)) throw Object.assign(new Error(`ENOENT: ${filePath}`), { code: 'ENOENT' })
    }),
    rename: jest.fn(async (from: string, to: string) => {
      files.set(to, files.get(from)!)
      files.delete(from)
      learn(to)
    })
  }
  const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), log: jest.fn(), warn: jest.fn() }
  return { components: { fs, logger } as any, fs, logger, readMain: () => files.get(mainPath) }
}

describe('runtime-env concurrent write safety', () => {
  it('does not lose player upserts issued concurrently', async () => {
    const { components } = makeComponents(JSON.stringify({ env: {}, world: {}, players: { '0xabc': {} } }))

    const keys = Array.from({ length: 20 }, (_, i) => `k${i}`)
    await Promise.all(keys.map((key, i) => setPlayerValue(components, '0xabc', key, i)))

    for (let i = 0; i < keys.length; i++) {
      expect(await getPlayerValue(components, '0xabc', keys[i])).toBe(i)
    }
  })

  it('does not lose concurrent writes across the env/world/player buckets', async () => {
    const { components, readMain } = makeComponents(JSON.stringify({ env: {}, world: {}, players: {} }))

    await Promise.all([
      setEnvValue(components, 'FOO', 'bar'),
      setWorldValue(components, 'score', 42),
      setPlayerValue(components, '0xabc', 'coins', 7)
    ])

    const stored = JSON.parse(readMain()!)
    expect(stored.env).toEqual({ FOO: 'bar' })
    expect(stored.world).toEqual({ score: 42 })
    expect(stored.players).toEqual({ '0xabc': { coins: 7 } })
  })
})

describe('runtime-env atomic writes', () => {
  it('writes a temp file and renames it over the target', async () => {
    const { components, fs, readMain } = makeComponents()

    await setEnvValue(components, 'FOO', 'bar')

    const writtenPath: string = fs.writeFile.mock.calls
      .map((call: unknown[]) => call[0] as string)
      .find((p: string) => p.endsWith('.tmp'))!
    expect(writtenPath).toMatch(/server-storage\.json\..+\.tmp$/)
    expect(fs.rename).toHaveBeenCalledWith(writtenPath, expect.stringMatching(/server-storage\.json$/))
    expect(JSON.parse(readMain()!).env).toEqual({ FOO: 'bar' })
  })
})

describe('runtime-env default isolation', () => {
  it('does not leak state between default (no-file) loads', async () => {
    const { components } = makeComponents()

    const a = await loadServerStorage(components)
    a.env.LEAK = 'yes'
    a.players.someone = { x: 1 }

    const b = await loadServerStorage(components)
    expect(b.env).toEqual({})
    expect(b.players).toEqual({})
  })
})

describe('when two preview processes share one store', () => {
  let first: ReturnType<typeof makeComponents>
  let second: ReturnType<typeof makeComponents>

  beforeEach(() => {
    first = makeComponents(JSON.stringify({ env: {}, world: {}, players: {} }))
    second = makeComponents()
  })

  describe('and the other process holds the lock', () => {
    let writing: Promise<void>
    let settled: boolean

    beforeEach(async () => {
      await loadServerStorage(first.components) // learn the store path
      const lockPath = `${first.fs.fileExists.mock.calls[0][0]}.lock`
      await first.fs.writeFile(lockPath, '999999', { flag: 'wx' })
      settled = false
      writing = setWorldValue(first.components, 'k', 1).then(() => {
        settled = true
      })
      await new Promise((resolve) => setTimeout(resolve, 60))
    })

    afterEach(async () => {
      await first.fs.unlink(`${first.fs.fileExists.mock.calls[0][0]}.lock`).catch(() => undefined)
      await writing.catch(() => undefined)
    })

    it('should wait for it instead of writing', () => {
      expect(settled).toBe(false)
    })

    describe('and the lock is released', () => {
      beforeEach(async () => {
        const lockPath = `${first.fs.fileExists.mock.calls[0][0]}.lock`
        await first.fs.unlink(lockPath)
        await writing
      })

      it('should write once it gets the lock', () => {
        expect(JSON.parse(first.readMain()!).world).toEqual({ k: 1 })
      })

      it('should release the lock afterwards', () => {
        expect(first.fs.unlink).toHaveBeenLastCalledWith(expect.stringMatching(/server-storage\.json\.lock$/))
      })
    })
  })

  describe('and a stale lock was left behind by a process that died', () => {
    beforeEach(async () => {
      await loadServerStorage(first.components)
      const lockPath = `${first.fs.fileExists.mock.calls[0][0]}.lock`
      await first.fs.writeFile(lockPath, '999999', { flag: 'wx' })
      const now = Date.now()
      jest.spyOn(Date, 'now').mockReturnValue(now + 60_000)
      await setWorldValue(first.components, 'k', 2)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should take it over and write', () => {
      expect(JSON.parse(first.readMain()!).world).toEqual({ k: 2 })
    })
  })

  describe('and each process writes different keys concurrently', () => {
    let readMain: () => string | undefined

    beforeEach(async () => {
      // Two copies of the module are two processes: each has its own in-process lock chain, and
      // only the lock file on the shared store can keep them from clobbering each other.
      const shared = makeComponents(JSON.stringify({ env: {}, world: {}, players: {} }))
      readMain = shared.readMain
      let processA!: typeof import('../../../../packages/@dcl/sdk-commands/src/commands/start/server/runtime-env')
      let processB!: typeof import('../../../../packages/@dcl/sdk-commands/src/commands/start/server/runtime-env')
      await jest.isolateModulesAsync(async () => {
        processA = await import('../../../../packages/@dcl/sdk-commands/src/commands/start/server/runtime-env')
      })
      await jest.isolateModulesAsync(async () => {
        processB = await import('../../../../packages/@dcl/sdk-commands/src/commands/start/server/runtime-env')
      })
      await Promise.all(
        Array.from({ length: 10 }, (_, i) => (i % 2 ? processA : processB).setWorldValue(shared.components, `k${i}`, i))
      )
    })

    it('should keep every acknowledged write', () => {
      expect(Object.keys(JSON.parse(readMain()!).world).sort()).toEqual(
        Array.from({ length: 10 }, (_, i) => `k${i}`).sort()
      )
    })
  })

  describe('and both save at once', () => {
    beforeEach(async () => {
      await Promise.all([setWorldValue(first.components, 'a', 1), setWorldValue(second.components, 'b', 2)])
    })

    it('should give each save its own temporary file', () => {
      const tmp = (c: ReturnType<typeof makeComponents>) =>
        c.fs.writeFile.mock.calls.map((call: unknown[]) => call[0] as string).filter((p: string) => p.endsWith('.tmp'))
      expect(new Set([...tmp(first), ...tmp(second)]).size).toBe(2)
    })
  })
})
