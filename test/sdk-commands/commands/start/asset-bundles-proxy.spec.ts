import { setupAssetBundlesProxy } from '../../../../packages/@dcl/sdk-commands/src/commands/start/server/asset-bundles-proxy'

const ENTITY = 'b64-scene'

function streamOf(text: string) {
  const { Readable } = require('stream')
  return Readable.toWeb(Readable.from([Buffer.from(text)]))
}

async function readBody(stream: AsyncIterable<Buffer | string>): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

function makeRoutes(assetBundles: any) {
  const fetch = jest.fn()
  const handlers: Record<string, (ctx: any) => Promise<any>> = {}
  const router = { get: jest.fn((path: string, h: any) => (handlers[path] = h)) }
  setupAssetBundlesProxy({ fetch: { fetch } } as any, router as any, () => assetBundles)

  const manifest = (name: string, search = '') =>
    handlers['/optimized-assets/manifest/:name']({
      url: new URL(`http://127.0.0.1:8000/optimized-assets/manifest/${name}${search}`),
      params: { name }
    })

  const bundle = (version: string, cid: string, file: string, search = '') =>
    handlers['/optimized-assets/:version/:cid/:file']({
      url: new URL(`http://127.0.0.1:8000/optimized-assets/${version}/${cid}/${file}${search}`),
      params: { version, cid, file }
    })

  return { fetch, router, manifest, bundle }
}

function converted(overrides: Partial<any> = {}) {
  const scene = {
    entityId: ENTITY,
    platform: 'mac',
    manifest: '{"exitCode":0,"files":["a_mac"]}',
    bundles: new Map([['a_mac', Buffer.from('BUNDLE')]])
  }
  return {
    entityId: ENTITY,
    upstreamAbCdn: 'https://ab-cdn.decentraland.org',
    ready: Promise.resolve(scene),
    get: (p: string) => (p === 'mac' ? scene : undefined),
    ...overrides
  }
}

describe('start/server/asset-bundles-proxy', () => {
  it('mounts the ab-cdn surface under /optimized-assets', () => {
    const { router } = makeRoutes(converted())
    expect(router.get).toHaveBeenCalledWith('/optimized-assets/manifest/:name', expect.any(Function))
    expect(router.get).toHaveBeenCalledWith('/optimized-assets/:version/:cid/:file', expect.any(Function))
  })

  it('answers 503 while asset bundles are disabled', async () => {
    const { fetch, manifest } = makeRoutes(undefined)

    expect((await manifest(`${ENTITY}_mac.json`)).status).toBe(503)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('serves the locally converted manifest for the previewed scene', async () => {
    const { fetch, manifest } = makeRoutes(converted())

    const response = await manifest(`${ENTITY}_mac.json`)

    expect(response.status).toBe(200)
    expect(response.body).toContain('"exitCode":0')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('serves locally converted bundle bytes', async () => {
    const { fetch, bundle } = makeRoutes(converted())

    const response = await bundle('v49', ENTITY, 'a_mac')

    expect(response.status).toBe(200)
    expect(response.body.toString()).toBe('BUNDLE')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reads through to the ab-cdn for entities that are not the previewed scene', async () => {
    const { fetch, manifest } = makeRoutes(converted())
    fetch.mockResolvedValue({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      body: streamOf('{"upstream":true}')
    })

    const response = await manifest('bafkrei-wearable_mac.json', '?v=1')

    expect(fetch).toHaveBeenCalledWith('https://ab-cdn.decentraland.org/manifest/bafkrei-wearable_mac.json?v=1')
    expect(response.status).toBe(200)
    await expect(readBody(response.body)).resolves.toBe('{"upstream":true}')
  })

  it('forwards only an allowlist of upstream headers', async () => {
    const { fetch, bundle } = makeRoutes(converted())
    fetch.mockResolvedValue({
      status: 200,
      headers: new Headers({
        'content-type': 'application/octet-stream',
        'cache-control': 'max-age=60',
        // a third-party CDN must not set cookies or policy on the realm origin
        'set-cookie': 'evil=1',
        'content-security-policy': "default-src 'none'",
        'content-encoding': 'gzip'
      }),
      body: streamOf('decoded')
    })

    const response = await bundle('v49', 'bafkrei-other', 'file_mac')

    expect(response.headers['content-type']).toBe('application/octet-stream')
    expect(response.headers['cache-control']).toBe('max-age=60')
    expect(response.headers['set-cookie']).toBeUndefined()
    expect(response.headers['content-security-policy']).toBeUndefined()
    expect(response.headers['content-encoding']).toBeUndefined()
  })

  it('rejects traversal in the read-through path instead of fetching it', async () => {
    const { fetch, bundle, manifest } = makeRoutes(converted())

    expect((await bundle('v49', '../../etc', 'passwd')).status).toBe(400)
    expect((await manifest('..%2Fx_mac.json')).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('waits for the conversion instead of 404ing an early manifest request', async () => {
    const scene = { entityId: ENTITY, platform: 'mac', manifest: '{"exitCode":0}', bundles: new Map() }
    let settle: (v?: unknown) => void = () => {}
    let current: any
    const assetBundles = converted({
      ready: new Promise((resolve) => (settle = resolve)).then(() => (current = scene)),
      get: () => current
    })
    const { manifest } = makeRoutes(assetBundles)

    const pending = manifest(`${ENTITY}_mac.json`)
    settle()
    const response = await pending

    expect(response.status).toBe(200)
  })

  it('404s a malformed manifest name rather than treating it as an entity', async () => {
    const { fetch, manifest } = makeRoutes(converted())

    expect((await manifest('nounderscore.json')).status).toBe(404)
    expect(fetch).not.toHaveBeenCalled()
  })
})
