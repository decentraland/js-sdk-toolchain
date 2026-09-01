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
    writeFile: jest.fn(async (filePath: string, content: string) => {
      files.set(filePath, content)
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

    const writtenPath: string = fs.writeFile.mock.calls[0][0]
    expect(writtenPath).toMatch(/server-storage\.json\..+/)
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
