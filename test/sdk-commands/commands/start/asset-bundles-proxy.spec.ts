import { setupAssetBundlesProxy } from '../../../../packages/@dcl/sdk-commands/src/commands/start/server/asset-bundles-proxy'

function makeProxy(getSidecarUrl: () => string | undefined) {
  const fetch = jest.fn()
  let handler: (ctx: any) => Promise<any>
  const router = { all: jest.fn((_path: string, h: any) => (handler = h)) }
  setupAssetBundlesProxy({ fetch: { fetch } } as any, router as any, getSidecarUrl)
  // requests reach the handler with the /optimized-assets prefix already
  // consumed by the route pattern: ctx.params.path carries the rest
  const dispatch = (method: string, path: string, search = '', body?: any, headers: Record<string, string> = {}) =>
    handler({
      url: new URL(`http://127.0.0.1:8000/optimized-assets/${path}${search}`),
      params: { path },
      request: { method, body, headers: new Headers({ host: '127.0.0.1:8000', ...headers }) }
    })
  return { fetch, router, dispatch }
}

async function readBody(stream: AsyncIterable<Buffer | string>): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

describe('start/server/asset-bundles-proxy', () => {
  it('mounts every method under /optimized-assets', () => {
    const { router } = makeProxy(() => undefined)
    expect(router.all).toHaveBeenCalledWith('/optimized-assets/:path+', expect.any(Function))
  })

  it('answers 503 until the sidecar is up', async () => {
    const { fetch, dispatch } = makeProxy(() => undefined)

    const response = await dispatch('GET', 'manifest/b64-abc_mac.json')

    expect(response.status).toBe(503)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('streams requests through to the sidecar, stripping the mount prefix and keeping the query string', async () => {
    const { fetch, dispatch } = makeProxy(() => 'http://127.0.0.1:53211')
    const sidecarResponse = new Response('bundle-bytes', {
      status: 200,
      headers: {
        'content-type': 'application/octet-stream',
        // undici already decompressed the body: these must not be forwarded
        'content-encoding': 'gzip',
        'content-length': '999'
      }
    })
    // real fetch() responses carry immutable Headers (guard "immutable"), unlike
    // constructed ones (guard "response") — mimic that so a mutation regresses loudly
    sidecarResponse.headers.delete = () => {
      throw new TypeError('immutable')
    }
    fetch.mockResolvedValue(sidecarResponse)

    const response = await dispatch('GET', 'v49/b64-abc/scene_bundle', '?x=1')

    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:53211/v49/b64-abc/scene_bundle?x=1',
      expect.objectContaining({ method: 'GET', body: undefined })
    )
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('application/octet-stream')
    expect(response.headers['content-encoding']).toBeUndefined()
    expect(response.headers['content-length']).toBeUndefined()
    await expect(readBody(response.body)).resolves.toBe('bundle-bytes')
  })

  it('forwards non-GET methods with their body and the sidecar status', async () => {
    const { fetch, dispatch } = makeProxy(() => 'http://127.0.0.1:53211')
    fetch.mockResolvedValue(new Response('nope', { status: 404 }))

    const requestBody = 'the-registry-post'
    const response = await dispatch('POST', 'entities/active', '', requestBody, {
      'content-type': 'application/json',
      'content-length': '17',
      connection: 'close'
    })

    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:53211/entities/active',
      expect.objectContaining({ method: 'POST', body: requestBody, duplex: 'half' })
    )
    // the client's headers ride along (the sidecar 415s JSON posts without their
    // content-type), while the per-connection ones are dropped so undici manages
    // its own leg — a forwarded connection:close would kill sidecar keep-alive
    const forwardedHeaders = fetch.mock.calls[0][1].headers
    expect(forwardedHeaders['content-type']).toBe('application/json')
    expect(forwardedHeaders['content-length']).toBeUndefined()
    expect(forwardedHeaders['host']).toBeUndefined()
    expect(forwardedHeaders['connection']).toBeUndefined()
    expect(response.status).toBe(404)
  })
})
