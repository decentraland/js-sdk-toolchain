import { setupStorageEndpoints } from '../../../../packages/@dcl/sdk-commands/src/commands/start/server/storage-service'

type Handler = (ctx: any, next: () => Promise<any>) => Promise<any>

const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678'
const OTHER_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'

/**
 * Captures the handlers `setupStorageEndpoints` registers so each route can be
 * driven directly, middlewares included, without standing up an HTTP server.
 * The store is an in-memory file system; `initialStore` seeds server-storage.json.
 */
function captureRoutes(options: { initialStore?: string } = {}) {
  const routes = new Map<string, Handler[]>()
  const record =
    (method: string) =>
    (path: string, ...handlers: Handler[]) => {
      routes.set(`${method} ${path}`, handlers)
    }
  const router = { get: record('GET'), put: record('PUT'), delete: record('DELETE') }

  const files = new Map<string, string>()
  const mtimes = new Map<string, number>()
  let storePath = ''
  const learn = (filePath: string) => {
    if (storePath || !filePath.endsWith('server-storage.json')) return
    storePath = filePath
    if (options.initialStore !== undefined) files.set(filePath, options.initialStore)
  }
  let renameGate: Promise<void> | undefined
  const fs = {
    // Like the real component: any access failure answers false rather than throwing.
    fileExists: jest.fn(async (filePath: string) => {
      learn(filePath)
      return files.has(filePath)
    }),
    readFile: jest.fn(async (filePath: string) => {
      learn(filePath)
      if (!files.has(filePath)) throw Object.assign(new Error(`ENOENT: ${filePath}`), { code: 'ENOENT' })
      return files.get(filePath)!
    }),
    directoryExists: jest.fn(async () => true) as jest.Mock<Promise<boolean>, [string]>,
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
      if (renameGate) await renameGate
      if (!files.has(from)) throw Object.assign(new Error(`ENOENT: no such file, rename '${from}'`), { code: 'ENOENT' })
      files.set(to, files.get(from)!)
      files.delete(from)
    })
  }
  const logger = { error: jest.fn(), log: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }
  const components = { fs, logger } as any

  setupStorageEndpoints(components, router as any, { projects: [{ workingDirectory: '/project' }] } as any)

  /** Runs a route's middleware chain to completion. */
  async function call(route: string, ctx: any): Promise<any> {
    const handlers = routes.get(route)!
    let i = 0
    const next = async (): Promise<any> => {
      const handler = handlers[i++]
      return handler(ctx, next)
    }
    return next()
  }

  return {
    call,
    fs,
    logger,
    files,
    /** How many times the store was saved (a temporary file written, then renamed over it). */
    saves: () => fs.writeFile.mock.calls.filter(([filePath]: [string]) => filePath.endsWith('.tmp')).length,
    /** The store as last saved, parsed. */
    savedStore() {
      const entry = [...files.entries()].find(([filePath]) => filePath.endsWith('server-storage.json'))
      return entry ? JSON.parse(entry[1]) : undefined
    },
    /** Holds every save (the store's atomic rename) until the returned function is called. */
    holdSaves() {
      let release!: () => void
      renameGate = new Promise<void>((resolve) => (release = resolve))
      return () => {
        renameGate = undefined
        release()
      }
    }
  }
}

const body = (text: string) => ({ request: { text: async () => text } })
const json = (value: unknown) => body(JSON.stringify({ value }))
const listing = (route: string, query = '', params: Record<string, string> = {}) => ({
  params,
  url: new URL(`http://localhost${route}${query}`)
})

describe('when a storage PUT body omits the value field', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  describe('and it targets a scene key that already holds a value', () => {
    let response: any

    beforeEach(async () => {
      await harness.call('PUT /values/:key', { params: { key: 'plants' }, ...json([1, 2]) })
      response = await harness.call('PUT /values/:key', { params: { key: 'plants' }, ...body('{}') })
    })

    it('should reject it with a 400, as the deployed service does', () => {
      expect(response).toEqual({ status: 400, body: { message: 'Invalid JSON body' } })
    })

    it('should keep the stored value rather than erase it', async () => {
      const read = await harness.call('GET /values/:key', { params: { key: 'plants' } })

      expect(read).toEqual({ body: JSON.stringify({ value: [1, 2] }) })
    })
  })

  describe('and it targets a player key', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /players/:address/values/:key', {
        params: { address: ADDRESS, key: 'seeds' },
        ...body('{}')
      })
    })

    it('should reject it with a 400', () => {
      expect(response).toEqual({ status: 400, body: { message: 'Invalid JSON body' } })
    })
  })
})

describe('when a storage PUT body is not valid JSON at all', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  describe('and it targets a scene key', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /values/:key', { params: { key: 'plants' }, ...body('not json') })
    })

    it('should reject it with a 400 rather than a 500, as the deployed service does', () => {
      expect(response).toEqual({ status: 400, body: { message: 'Invalid JSON body' } })
    })
  })

  describe('and it targets a player key', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /players/:address/values/:key', {
        params: { address: ADDRESS, key: 'seeds' },
        ...body('{"value": ')
      })
    })

    it('should reject it with a 400', () => {
      expect(response).toEqual({ status: 400, body: { message: 'Invalid JSON body' } })
    })
  })
})

describe('when a storage PUT body carries a legitimate null', () => {
  let harness: ReturnType<typeof captureRoutes>
  let response: any

  beforeEach(async () => {
    harness = captureRoutes()
    response = await harness.call('PUT /values/:key', { params: { key: 'plants' }, ...json(null) })
  })

  it('should store it and echo it back', () => {
    expect(response).toEqual({ body: JSON.stringify({ value: null }) })
  })

  it('should read it back as a stored null, not as a missing key', async () => {
    const read = await harness.call('GET /values/:key', { params: { key: 'plants' } })

    expect(read).toEqual({ body: JSON.stringify({ value: null }) })
  })
})

describe('when a storage PUT succeeds', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  describe('and it targets a player key', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /players/:address/values/:key', {
        params: { address: ADDRESS, key: 'seeds' },
        ...json({ count: 3 })
      })
    })

    it('should echo the stored value, as the deployed service does', () => {
      expect(response).toEqual({ body: JSON.stringify({ value: { count: 3 } }) })
    })
  })
})

describe('when a value contains a NUL character', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  describe('and it targets a scene key', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /values/:key', { params: { key: 'plants' }, ...json('a\u0000b') })
    })

    it('should reject it with a 400, as the deployed service does', () => {
      expect(response).toEqual({
        status: 400,
        body: { message: 'Values must not contain the \\u0000 (NUL) character' }
      })
    })
  })

  describe('and it targets a player key', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /players/:address/values/:key', {
        params: { address: ADDRESS, key: 'seeds' },
        ...json({ nested: ['x\u0000'] })
      })
    })

    it('should reject it with a 400', () => {
      expect(response).toEqual({
        status: 400,
        body: { message: 'Values must not contain the \\u0000 (NUL) character' }
      })
    })
  })

  describe('and the value only spells out the escape as text', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /values/:key', { params: { key: 'plants' }, ...json('literal \\u0000 text') })
    })

    it('should accept it', () => {
      expect(response).toEqual({ body: JSON.stringify({ value: 'literal \\u0000 text' }) })
    })
  })
})

describe('when a storage key is outside the allowed length', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  describe('and it is longer than 255 characters', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /values/:key', { params: { key: 'k'.repeat(256) }, ...json(1) })
    })

    it('should reject it with a 400, as the deployed service does', () => {
      expect(response).toEqual({ status: 400, body: { message: 'Key must be between 1 and 255 characters' } })
    })
  })

  describe('and it is exactly 255 characters', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /values/:key', { params: { key: 'k'.repeat(255) }, ...json(1) })
    })

    it('should accept it', () => {
      expect(response).toEqual({ body: JSON.stringify({ value: 1 }) })
    })
  })

  describe('and it is empty', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('GET /values/:key', { params: { key: '' } })
    })

    it('should reject it with a 400', () => {
      expect(response).toEqual({ status: 400, body: { message: 'Key must be between 1 and 255 characters' } })
    })
  })
})

describe('when a player address is not a 20-byte hex address', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  describe('and it is a plain name', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /players/:address/values/:key', {
        params: { address: 'bob', key: 'seeds' },
        ...json(1)
      })
    })

    it('should reject it with a 400, as the deployed service does', () => {
      expect(response).toEqual({ status: 400, body: { message: 'Invalid player address' } })
    })
  })

  describe('and it has one hex digit too many', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('GET /players/:address/values/:key', {
        params: { address: `${ADDRESS}0`, key: 'seeds' }
      })
    })

    it('should reject it with a 400', () => {
      expect(response).toEqual({ status: 400, body: { message: 'Invalid player address' } })
    })
  })

  describe('and it is empty', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('GET /players/:address/values', listing('/players//values', '', { address: '' }))
    })

    it('should reject it with a 400', () => {
      expect(response).toEqual({ status: 400, body: { message: 'Invalid player address' } })
    })
  })

  describe('and it is named __proto__', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /players/:address/values/:key', {
        params: { address: '__proto__', key: 'hp' },
        ...json(1)
      })
    })

    it('should reject it with a 400, so nothing can reach Object.prototype', () => {
      expect(response).toEqual({ status: 400, body: { message: 'Invalid player address' } })
    })
  })
})

describe('when a player address is written in mixed case', () => {
  let harness: ReturnType<typeof captureRoutes>
  const mixedCase = '0x1234567890ABCDEF1234567890abcdef12345678'

  beforeEach(async () => {
    harness = captureRoutes()
    await harness.call('PUT /players/:address/values/:key', {
      params: { address: mixedCase, key: 'seeds' },
      ...json(3)
    })
  })

  it('should serve it back under the lowercase address, as the deployed service does', async () => {
    const read = await harness.call('GET /players/:address/values/:key', {
      params: { address: ADDRESS, key: 'seeds' }
    })

    expect(read).toEqual({ body: JSON.stringify({ value: 3 }) })
  })

  it('should list it under the lowercase address', async () => {
    const page = await harness.call(
      'GET /players/:address/values',
      listing(`/players/${ADDRESS}/values`, '', { address: ADDRESS })
    )

    expect(JSON.parse(page.body).data).toEqual([{ key: 'seeds', value: 3 }])
  })
})

describe('when a key is named like an Object.prototype property', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  describe('and the scene key was never written', () => {
    it('should answer 404 for a key named constructor', async () => {
      const read = await harness.call('GET /values/:key', { params: { key: 'constructor' } })

      expect(read.status).toBe(404)
    })

    it('should answer 404 for a key named __proto__', async () => {
      const read = await harness.call('GET /values/:key', { params: { key: '__proto__' } })

      expect(read.status).toBe(404)
    })
  })

  describe('and a value is stored under a scene key named __proto__', () => {
    beforeEach(async () => {
      await harness.call('PUT /values/:key', { params: { key: '__proto__' }, ...json({ hp: 1 }) })
    })

    it('should read it back under that key', async () => {
      const read = await harness.call('GET /values/:key', { params: { key: '__proto__' } })

      expect(read).toEqual({ body: JSON.stringify({ value: { hp: 1 } }) })
    })

    it('should not expose its fields under other keys', async () => {
      const read = await harness.call('GET /values/:key', { params: { key: 'hp' } })

      expect(read.status).toBe(404)
    })

    it('should list it as an ordinary entry', async () => {
      const page = await harness.call('GET /values', listing('/values'))

      expect(JSON.parse(page.body).data).toEqual([{ key: '__proto__', value: { hp: 1 } }])
    })
  })

  describe('and a player has other keys but not one named constructor', () => {
    let read: any

    beforeEach(async () => {
      await harness.call('PUT /players/:address/values/:key', {
        params: { address: ADDRESS, key: 'seeds' },
        ...json(1)
      })
      read = await harness.call('GET /players/:address/values/:key', {
        params: { address: ADDRESS, key: 'constructor' }
      })
    })

    it('should answer 404 for the player key named constructor', () => {
      expect(read.status).toBe(404)
    })
  })
})

describe('when a storage key is deleted', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  describe('and the scene key was never written', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('DELETE /values/:key', { params: { key: 'plants' } })
    })

    it('should answer 204, as the deployed service does', () => {
      expect(response).toEqual({ status: 204 })
    })

    it('should not rewrite the store for a no-op', () => {
      expect(harness.saves()).toBe(0)
    })
  })

  describe('and the scene key holds a value', () => {
    let response: any

    beforeEach(async () => {
      await harness.call('PUT /values/:key', { params: { key: 'plants' }, ...json(1) })
      response = await harness.call('DELETE /values/:key', { params: { key: 'plants' } })
    })

    it('should answer 204', () => {
      expect(response).toEqual({ status: 204 })
    })

    it('should leave the key absent', async () => {
      const read = await harness.call('GET /values/:key', { params: { key: 'plants' } })

      expect(read.status).toBe(404)
    })
  })

  describe('and the save has not finished yet', () => {
    let release: () => void
    let settled: boolean
    let deleting: Promise<any>

    beforeEach(async () => {
      await harness.call('PUT /values/:key', { params: { key: 'plants' }, ...json(1) })
      release = harness.holdSaves()
      settled = false
      deleting = harness.call('DELETE /values/:key', { params: { key: 'plants' } }).then((response) => {
        settled = true
        return response
      })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    afterEach(async () => {
      release()
      await deleting
    })

    it('should not answer before the store is persisted', () => {
      expect(settled).toBe(false)
    })
  })

  describe('and the scene key is named constructor', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('DELETE /values/:key', { params: { key: 'constructor' } })
    })

    it('should answer 204', () => {
      expect(response).toEqual({ status: 204 })
    })

    it('should treat it as a missing key and not rewrite the store', () => {
      expect(harness.saves()).toBe(0)
    })
  })

  describe('and the player key was never written', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('DELETE /players/:address/values/:key', {
        params: { address: ADDRESS, key: 'seeds' }
      })
    })

    it('should answer 204, as the deployed service does', () => {
      expect(response).toEqual({ status: 204 })
    })
  })

  describe('and the player key holds a value', () => {
    let response: any

    beforeEach(async () => {
      await harness.call('PUT /players/:address/values/:key', {
        params: { address: ADDRESS, key: 'seeds' },
        ...json(3)
      })
      response = await harness.call('DELETE /players/:address/values/:key', {
        params: { address: ADDRESS.toUpperCase().replace('0X', '0x'), key: 'seeds' }
      })
    })

    it('should accept a checksummed address', () => {
      expect(response).toEqual({ status: 204 })
    })

    it('should leave the key absent', async () => {
      const read = await harness.call('GET /players/:address/values/:key', {
        params: { address: ADDRESS, key: 'seeds' }
      })

      expect(read.status).toBe(404)
    })
  })
})

describe('when a storage listing is requested', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  describe('and a few scene keys were written out of order', () => {
    beforeEach(async () => {
      for (const [key, value] of [
        ['b', 1],
        ['a', 2],
        ['10', 3],
        ['9', 4],
        ['c', 5]
      ] as const) {
        await harness.call('PUT /values/:key', { params: { key }, ...json(value) })
      }
    })

    it('should list them in key order, as the deployed service does, not in insertion order', async () => {
      const page = JSON.parse((await harness.call('GET /values', listing('/values'))).body)

      expect(page.data.map((entry: { key: string }) => entry.key)).toEqual(['10', '9', 'a', 'b', 'c'])
    })

    it('should report the page limit, offset and total', async () => {
      const page = JSON.parse((await harness.call('GET /values', listing('/values'))).body)

      expect(page.pagination).toEqual({ limit: 100, offset: 0, total: 5 })
    })

    it('should return only the keys with the prefix, with the filtered total', async () => {
      const page = JSON.parse((await harness.call('GET /values', listing('/values', '?prefix=1'))).body)

      expect(page).toEqual({ data: [{ key: '10', value: 3 }], pagination: { limit: 100, offset: 0, total: 1 } })
    })

    it('should return the requested slice with the unfiltered total', async () => {
      const page = JSON.parse((await harness.call('GET /values', listing('/values', '?limit=2&offset=1'))).body)

      expect(page).toEqual({
        data: [
          { key: '9', value: 4 },
          { key: 'a', value: 2 }
        ],
        pagination: { limit: 2, offset: 1, total: 5 }
      })
    })

    it('should treat a limit of zero as the default page size, as the deployed service does', async () => {
      const page = JSON.parse((await harness.call('GET /values', listing('/values', '?limit=0'))).body)

      expect(page.data).toHaveLength(5)
    })

    it('should treat a non-numeric limit as the default page size', async () => {
      const page = JSON.parse((await harness.call('GET /values', listing('/values', '?limit=abc'))).body)

      expect(page.pagination.limit).toBe(100)
    })

    it('should clamp a negative offset to zero', async () => {
      const page = JSON.parse((await harness.call('GET /values', listing('/values', '?offset=-5'))).body)

      expect(page.pagination.offset).toBe(0)
    })

    it('should return an empty page past the end, keeping the total', async () => {
      const page = JSON.parse((await harness.call('GET /values', listing('/values', '?offset=50'))).body)

      expect(page).toEqual({ data: [], pagination: { limit: 100, offset: 50, total: 5 } })
    })
  })

  describe('and more than 100 scene keys exist', () => {
    beforeEach(async () => {
      for (let i = 0; i < 101; i++) {
        await harness.call('PUT /values/:key', { params: { key: `k${String(i).padStart(3, '0')}` }, ...json(i) })
      }
    })

    it('should serve at most 100 entries without a limit, as the deployed service does', async () => {
      const page = JSON.parse((await harness.call('GET /values', listing('/values'))).body)

      expect([page.data.length, page.pagination.total]).toEqual([100, 101])
    })

    it('should cap an oversized limit at 100', async () => {
      const page = JSON.parse((await harness.call('GET /values', listing('/values', '?limit=500'))).body)

      expect(page.pagination.limit).toBe(100)
    })
  })

  describe('and a player has keys, with another player having its own', () => {
    beforeEach(async () => {
      await harness.call('PUT /players/:address/values/:key', {
        params: { address: ADDRESS, key: 'seed:1' },
        ...json('a')
      })
      await harness.call('PUT /players/:address/values/:key', {
        params: { address: ADDRESS, key: 'coin' },
        ...json('b')
      })
      await harness.call('PUT /players/:address/values/:key', {
        params: { address: OTHER_ADDRESS, key: 'seed:2' },
        ...json('c')
      })
    })

    it("should return only that player's keys with the prefix", async () => {
      const page = JSON.parse(
        (
          await harness.call(
            'GET /players/:address/values',
            listing(`/players/${ADDRESS}/values`, '?prefix=seed:', { address: ADDRESS })
          )
        ).body
      )

      expect(page).toEqual({ data: [{ key: 'seed:1', value: 'a' }], pagination: { limit: 100, offset: 0, total: 1 } })
    })

    it('should list a player with no data as an empty page', async () => {
      const unknown = '0x0000000000000000000000000000000000000001'
      const page = JSON.parse(
        (
          await harness.call(
            'GET /players/:address/values',
            listing(`/players/${unknown}/values`, '', { address: unknown })
          )
        ).body
      )

      expect(page).toEqual({ data: [], pagination: { limit: 100, offset: 0, total: 0 } })
    })
  })
})

describe('when an environment variable is written', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(async () => {
    harness = captureRoutes()
    await harness.call('PUT /env/:key', { params: { key: 'API_URL' }, ...json('https://example.test') })
  })

  it('should read it back', async () => {
    const read = await harness.call('GET /env/:key', { params: { key: 'API_URL' } })

    expect(read).toEqual({ body: JSON.stringify({ value: 'https://example.test' }) })
  })

  describe('and a body without a value follows', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /env/:key', { params: { key: 'API_URL' }, ...body('{}') })
    })

    it('should reject it with a 400, as the deployed service does', () => {
      expect(response).toEqual({ status: 400, body: { message: 'Invalid JSON body' } })
    })

    it('should keep the variable rather than erase it', async () => {
      const read = await harness.call('GET /env/:key', { params: { key: 'API_URL' } })

      expect(read).toEqual({ body: JSON.stringify({ value: 'https://example.test' }) })
    })
  })

  describe('and an unparsable body follows', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /env/:key', { params: { key: 'API_URL' }, ...body('not json') })
    })

    it('should reject it with a 400 rather than a 500', () => {
      expect(response).toEqual({ status: 400, body: { message: 'Invalid JSON body' } })
    })
  })

  describe('and a non-string value follows', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /env/:key', { params: { key: 'API_URL' }, ...json(42) })
    })

    it('should reject it with a 400, since environment variables are strings', () => {
      expect(response).toEqual({ status: 400, body: { message: 'Invalid JSON body' } })
    })
  })

  describe('and it is deleted', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('DELETE /env/:key', { params: { key: 'API_URL' } })
    })

    it('should answer 204', () => {
      expect(response).toEqual({ status: 204 })
    })

    it('should answer 404 afterwards', async () => {
      const read = await harness.call('GET /env/:key', { params: { key: 'API_URL' } })

      expect(read.status).toBe(404)
    })
  })
})

describe('when persisting the store fails', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  describe('and a scene value is being written', () => {
    let response: any

    beforeEach(async () => {
      harness.fs.writeFile.mockRejectedValueOnce(new Error('disk full'))
      response = await harness.call('PUT /values/:key', { params: { key: 'plants' }, ...json(1) })
    })

    it('should answer 500', () => {
      expect(response).toEqual({ status: 500, body: { message: "Failed to set storage value 'plants'" } })
    })

    it('should log the failure', () => {
      expect(harness.logger.error).toHaveBeenCalledWith(expect.stringContaining('disk full'))
    })
  })

  describe('and a player value is being deleted', () => {
    let response: any

    beforeEach(async () => {
      await harness.call('PUT /players/:address/values/:key', {
        params: { address: ADDRESS, key: 'seeds' },
        ...json(1)
      })
      harness.fs.writeFile.mockRejectedValueOnce(new Error('disk full'))
      response = await harness.call('DELETE /players/:address/values/:key', {
        params: { address: ADDRESS, key: 'seeds' }
      })
    })

    it('should answer 500', () => {
      expect(response).toEqual({
        status: 500,
        body: { message: `Failed to delete player storage value 'seeds' for '${ADDRESS}'` }
      })
    })
  })
})

describe('when the store cannot be read', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(async () => {
    harness = captureRoutes()
    await harness.call('PUT /values/:key', { params: { key: 'keep' }, ...json(1) })
  })

  describe('and a scene value is requested', () => {
    let response: any

    beforeEach(async () => {
      harness.fs.readFile.mockRejectedValueOnce(new Error('EIO'))
      response = await harness.call('GET /values/:key', { params: { key: 'keep' } })
    })

    it('should answer 500 rather than report the key as missing', () => {
      expect(response).toEqual({ status: 500, body: { message: "Failed to get storage value 'keep'" } })
    })

    it('should log the failure', () => {
      expect(harness.logger.error).toHaveBeenCalledWith(expect.stringContaining('EIO'))
    })
  })

  describe('and the scene keys are listed', () => {
    let response: any

    beforeEach(async () => {
      harness.fs.readFile.mockRejectedValueOnce(new Error('EIO'))
      response = await harness.call('GET /values', listing('/values'))
    })

    it('should answer 500 rather than an empty page', () => {
      expect(response.status).toBe(500)
    })
  })

  describe('and the existing store is not readable by this process', () => {
    let read: any
    let write: any
    let before: string | undefined
    let savesBefore: number

    beforeEach(async () => {
      const storeFile = [...harness.files.keys()].find((p) => p.endsWith('server-storage.json'))!
      before = harness.files.get(storeFile)
      savesBefore = harness.saves()
      const denied = Object.assign(new Error(`EACCES: permission denied, open '${storeFile}'`), { code: 'EACCES' })
      harness.fs.fileExists.mockImplementation(
        async (filePath: string) => !filePath.endsWith('server-storage.json') && harness.files.has(filePath)
      )
      const readFile = harness.fs.readFile.getMockImplementation()!
      harness.fs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('server-storage.json')) throw denied
        return readFile(filePath)
      })
      read = await harness.call('GET /players/:address/values/:key', { params: { address: ADDRESS, key: 'seeds' } })
      write = await harness.call('PUT /values/:key', { params: { key: 'other' }, ...json(2) })
    })

    it('should answer 500 to a read rather than report the key as missing', () => {
      expect(read.status).toBe(500)
    })

    it('should answer 500 to a write', () => {
      expect(write.status).toBe(500)
    })

    it('should leave the store it could not read untouched', () => {
      const storeFile = [...harness.files.keys()].find((p) => p.endsWith('server-storage.json'))!
      expect([harness.saves() - savesBefore, harness.files.get(storeFile)]).toEqual([0, before])
    })
  })

  describe('and a write follows the failed read', () => {
    let response: any

    beforeEach(async () => {
      harness.fs.readFile.mockRejectedValueOnce(new Error('EIO'))
      response = await harness.call('PUT /values/:key', { params: { key: 'other' }, ...json(2) })
    })

    it('should answer 500', () => {
      expect(response.status).toBe(500)
    })

    it('should not overwrite the store it could not read', () => {
      expect(harness.saves()).toBe(1)
    })

    it('should still hold the earlier value once reads work again', async () => {
      const read = await harness.call('GET /values/:key', { params: { key: 'keep' } })

      expect(read).toEqual({ body: JSON.stringify({ value: 1 }) })
    })
  })
})

describe('when the store file is corrupt and cannot be moved aside', () => {
  let harness: ReturnType<typeof captureRoutes>
  let response: any

  beforeEach(async () => {
    harness = captureRoutes({ initialStore: '{not json' })
    harness.fs.rename.mockRejectedValueOnce(new Error('EPERM'))
    response = await harness.call('GET /values/:key', { params: { key: 'keep' } })
  })

  it('should answer 500 rather than treat the store as empty', () => {
    expect(response.status).toBe(500)
  })
})

describe('when the store file on disk is corrupt', () => {
  let harness: ReturnType<typeof captureRoutes>
  let read: any

  beforeEach(async () => {
    harness = captureRoutes({ initialStore: '{"world": {"keep": 1' })
    read = await harness.call('GET /values/:key', { params: { key: 'keep' } })
  })

  it('should answer 404 rather than fail the request', () => {
    expect(read.status).toBe(404)
  })

  it('should move the corrupt file aside with its content intact', () => {
    const aside = [...harness.files.entries()].find(([filePath]) => filePath.includes('server-storage.json.corrupt-'))

    expect(aside?.[1]).toBe('{"world": {"keep": 1')
  })

  it('should log where the file went', () => {
    expect(harness.logger.error).toHaveBeenCalledWith(expect.stringContaining('server-storage.json.corrupt-'))
  })

  it('should start a fresh store on the next write', async () => {
    const response = await harness.call('PUT /values/:key', { params: { key: 'other' }, ...json(2) })

    expect(response).toEqual({ body: JSON.stringify({ value: 2 }) })
  })
})

describe('when the store holds player buckets saved under mixed-case addresses', () => {
  const checksummed = '0x1234567890ABCDEF1234567890abcdef12345678'
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes({
      initialStore: JSON.stringify({
        players: { [checksummed]: { seeds: 1, coins: 2 }, [ADDRESS]: { coins: 5 } }
      })
    })
  })

  it('should read a value saved under the mixed-case address through the lowercase one', async () => {
    const read = await harness.call('GET /players/:address/values/:key', { params: { address: ADDRESS, key: 'seeds' } })

    expect(read).toEqual({ body: JSON.stringify({ value: 1 }) })
  })

  it('should prefer the lowercase bucket on a key both hold', async () => {
    const read = await harness.call('GET /players/:address/values/:key', { params: { address: ADDRESS, key: 'coins' } })

    expect(read).toEqual({ body: JSON.stringify({ value: 5 }) })
  })

  it('should list the merged bucket under the lowercase address', async () => {
    const page = JSON.parse(
      (
        await harness.call(
          'GET /players/:address/values',
          listing(`/players/${ADDRESS}/values`, '', { address: ADDRESS })
        )
      ).body
    )

    expect(page.data).toEqual([
      { key: 'coins', value: 5 },
      { key: 'seeds', value: 1 }
    ])
  })

  describe('and a write follows', () => {
    beforeEach(async () => {
      await harness.call('PUT /players/:address/values/:key', { params: { address: ADDRESS, key: 'hp' }, ...json(9) })
    })

    it('should persist a single lowercase bucket', () => {
      expect(Object.keys(harness.savedStore().players)).toEqual([ADDRESS])
    })

    it('should keep the migrated values alongside the new one', () => {
      expect(harness.savedStore().players[ADDRESS]).toEqual({ coins: 5, seeds: 1, hp: 9 })
    })
  })
})

describe('when a read of a corrupt store is overtaken by a write that recovers it', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(async () => {
    harness = captureRoutes({ initialStore: '{not json' })
    let releaseRead!: () => void
    const readHeld = new Promise<void>((resolve) => (releaseRead = resolve))
    harness.fs.readFile.mockImplementationOnce(async () => {
      await readHeld
      return '{not json'
    })

    const reading = harness.call('GET /values/:key', { params: { key: 'k' } }) // holds the corrupt content
    await new Promise((resolve) => setTimeout(resolve, 0))
    await harness.call('PUT /values/:key', { params: { key: 'k' }, ...json(7) }) // sets it aside and saves
    releaseRead()
    await reading
  })

  it('should keep the acknowledged write in the live store', () => {
    expect(harness.savedStore()?.world).toEqual({ k: 7 })
  })

  it('should set only the corrupt content aside', () => {
    const asides = [...harness.files.entries()].filter(([filePath]) => filePath.includes('.corrupt-'))

    expect(asides.map(([, content]) => content)).toEqual(['{not json'])
  })
})

describe('when two reads are the first to find a corrupt store', () => {
  let responses: any[]

  beforeEach(async () => {
    const harness = captureRoutes({ initialStore: '{not json' })
    responses = await Promise.all([
      harness.call('GET /values/:key', { params: { key: 'k' } }),
      harness.call('GET /values/:key', { params: { key: 'k' } })
    ])
  })

  it('should answer both with 404 rather than failing the second', () => {
    expect(responses.map((response) => response.status)).toEqual([404, 404])
  })
})

describe('when the store file holds JSON that is not an object', () => {
  let harness: ReturnType<typeof captureRoutes>
  let read: any

  beforeEach(async () => {
    harness = captureRoutes({ initialStore: 'null' })
    read = await harness.call('GET /values/:key', { params: { key: 'k' } })
  })

  it('should treat it as corrupt and answer 404', () => {
    expect(read.status).toBe(404)
  })

  it('should set it aside so later requests work', async () => {
    const response = await harness.call('PUT /values/:key', { params: { key: 'k' }, ...json(1) })

    expect([response.status ?? 200, harness.savedStore()?.world]).toEqual([200, { k: 1 }])
  })
})

describe('when the project .env file cannot be read', () => {
  let response: any

  beforeEach(async () => {
    const harness = captureRoutes()
    harness.files.set('/project/.env', 'API_URL=x')
    harness.fs.readFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('.env')) throw new Error('EIO')
      return harness.files.get(filePath) ?? ''
    })
    response = await harness.call('GET /env/:key', { params: { key: 'API_URL' } })
  })

  it('should answer 500 rather than report the variable as missing', () => {
    expect(response).toEqual({ status: 500, body: { message: "Failed to get environment variable 'API_URL'" } })
  })
})

describe('when the project has a .env file', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
    harness.files.set(
      '/project/.env',
      ['# comment', '', 'QUOTED="a b"', "SINGLE='c'", 'PLAIN = d ', 'SHARED=file'].join('\n')
    )
  })

  it('should strip surrounding double quotes', async () => {
    expect(await harness.call('GET /env/:key', { params: { key: 'QUOTED' } })).toEqual({
      body: JSON.stringify({ value: 'a b' })
    })
  })

  it('should strip surrounding single quotes', async () => {
    expect(await harness.call('GET /env/:key', { params: { key: 'SINGLE' } })).toEqual({
      body: JSON.stringify({ value: 'c' })
    })
  })

  it('should trim the key and the value', async () => {
    expect(await harness.call('GET /env/:key', { params: { key: 'PLAIN' } })).toEqual({
      body: JSON.stringify({ value: 'd' })
    })
  })

  it('should ignore comment lines', async () => {
    expect((await harness.call('GET /env/:key', { params: { key: '# comment' } })).status).toBe(404)
  })

  describe('and a runtime value is set for a key the file also defines', () => {
    beforeEach(async () => {
      await harness.call('PUT /env/:key', { params: { key: 'SHARED' }, ...json('runtime') })
    })

    it('should serve the runtime value', async () => {
      expect(await harness.call('GET /env/:key', { params: { key: 'SHARED' } })).toEqual({
        body: JSON.stringify({ value: 'runtime' })
      })
    })
  })
})

describe('when the store file holds buckets that are not objects', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes({ initialStore: JSON.stringify({ world: [1, 2], players: { [ADDRESS]: null }, env: [] }) })
  })

  it('should answer 404 for a key of a player whose bucket is not an object', async () => {
    const read = await harness.call('GET /players/:address/values/:key', { params: { address: ADDRESS, key: '0' } })

    expect(read.status).toBe(404)
  })

  it('should write a scene value into a fresh bucket rather than the array', async () => {
    await harness.call('PUT /values/:key', { params: { key: 'k' }, ...json(1) })

    expect(harness.savedStore()?.world).toEqual({ k: 1 })
  })

  it('should list the scene keys as empty', async () => {
    const page = JSON.parse((await harness.call('GET /values', listing('/values'))).body)

    expect(page.data).toEqual([])
  })

  it('should still accept a write', async () => {
    const response = await harness.call('PUT /players/:address/values/:key', {
      params: { address: ADDRESS, key: 'seeds' },
      ...json(1)
    })

    expect(response).toEqual({ body: JSON.stringify({ value: 1 }) })
  })
})

describe('when a PUT body carries more than the value field', () => {
  let response: any

  beforeEach(async () => {
    const harness = captureRoutes()
    response = await harness.call('PUT /values/:key', { params: { key: 'k' }, ...body('{"value":1,"extra":2}') })
  })

  it('should reject it with a 400, as the deployed service does', () => {
    expect(response).toEqual({ status: 400, body: { message: 'Invalid JSON body' } })
  })
})

describe('when a PUT body is the JSON literal null', () => {
  let response: any

  beforeEach(async () => {
    const harness = captureRoutes()
    response = await harness.call('PUT /values/:key', { params: { key: 'k' }, ...body('null') })
  })

  it('should reject it with a 400 rather than a 500', () => {
    expect(response).toEqual({ status: 400, body: { message: 'Invalid JSON body' } })
  })
})

describe('when a value carries a NUL character after an escaped backslash', () => {
  let response: any

  beforeEach(async () => {
    const harness = captureRoutes()
    response = await harness.call('PUT /values/:key', { params: { key: 'k' }, ...json('\\\u0000') })
  })

  it('should still reject it', () => {
    expect(response.status).toBe(400)
  })
})

describe('when a value carries an unpaired surrogate', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  it('should reject a lone high surrogate with a 400', async () => {
    const response = await harness.call('PUT /values/:key', { params: { key: 'k' }, ...json({ name: 'a\ud800' }) })

    expect(response).toEqual({ status: 400, body: { message: 'Values must not contain unpaired surrogates' } })
  })

  it('should accept a properly paired surrogate', async () => {
    const response = await harness.call('PUT /values/:key', { params: { key: 'k' }, ...json('\ud83d\ude00') })

    expect(response).toEqual({ body: JSON.stringify({ value: '\ud83d\ude00' }) })
  })
})

describe('when a key is made of astral characters', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  it('should accept 255 of them, counting characters rather than UTF-16 units', async () => {
    const response = await harness.call('PUT /values/:key', { params: { key: '\u{1F600}'.repeat(255) }, ...json(1) })

    expect(response).toEqual({ body: JSON.stringify({ value: 1 }) })
  })

  it('should reject 256 of them', async () => {
    const response = await harness.call('GET /values/:key', { params: { key: '\u{1F600}'.repeat(256) } })

    expect(response.status).toBe(400)
  })
})

describe('when a player key is longer than 255 characters', () => {
  let response: any

  beforeEach(async () => {
    const harness = captureRoutes()
    response = await harness.call('GET /players/:address/values/:key', {
      params: { address: ADDRESS, key: 'k'.repeat(256) }
    })
  })

  it('should reject it with a 400', () => {
    expect(response).toEqual({ status: 400, body: { message: 'Key must be between 1 and 255 characters' } })
  })
})

describe('when a value exceeds its namespace size limit', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  describe('and it is a scene value just over 512 KB', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /values/:key', { params: { key: 'k' }, ...json('a'.repeat(524288)) })
    })

    it('should reject it with a 400 naming the limit, as the deployed service does', () => {
      expect(response).toEqual({
        status: 400,
        body: { message: 'Value size (524290 bytes) exceeds the maximum allowed size (524288 bytes)' }
      })
    })

    it('should not store it', () => {
      expect(harness.saves()).toBe(0)
    })
  })

  describe('and the request body is larger than the limit plus the envelope slack', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /players/:address/values/:key', {
        params: { address: ADDRESS, key: 'k' },
        ...json('a'.repeat(102400 + 2048))
      })
    })

    it('should answer 413 before parsing it', () => {
      expect(response).toEqual({ status: 413, body: { message: 'Request body is too large' } })
    })
  })

  describe('and it is an environment value over 10 KB', () => {
    let response: any

    beforeEach(async () => {
      response = await harness.call('PUT /env/:key', { params: { key: 'K' }, ...json('a'.repeat(10241)) })
    })

    it('should reject it with a 400', () => {
      expect(response.status).toBe(400)
    })
  })
})

describe('when a player would exceed the 1 MB total', () => {
  let harness: ReturnType<typeof captureRoutes>
  let responses: any[]

  beforeEach(async () => {
    harness = captureRoutes()
    responses = []
    for (let i = 0; i < 11; i++) {
      responses.push(
        await harness.call('PUT /players/:address/values/:key', {
          params: { address: ADDRESS, key: `k${i}` },
          ...json('a'.repeat(100000))
        })
      )
    }
  })

  it('should accept the writes that fit', () => {
    expect(responses.slice(0, 10).every((response) => response.status === undefined)).toBe(true)
  })

  it('should reject the write that crosses the total with a 400', () => {
    expect(responses[10]).toEqual({
      status: 400,
      body: { message: 'Total storage size would exceed the maximum allowed (1048576 bytes)' }
    })
  })

  it('should still accept overwriting an existing key with a same-sized value', async () => {
    const response = await harness.call('PUT /players/:address/values/:key', {
      params: { address: ADDRESS, key: 'k0' },
      ...json('b'.repeat(100000))
    })

    expect(response.status).toBeUndefined()
  })
})

describe('when a listing is ordered and paged at the edges', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(async () => {
    harness = captureRoutes()
    for (const key of ['\uffff', '\u{1F600}', 'é', 'a', 'B', '_x']) {
      await harness.call('PUT /values/:key', { params: { key }, ...json(1) })
    }
  })

  it('should order by code point, placing astral characters after the BMP', async () => {
    const page = JSON.parse((await harness.call('GET /values', listing('/values'))).body)

    expect(page.data.map((entry: { key: string }) => entry.key)).toEqual(['B', '_x', 'a', 'é', '\uffff', '\u{1F600}'])
  })

  it('should cap an oversized offset at 100000', async () => {
    const page = JSON.parse(
      (await harness.call('GET /values', listing('/values', '?offset=99999999999999999999'))).body
    )

    expect(page.pagination.offset).toBe(100000)
  })
})

describe('when the store fails on a route not otherwise exercised', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(async () => {
    harness = captureRoutes()
    await harness.call('PUT /values/:key', { params: { key: 'k' }, ...json(1) })
    await harness.call('PUT /players/:address/values/:key', { params: { address: ADDRESS, key: 'k' }, ...json(1) })
    await harness.call('PUT /env/:key', { params: { key: 'K' }, ...json('v') })
  })

  it('should answer 500 from GET /env/:key', async () => {
    harness.fs.readFile.mockRejectedValueOnce(new Error('EIO'))

    expect(await harness.call('GET /env/:key', { params: { key: 'K' } })).toEqual({
      status: 500,
      body: { message: "Failed to get environment variable 'K'" }
    })
  })

  it('should answer 500 from PUT /env/:key', async () => {
    harness.fs.writeFile.mockRejectedValueOnce(new Error('disk full'))

    expect(await harness.call('PUT /env/:key', { params: { key: 'K' }, ...json('w') })).toEqual({
      status: 500,
      body: { message: "Failed to set environment variable 'K'" }
    })
  })

  it('should answer 500 from DELETE /env/:key', async () => {
    harness.fs.writeFile.mockRejectedValueOnce(new Error('disk full'))

    expect(await harness.call('DELETE /env/:key', { params: { key: 'K' } })).toEqual({
      status: 500,
      body: { message: "Failed to delete environment variable 'K'" }
    })
  })

  it('should answer 500 from DELETE /values/:key', async () => {
    harness.fs.writeFile.mockRejectedValueOnce(new Error('disk full'))

    expect(await harness.call('DELETE /values/:key', { params: { key: 'k' } })).toEqual({
      status: 500,
      body: { message: "Failed to delete storage value 'k'" }
    })
  })

  it('should answer 500 from the player listing', async () => {
    harness.fs.readFile.mockRejectedValueOnce(new Error('EIO'))

    expect(
      await harness.call(
        'GET /players/:address/values',
        listing(`/players/${ADDRESS}/values`, '', { address: ADDRESS })
      )
    ).toEqual({ status: 500, body: { message: `Failed to list player storage values for '${ADDRESS}'` } })
  })

  it('should answer 500 from a player PUT', async () => {
    harness.fs.writeFile.mockRejectedValueOnce(new Error('disk full'))

    expect(
      await harness.call('PUT /players/:address/values/:key', { params: { address: ADDRESS, key: 'k' }, ...json(2) })
    ).toEqual({ status: 500, body: { message: `Failed to set player storage value 'k' for '${ADDRESS}'` } })
  })
})

describe('when a delete targets a key that does not exist', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(async () => {
    harness = captureRoutes()
    await harness.call('PUT /players/:address/values/:key', { params: { address: ADDRESS, key: 'kept' }, ...json(1) })
    harness.fs.writeFile.mockClear()
  })

  it('should not rewrite the store for a missing environment variable', async () => {
    await harness.call('DELETE /env/:key', { params: { key: 'MISSING' } })

    expect(harness.saves()).toBe(0)
  })

  it('should not rewrite the store for a missing key of an existing player', async () => {
    await harness.call('DELETE /players/:address/values/:key', { params: { address: ADDRESS, key: 'missing' } })

    expect(harness.saves()).toBe(0)
  })
})

describe('when the runtime data directory does not exist yet', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(async () => {
    harness = captureRoutes()
    harness.fs.directoryExists.mockResolvedValue(false)
    await harness.call('PUT /values/:key', { params: { key: 'k' }, ...json(1) })
  })

  it('should create it before saving', () => {
    expect(harness.fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('.runtime-data'), { recursive: true })
  })
})

describe('when a corrupt store disappears before it can be set aside', () => {
  let response: any

  beforeEach(async () => {
    const harness = captureRoutes({ initialStore: '{not json' })
    harness.fs.rename.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
    response = await harness.call('GET /values/:key', { params: { key: 'k' } })
  })

  it('should treat the store as empty rather than fail', () => {
    expect(response.status).toBe(404)
  })
})

describe('when a key cannot be addressed or stored', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  it.each([['.'], ['..'], ['a\u0000b'], ['a\ud800']])(
    'should reject a PUT to %j with a 400 and store nothing',
    async (key) => {
      const response = await harness.call('PUT /values/:key', { params: { key }, ...json(1) })

      expect([response, harness.saves()]).toEqual([{ status: 400, body: { message: 'Invalid key' } }, 0])
    }
  )

  it.each([['..'], ['a\u0000']])('should reject a player GET for %j with a 400', async (key) => {
    const response = await harness.call('GET /players/:address/values/:key', { params: { address: ADDRESS, key } })

    expect(response).toEqual({ status: 400, body: { message: 'Invalid key' } })
  })

  it('should still accept a key that merely contains dots', async () => {
    const response = await harness.call('PUT /values/:key', { params: { key: 'a.b..c' }, ...json(1) })

    expect(response).toEqual({ body: JSON.stringify({ value: 1 }) })
  })
})
