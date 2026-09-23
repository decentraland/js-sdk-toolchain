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
  let storePath = ''
  let renameGate: Promise<void> | undefined
  const fs = {
    fileExists: jest.fn(async (filePath: string) => {
      if (!storePath && filePath.endsWith('server-storage.json')) {
        storePath = filePath
        if (options.initialStore !== undefined) files.set(filePath, options.initialStore)
      }
      return files.has(filePath)
    }),
    readFile: jest.fn(async (filePath: string) => files.get(filePath) ?? ''),
    directoryExists: jest.fn(async () => true),
    mkdir: jest.fn(async () => undefined),
    writeFile: jest.fn(async (filePath: string, content: string) => {
      files.set(filePath, content)
    }),
    rename: jest.fn(async (from: string, to: string) => {
      if (renameGate) await renameGate
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
      expect(response.status).toBe(400)
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
      expect(response.status).toBe(400)
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
      expect(harness.fs.writeFile).not.toHaveBeenCalled()
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
      expect(harness.fs.writeFile).not.toHaveBeenCalled()
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

    it('should answer 204 regardless of the address casing', () => {
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

describe('when the store file holds buckets that are not objects', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes({ initialStore: JSON.stringify({ world: 5, players: { [ADDRESS]: 7 }, env: [] }) })
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
