import {
  ABGEN_VERSION,
  getAbgenStorageRoot,
  resolveAbgenBin
} from '../../../../packages/@dcl/sdk-commands/src/commands/start/abgen-binary'

function makeComponents({
  cached,
  response
}: {
  cached: boolean
  response?: { ok: boolean; status?: number; body?: Buffer }
}) {
  const body = response?.body ?? Buffer.alloc(0)
  const fetch = jest.fn(async () => ({
    ok: response?.ok ?? false,
    status: response?.status ?? 500,
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
  }))
  const logger = { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
  const exec = jest.fn(async () => {})
  const fs = {
    fileExists: jest.fn(async (_path: string) => cached),
    mkdir: jest.fn(async () => {}),
    writeFile: jest.fn(async () => {}),
    unlink: jest.fn(async () => {}),
    readdir: jest.fn(async () => [] as string[]),
    rm: jest.fn(async () => {})
  }
  return { components: { fetch: { fetch }, logger, spawner: { exec }, fs } as any, fetch, logger, exec, fs }
}

describe('start/abgen-binary', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.ABGEN_BIN
  })

  it('honors XDG_CACHE_HOME for the storage root', async () => {
    process.env.XDG_CACHE_HOME = '/custom/cache'
    try {
      expect(getAbgenStorageRoot().startsWith('/custom/cache')).toBe(true)
      expect(getAbgenStorageRoot()).toContain('decentraland')
    } finally {
      delete process.env.XDG_CACHE_HOME
    }
    expect(getAbgenStorageRoot().startsWith('/custom/cache')).toBe(false)
  })

  it('honors ABGEN_BIN over everything else', async () => {
    const { components, fetch, fs } = makeComponents({ cached: true })
    process.env.ABGEN_BIN = '/opt/abgen/bin/abgen'

    expect(await resolveAbgenBin(components)).toBe('/opt/abgen/bin/abgen')
    expect(fs.fileExists).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns the cached pinned-release binary without touching the network', async () => {
    const { components, fetch } = makeComponents({ cached: true })

    const bin = await resolveAbgenBin(components)

    expect(bin.startsWith(getAbgenStorageRoot())).toBe(true)
    expect(bin).toContain(`abgen-${ABGEN_VERSION}-`)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('prunes superseded releases once the pinned one resolves', async () => {
    const { components, fs } = makeComponents({ cached: true })
    fs.readdir.mockResolvedValue([
      'abgen-v0.11.4-aarch64-apple-darwin',
      `abgen-${ABGEN_VERSION}-aarch64-apple-darwin`,
      '.staging-123-1' // a concurrent resolver may be mid-extract: never touched
    ])

    await resolveAbgenBin(components)

    const removed = fs.rm.mock.calls.map((c: any[]) => c[0])
    expect(removed).toHaveLength(1)
    expect(removed[0]).toContain('abgen-v0.11.4-aarch64-apple-darwin')
  })

  it('never fails the resolve over pruning errors', async () => {
    const { components, fs } = makeComponents({ cached: true })
    fs.readdir.mockRejectedValue(new Error('EACCES'))

    const bin = await resolveAbgenBin(components)

    expect(bin).toContain(`abgen-${ABGEN_VERSION}-`)
  })

  it('prefers a binary already on the PATH over downloading', async () => {
    const { components, fetch, fs } = makeComponents({ cached: false })
    const pathBackup = process.env.PATH
    process.env.PATH = ['/fake/bin', '/other/bin'].join(require('path').delimiter)
    fs.fileExists.mockImplementation(async (p: string) => p === '/fake/bin/abgen')
    try {
      expect(await resolveAbgenBin(components)).toBe('/fake/bin/abgen')
    } finally {
      process.env.PATH = pathBackup
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  it('falls back to the PATH with a warning when the download fails', async () => {
    const { components, logger } = makeComponents({ cached: false, response: { ok: false, status: 404 } })

    expect(await resolveAbgenBin(components)).toBe('abgen')
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('404'))
  })

  it('rejects a download whose sha256 does not match the pinned release', async () => {
    const { components, logger, exec, fs } = makeComponents({
      cached: false,
      response: { ok: true, body: Buffer.from('not the real archive') }
    })

    expect(await resolveAbgenBin(components)).toBe('abgen')
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('sha256 mismatch'))
    // nothing was written or extracted from the tampered archive
    expect(fs.writeFile).not.toHaveBeenCalled()
    expect(exec).not.toHaveBeenCalled()
  })

  it('falls back to the PATH on platforms without a prebuilt archive', async () => {
    const { components, fetch, logger } = makeComponents({ cached: false })
    const platform = Object.getOwnPropertyDescriptor(process, 'platform')!
    Object.defineProperty(process, 'platform', { value: 'freebsd' })
    try {
      expect(await resolveAbgenBin(components)).toBe('abgen')
    } finally {
      Object.defineProperty(process, 'platform', platform)
    }
    expect(fetch).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no prebuilt abgen'))
  })
})
