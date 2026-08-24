import * as path from 'path'

import { setupEcs6Endpoints } from '../../../../packages/@dcl/sdk-commands/src/commands/start/server/endpoints'

// a real package dir where @dcl/sdk and @dcl/explorer resolve, so the static-file
// routes in setupEcs6Endpoints can register without touching the network
const sdkCommandsDir = path.resolve(__dirname, '../../../../packages/@dcl/sdk-commands')

async function makeEndpoints() {
  const fetch = jest.fn()
  const handlers = new Map<string, (ctx: any) => Promise<any>>()
  const capture = (method: string) => (route: string, handler: any) => handlers.set(`${method} ${route}`, handler)
  const router = { get: capture('GET'), post: capture('POST'), all: capture('ALL') }
  const components = {
    fetch: { fetch },
    config: { getString: jest.fn().mockResolvedValue(undefined) },
    fs: {},
    logger: { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  }
  const workspace = { rootWorkingDirectory: sdkCommandsDir, projects: [] }
  await setupEcs6Endpoints(components as any, router as any, workspace as any)
  return { fetch, handlers }
}

async function readBody(stream: AsyncIterable<Buffer | string>): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

describe('start/server/endpoints', () => {
  it('proxies POST /content/entities to the catalyst without mutating the immutable response headers', async () => {
    const { fetch, handlers } = await makeEndpoints()
    const handler = handlers.get('POST /content/entities')!
    expect(handler).toBeDefined()

    const catalystResponse = new Response('{"creationTimestamp":1}', {
      status: 200,
      headers: {
        'content-type': 'application/json',
        // undici already decompressed the body: these must not be forwarded
        'content-encoding': 'gzip',
        'content-length': '999'
      }
    })
    // real fetch() responses carry immutable Headers (guard "immutable"), unlike
    // constructed ones (guard "response") — mimic that so a mutation regresses loudly
    catalystResponse.headers.delete = () => {
      throw new TypeError('immutable')
    }
    fetch.mockResolvedValue(catalystResponse)

    const response = await handler({ request: { body: 'the-deployment' } })

    // stringMatching instead of the exact URL: catalystUrl.toString() carries a
    // trailing slash on main, so the proxied URL has a pre-existing double slash
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/peer\.decentraland\.org\/+content\/entities$/),
      expect.objectContaining({ method: 'post', body: 'the-deployment', duplex: 'half' })
    )
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('application/json')
    expect(response.headers['content-encoding']).toBeUndefined()
    expect(response.headers['content-length']).toBeUndefined()
    await expect(readBody(response.body)).resolves.toBe('{"creationTimestamp":1}')
  })
})
