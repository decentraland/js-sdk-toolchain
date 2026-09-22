import { setupStorageEndpoints } from '../../../../packages/@dcl/sdk-commands/src/commands/start/server/storage-service'

type Handler = (ctx: any, next: () => Promise<any>) => Promise<any>

/**
 * Captures the handlers `setupStorageEndpoints` registers so each route can be
 * driven directly, middlewares included, without standing up an HTTP server.
 */
function captureRoutes() {
  const routes = new Map<string, Handler[]>()
  const record =
    (method: string) =>
    (path: string, ...handlers: Handler[]) => {
      routes.set(`${method} ${path}`, handlers)
    }
  const router = { get: record('GET'), put: record('PUT'), delete: record('DELETE') }

  const files = new Map<string, string>()
  let mainPath = ''
  const components = {
    fs: {
      fileExists: async (p: string) => files.has(p),
      readFile: async (p: string) => files.get(p) ?? '',
      directoryExists: async () => true,
      mkdir: async () => undefined,
      writeFile: async (p: string, content: string) => {
        files.set(p, content)
      },
      rename: async (from: string, to: string) => {
        files.set(to, files.get(from)!)
        files.delete(from)
        mainPath = to
      }
    },
    logger: { error: jest.fn(), log: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }
  } as any

  setupStorageEndpoints(components, router as any, { projects: [] } as any)

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

  return { call, components, storedFile: () => files.get(mainPath) ?? '' }
}

const body = (value: string) => ({ request: { text: async () => value } })

describe('when a storage PUT body omits the value field', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  describe('and it targets a scene key that already holds a value', () => {
    let response: any

    beforeEach(async () => {
      await harness.call('PUT /values/:key', { params: { key: 'plants' }, ...body(JSON.stringify({ value: [1, 2] })) })
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
        params: { address: '0xabc', key: 'seeds' },
        ...body('{}')
      })
    })

    it('should reject it with a 400', () => {
      expect(response).toEqual({ status: 400, body: { message: 'Invalid JSON body' } })
    })
  })
})

describe('when a player address is written in mixed case', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(async () => {
    harness = captureRoutes()
    await harness.call('PUT /players/:address/values/:key', {
      params: { address: '0xAbCdEf', key: 'seeds' },
      ...body(JSON.stringify({ value: 7 }))
    })
  })

  it('should read back through a differently cased address, as the deployed service does', async () => {
    const read = await harness.call('GET /players/:address/values/:key', {
      params: { address: '0xabcdef', key: 'seeds' }
    })

    expect(JSON.parse(read.body).value).toBe(7)
  })
})

describe('when a storage PUT body carries a legitimate null', () => {
  let harness: ReturnType<typeof captureRoutes>

  beforeEach(() => {
    harness = captureRoutes()
  })

  it('should store it rather than treat it as a missing value', async () => {
    await harness.call('PUT /values/:key', { params: { key: 'k' }, ...body(JSON.stringify({ value: null })) })

    const read = await harness.call('GET /values/:key', { params: { key: 'k' } })

    expect(JSON.parse(read.body)).toEqual({ value: null })
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
        params: { address: '0xabc', key: 'seeds' },
        ...body('{"value": ')
      })
    })

    it('should reject it with a 400', () => {
      expect(response).toEqual({ status: 400, body: { message: 'Invalid JSON body' } })
    })
  })
})

describe('when a key or address is named like an Object.prototype property', () => {
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
      await harness.call('PUT /values/:key', {
        params: { key: '__proto__' },
        ...body(JSON.stringify({ value: { hp: 1 } }))
      })
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
      const list = await harness.call('GET /values', { url: new URL('http://localhost/values') })

      expect(JSON.parse(list.body).data).toEqual([{ key: '__proto__', value: { hp: 1 } }])
    })
  })

  describe('and a player address is named __proto__', () => {
    beforeEach(async () => {
      await harness.call('PUT /players/:address/values/:key', {
        params: { address: '__proto__', key: 'hp' },
        ...body(JSON.stringify({ value: 1 }))
      })
    })

    it('should not pollute Object.prototype', () => {
      expect(({} as Record<string, unknown>).hp).toBeUndefined()
    })

    it('should read the value back for that address', async () => {
      const read = await harness.call('GET /players/:address/values/:key', {
        params: { address: '__proto__', key: 'hp' }
      })

      expect(read).toEqual({ body: JSON.stringify({ value: 1 }) })
    })

    it('should list it under that address', async () => {
      const list = await harness.call('GET /players/:address/values', {
        params: { address: '__proto__' },
        url: new URL('http://localhost/players/__proto__/values')
      })

      expect(JSON.parse(list.body).data).toEqual([{ key: 'hp', value: 1 }])
    })
  })
})
