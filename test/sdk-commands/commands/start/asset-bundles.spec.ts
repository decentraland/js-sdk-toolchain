import { runAssetBundlesSidecar } from '../../../../packages/@dcl/sdk-commands/src/commands/start/asset-bundles'
import { b64UrlHashingFunction } from '../../../../packages/@dcl/sdk-commands/src/logic/project-files'

function makeComponents({ ready, execRejects }: { ready: boolean; execRejects?: boolean }) {
  const sidecarKeepsRunning = new Promise<void>(() => {})
  const exec = jest.fn(() => (execRejects ? Promise.reject(new Error('spawn abgen ENOENT')) : sidecarKeepsRunning))
  const fetch = jest.fn(async () => ({ ok: ready }))
  const logger = { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
  const config = { getString: jest.fn(async () => undefined), requireString: jest.fn(), getNumber: jest.fn() }
  // the pinned release is "already downloaded", keeping these tests off the network
  const fs = { fileExists: jest.fn(async () => true), mkdir: jest.fn(), writeFile: jest.fn(), unlink: jest.fn() }
  return {
    components: { spawner: { exec }, fetch: { fetch }, logger, config, fs } as any,
    exec,
    fetch,
    logger
  }
}

describe('start/asset-bundles', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('spawns the sidecar wired to the preview content endpoints and returns its url when ready', async () => {
    const { components, exec, fetch } = makeComponents({ ready: true })

    const url = await runAssetBundlesSidecar(components, 8000, '/tmp/e2e-scene')

    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
    expect(exec).toHaveBeenCalledTimes(1)
    const [, bin, execArgs, options] = exec.mock.calls[0] as any
    // the cached pinned-release binary (fs.fileExists mocked true)
    expect(bin).toMatch(/abgen-v\d+\.\d+\.\d+-[a-z0-9_]+-[a-z-]+[/\\]abgen(\.exe)?$/)
    expect(execArgs).toEqual([])
    expect(options.env.ABGEN_CATALYST_URL).toBe('http://127.0.0.1:8000/content')
    // remote entities are never converted locally: the worlds content fallback is
    // off and misses stream prebuilt from the production CDN
    expect(options.env.ABGEN_WORLDS_CONTENT_URL).toBe('off')
    expect(options.env.ABGEN_UPSTREAM_AB_CDN).toBe('https://ab-cdn.decentraland.org')
    expect(['windows', 'mac', 'linux']).toContain(options.env.ABGEN_INDEX_BUILD_PLATFORMS)
    expect(options.env.HTTP_SERVER_HOST).toBe('127.0.0.1')
    expect(url).toContain(options.env.HTTP_SERVER_PORT)
    expect(fetch).toHaveBeenCalledWith(`${url}/readyz`, expect.objectContaining({ signal: expect.anything() }))
  })

  it('resolves the binary from ABGEN_BIN when set', async () => {
    const { components, exec } = makeComponents({ ready: true })
    process.env.ABGEN_BIN = '/opt/abgen/bin/abgen'
    try {
      await runAssetBundlesSidecar(components, 8000, '/tmp/e2e-scene')
    } finally {
      delete process.env.ABGEN_BIN
    }
    expect((exec.mock.calls[0] as any)[1]).toBe('/opt/abgen/bin/abgen')
  })

  it('returns undefined and warns when the sidecar exits before becoming ready', async () => {
    const { components, logger } = makeComponents({ ready: false, execRejects: true })

    const url = await runAssetBundlesSidecar(components, 8000, '/tmp/e2e-scene')

    expect(url).toBeUndefined()
    expect(logger.warn).toHaveBeenCalled()
  })
})

describe('b64UrlHashingFunction', () => {
  it('produces URL- and path-safe identifiers', () => {
    const hash = b64UrlHashingFunction('/home/someone/my scene/with+special_chars')
    expect(hash.startsWith('b64-')).toBe(true)
    expect(hash).toMatch(/^b64-[A-Za-z0-9_-]+$/)
    expect(hash).not.toContain('/')
    expect(hash).not.toContain('+')
    expect(hash).not.toContain('=')
  })
})
