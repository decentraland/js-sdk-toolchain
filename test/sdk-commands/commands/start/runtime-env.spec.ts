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
    readFile: jest.fn(async (filePath: string) => {
      if (!files.has(filePath)) throw Object.assign(new Error(`ENOENT: ${filePath}`), { code: 'ENOENT' })
      return files.get(filePath)!
    }),
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
  return { components: { fs, logger } as any, fs, logger, files, readMain: () => files.get(mainPath) }
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
  const RUNNING = `${process.pid}:other`
  const GONE = '2147483646:gone' // no such process
  let store: ReturnType<typeof makeComponents>
  let lockPath: string

  beforeEach(async () => {
    store = makeComponents(JSON.stringify({ env: {}, world: {}, players: {} }))
    await loadServerStorage(store.components) // learn the store path
    lockPath = `${store.fs.fileExists.mock.calls[0][0]}.lock`
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('and a running process holds the lock', () => {
    let writing: Promise<void>
    let settled: boolean

    beforeEach(async () => {
      await store.fs.writeFile(lockPath, RUNNING, { flag: 'wx' })
      settled = false
      writing = setWorldValue(store.components, 'k', 1).then(
        () => {
          settled = true
        },
        () => undefined // a waiter may give up once the timeout passes; it never writes alongside the owner
      )
      await new Promise((resolve) => setTimeout(resolve, 60))
    })

    afterEach(async () => {
      await store.fs.unlink(lockPath).catch(() => undefined)
      await writing.catch(() => undefined)
    })

    it('should wait for it instead of writing', () => {
      expect(settled).toBe(false)
    })

    describe('and it has held the lock far longer than a save takes', () => {
      beforeEach(async () => {
        const now = Date.now()
        jest.spyOn(Date, 'now').mockReturnValue(now + 60_000)
        await new Promise((resolve) => setTimeout(resolve, 60))
      })

      it('should keep waiting, since the owner is still running', () => {
        expect([settled, store.files.get(lockPath)]).toEqual([false, RUNNING])
      })
    })

    describe('and it releases the lock', () => {
      beforeEach(async () => {
        await store.fs.unlink(lockPath)
        await writing
      })

      it('should write once it gets the lock', () => {
        expect(JSON.parse(store.readMain()!).world).toEqual({ k: 1 })
      })

      it('should release its own lock afterwards', () => {
        expect(store.files.has(lockPath)).toBe(false)
      })
    })
  })

  describe('and the lock was left by a process that is no longer running', () => {
    beforeEach(async () => {
      await store.fs.writeFile(lockPath, GONE, { flag: 'wx' })
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 5_000) // older than the takeover minimum
      await setWorldValue(store.components, 'k', 2)
    })

    it('should take it over and write', () => {
      expect(JSON.parse(store.readMain()!).world).toEqual({ k: 2 })
    })

    it('should leave no lock or set-aside file behind', () => {
      expect([...store.files.keys()].filter((p) => p.includes('.lock'))).toEqual([])
    })
  })

  describe('and another process takes over the abandoned lock just before this one does', () => {
    let writing: Promise<void>
    let settled: boolean

    beforeEach(async () => {
      await store.fs.writeFile(lockPath, GONE, { flag: 'wx' })
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 5_000)
      const rename = store.fs.rename.getMockImplementation()!
      store.fs.rename.mockImplementationOnce(async (from: string, to: string) => {
        // Between this process reading the dead owner and moving the lock aside, the other one takes it.
        store.files.set(lockPath, RUNNING)
        return rename(from, to)
      })
      settled = false
      writing = setWorldValue(store.components, 'k', 3).then(() => {
        settled = true
      })
      await new Promise((resolve) => setTimeout(resolve, 60))
    })

    afterEach(async () => {
      await store.fs.unlink(lockPath).catch(() => undefined)
      await writing.catch(() => undefined)
    })

    it("should put the other process's lock back rather than keep it", () => {
      expect(store.files.get(lockPath)).toBe(RUNNING)
    })

    it('should wait for that process instead of writing alongside it', () => {
      expect(settled).toBe(false)
    })
  })

  describe("and a takeover displaces this process's lock while it is saving", () => {
    let outcome: unknown

    beforeEach(async () => {
      await setWorldValue(store.components, 'before', 1)
      const writeFile = store.fs.writeFile.getMockImplementation()!
      store.fs.writeFile.mockImplementation(async (filePath: string, content: string, options?: { flag?: string }) => {
        await writeFile(filePath, content, options)
        // Mid-save, a contender moves this lock aside and a third process takes the vacant path.
        if (filePath.endsWith('.tmp')) store.files.set(lockPath, RUNNING)
      })
      outcome = await setWorldValue(store.components, 'k', 4).catch((error: Error) => error.constructor.name)
    })

    it('should fail the write rather than commit without the lock', () => {
      expect(outcome).toBe('StoreLockLostError')
    })

    it('should leave the store as the lock holder last saved it', () => {
      expect(JSON.parse(store.readMain()!).world).toEqual({ before: 1 })
    })

    it('should not release the lock the other process now holds', () => {
      expect(store.files.get(lockPath)).toBe(RUNNING)
    })

    it('should leave no temporary file behind', () => {
      expect([...store.files.keys()].filter((p) => p.endsWith('.tmp'))).toEqual([])
    })
  })

  describe("and a dead owner's lock changed hands moments ago", () => {
    let settled: boolean
    let writing: Promise<void>

    beforeEach(async () => {
      await store.fs.writeFile(lockPath, GONE, { flag: 'wx' }) // fresh: younger than the takeover minimum
      settled = false
      writing = setWorldValue(store.components, 'k', 5).then(
        () => {
          settled = true
        },
        () => undefined
      )
      await new Promise((resolve) => setTimeout(resolve, 60))
    })

    afterEach(async () => {
      await store.fs.unlink(lockPath).catch(() => undefined)
      await writing
    })

    it('should not take it over yet', () => {
      expect([settled, store.files.get(lockPath)]).toEqual([false, GONE])
    })
  })

  describe('and each process writes different keys concurrently', () => {
    beforeEach(async () => {
      // Two copies of the module are two processes: each has its own in-process lock chain, and
      // only the lock file on the shared store can keep them from clobbering each other.
      let processA!: typeof import('../../../../packages/@dcl/sdk-commands/src/commands/start/server/runtime-env')
      let processB!: typeof import('../../../../packages/@dcl/sdk-commands/src/commands/start/server/runtime-env')
      await jest.isolateModulesAsync(async () => {
        processA = await import('../../../../packages/@dcl/sdk-commands/src/commands/start/server/runtime-env')
      })
      await jest.isolateModulesAsync(async () => {
        processB = await import('../../../../packages/@dcl/sdk-commands/src/commands/start/server/runtime-env')
      })
      await Promise.all(
        Array.from({ length: 10 }, (_, i) => (i % 2 ? processA : processB).setWorldValue(store.components, `k${i}`, i))
      )
    })

    it('should keep every acknowledged write', () => {
      expect(Object.keys(JSON.parse(store.readMain()!).world).sort()).toEqual(
        Array.from({ length: 10 }, (_, i) => `k${i}`).sort()
      )
    })
  })

  describe('and both save at once', () => {
    let other: ReturnType<typeof makeComponents>

    beforeEach(async () => {
      other = makeComponents()
      await Promise.all([setWorldValue(store.components, 'a', 1), setWorldValue(other.components, 'b', 2)])
    })

    it('should give each save its own temporary file', () => {
      const tmp = (c: ReturnType<typeof makeComponents>) =>
        c.fs.writeFile.mock.calls.map((call: unknown[]) => call[0] as string).filter((p: string) => p.endsWith('.tmp'))
      expect(new Set([...tmp(store), ...tmp(other)]).size).toBe(2)
    })
  })
})
