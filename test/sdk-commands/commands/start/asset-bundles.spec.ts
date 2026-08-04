import {
  hostPlatform,
  setupAssetBundles
} from '../../../../packages/@dcl/sdk-commands/src/commands/start/asset-bundles'
import { b64UrlHashingFunction } from '../../../../packages/@dcl/sdk-commands/src/logic/project-files'

const PROJECT = '/tmp/e2e-scene'

jest.mock('../../../../packages/@dcl/sdk-commands/src/logic/project-files', () => {
  const actual = jest.requireActual('../../../../packages/@dcl/sdk-commands/src/logic/project-files')
  return { ...actual, getPublishableFiles: jest.fn(async () => ['scene.json', 'models/a.glb']) }
})

const convert = jest.fn()
jest.mock('@dcl/abgen-node', () => ({ convert: (...args: any[]) => convert(...args) }), { virtual: true })

function makeComponents({ cached = false }: { cached?: boolean } = {}) {
  const logger = { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
  const fs = {
    fileExists: jest.fn(async () => cached),
    readFile: jest.fn(async (p: string) => (p.endsWith('manifest.json') ? '{"exitCode":0}' : Buffer.from('bytes'))),
    readdir: jest.fn(async () => ['a_mac']),
    mkdir: jest.fn(async (_p: string, _opts?: any) => undefined),
    writeFile: jest.fn(async (_p: string, _data?: any, _opts?: any) => undefined),
    rename: jest.fn(async (_from: string, _to: string) => undefined),
    rm: jest.fn(async (_p: string, _opts?: any) => undefined),
    unlink: jest.fn(async (_p: string) => undefined),
    stat: jest.fn(async (_p: string) => ({ mtimeMs: Date.now() }))
  }
  const config = { getString: jest.fn(async () => undefined), requireString: jest.fn(), getNumber: jest.fn() }
  const fetch = { fetch: jest.fn() }
  return { components: { logger, fs, config, fetch } as any, logger, fs }
}

describe('start/asset-bundles', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.ABGEN_UPSTREAM_AB_CDN
  })

  it('converts the scene in-process and exposes it under the preview entity id', async () => {
    const { components } = makeComponents()
    convert.mockResolvedValue({
      code: 0,
      bundles: [{ name: 'a_mac', data: Buffer.from('BUNDLE') }],
      events: [],
      errors: [],
      manifest: '{"exitCode":0,"files":["a_mac"]}'
    })

    const assetBundles = await setupAssetBundles(components, PROJECT)
    const scene = await assetBundles!.ready

    expect(assetBundles!.entityId).toBe(b64UrlHashingFunction(PROJECT))
    // no port, no spawn: the whole conversion is a function call
    expect(convert).toHaveBeenCalledTimes(1)
    const job = convert.mock.calls[0][0]
    expect(job.entityHash).toBe(b64UrlHashingFunction(PROJECT))
    expect(job.files.map((f: any) => f.name)).toEqual(['scene.json', 'models/a.glb'])
    expect(scene!.bundles.get('a_mac')!.toString()).toBe('BUNDLE')
  })

  it('persists the conversion so a second preview of the same scene reuses it', async () => {
    const { components, fs } = makeComponents({ cached: true })

    const assetBundles = await setupAssetBundles(components, PROJECT)
    const scene = await assetBundles!.ready

    expect(convert).not.toHaveBeenCalled()
    expect(scene!.manifest).toBe('{"exitCode":0}')
    expect(fs.readdir).toHaveBeenCalled()
  })

  it('reads non-local entities through the production CDN, never converting them', async () => {
    const { components } = makeComponents()
    convert.mockResolvedValue({ code: 0, bundles: [], events: [], errors: [], manifest: '{"exitCode":0}' })

    const assetBundles = await setupAssetBundles(components, PROJECT)

    expect(assetBundles!.upstreamAbCdn).toBe('https://ab-cdn.decentraland.org')
  })

  it('degrades with a warning when the conversion fails', async () => {
    const { components, logger } = makeComponents()
    convert.mockResolvedValue({ code: 2, bundles: [], events: [], errors: ['boom'], manifest: undefined })

    const assetBundles = await setupAssetBundles(components, PROJECT)

    await expect(assetBundles!.ready).resolves.toBeUndefined()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'))
  })

  it('reconverts after invalidate, so an edited scene is not served stale bundles', async () => {
    const { components } = makeComponents()
    convert
      .mockResolvedValueOnce({
        code: 0,
        bundles: [{ name: 'a_mac', data: Buffer.from('BEFORE') }],
        events: [],
        errors: [],
        manifest: '{"exitCode":0}'
      })
      .mockResolvedValueOnce({
        code: 0,
        bundles: [{ name: 'a_mac', data: Buffer.from('AFTER') }],
        events: [],
        errors: [],
        manifest: '{"exitCode":0}'
      })

    const assetBundles = await setupAssetBundles(components, PROJECT)
    expect((await assetBundles!.ready)!.bundles.get('a_mac')!.toString()).toBe('BEFORE')

    assetBundles!.invalidate()

    expect((await assetBundles!.ready)!.bundles.get('a_mac')!.toString()).toBe('AFTER')
    expect(convert).toHaveBeenCalledTimes(2)
  })

  it('coalesces a burst of invalidations into one reconversion', async () => {
    const { components } = makeComponents()
    convert.mockResolvedValue({
      code: 0,
      bundles: [{ name: 'a_mac', data: Buffer.from('B') }],
      events: [],
      errors: [],
      manifest: '{"exitCode":0}'
    })

    const assetBundles = await setupAssetBundles(components, PROJECT)
    await assetBundles!.ready

    // The watcher fires per file; twenty saves must not queue twenty runs.
    for (let i = 0; i < 20; i++) assetBundles!.invalidate()
    await assetBundles!.ready

    expect(convert).toHaveBeenCalledTimes(2)
  })

  it('warns rather than throwing when a per-asset failure is reported', async () => {
    const { components, logger } = makeComponents()
    convert.mockResolvedValue({
      code: 0,
      bundles: [{ name: 'a_mac', data: Buffer.from('B') }],
      events: [],
      errors: [],
      manifest: '{"exitCode":12}'
    })

    const assetBundles = await setupAssetBundles(components, PROJECT)

    await expect(assetBundles!.ready).resolves.toBeDefined()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('raw GLTFs'))
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

describe('start/asset-bundles reconversion', () => {
  const files = require('../../../../packages/@dcl/sdk-commands/src/logic/project-files')
  const publishable = ['scene.json', 'models/a.glb']

  afterEach(() => {
    jest.clearAllMocks()
    // clearAllMocks leaves implementations in place, so a test that changes
    // what the scene contains has to put it back or it leaks into the next.
    files.getPublishableFiles.mockResolvedValue(publishable)
  })

  /** Let the serialised decision chain settle before asserting. */
  const settleDecisions = () => new Promise((r) => setImmediate(r))

  /** A convert() the test resolves by hand, per call. */
  function deferredConvert() {
    const gates: Array<(v: any) => void> = []
    convert.mockImplementation(() => new Promise((resolve) => gates.push(resolve)))
    return {
      gates,
      settle(i: number, name: string) {
        gates[i]({
          code: 0,
          bundles: [{ name, data: Buffer.from(name) }],
          events: [],
          errors: [],
          manifest: `{"exitCode":0,"files":["${name}"]}`
        })
      }
    }
  }

  it('converts identical content once, however many readers ask', async () => {
    const { components } = makeComponents()
    const d = deferredConvert()

    const assetBundles = await setupAssetBundles(components, PROJECT)
    const a = assetBundles!.ready
    assetBundles!.invalidate()
    const b = assetBundles!.ready
    assetBundles!.invalidate()
    const c = assetBundles!.ready
    await settleDecisions()

    // Same files, so the same content key: one conversion, joined by all three.
    expect(convert).toHaveBeenCalledTimes(1)

    d.settle(0, 'a_mac')
    expect(await a).toBe(await b)
    expect(await b).toBe(await c)
  })

  it('keeps the newest conversion when an edit lands mid-flight', async () => {
    const { components } = makeComponents()
    const d = deferredConvert()

    const assetBundles = await setupAssetBundles(components, PROJECT)
    const slow = assetBundles!.ready
    await settleDecisions()

    // The scene changes while the first conversion runs, so the second has a
    // different content key and must win regardless of completion order.
    files.getPublishableFiles.mockResolvedValue([...publishable, 'models/b.glb'])
    assetBundles!.invalidate()
    const fast = assetBundles!.ready
    await settleDecisions()
    expect(convert).toHaveBeenCalledTimes(2)

    // Settle the NEWER one first, then let the superseded one land after it.
    d.settle(1, 'new_mac')
    await fast
    d.settle(0, 'old_mac')
    await slow

    expect(assetBundles!.get(hostPlatform())?.bundles.has('new_mac')).toBe(true)
    expect(assetBundles!.get(hostPlatform())?.bundles.has('old_mac')).toBeFalsy()
  })
})

describe('start/asset-bundles cache publishing', () => {
  const files = require('../../../../packages/@dcl/sdk-commands/src/logic/project-files')
  afterEach(() => {
    jest.clearAllMocks()
    files.getPublishableFiles.mockResolvedValue(['scene.json', 'models/a.glb'])
  })

  const ok = {
    code: 0,
    bundles: [{ name: 'a_mac', data: Buffer.from('B') }],
    events: [],
    errors: [],
    manifest: '{"exitCode":0}'
  }

  it('stages the conversion and publishes it with a single rename', async () => {
    const { components, fs } = makeComponents()
    convert.mockResolvedValue(ok)

    const assetBundles = await setupAssetBundles(components, PROJECT)
    await assetBundles!.ready

    // Nothing may be written straight into the directory a reader looks at.
    const written = fs.writeFile.mock.calls.map((c: any) => c[0])
    const bundles = written.filter((p: string) => p.includes('bundles'))
    expect(bundles.length).toBeGreaterThan(0)
    for (const p of written) {
      if (p.endsWith('.lock')) continue
      expect(p).toContain('.tmp-')
    }

    const [from, to] = fs.rename.mock.calls[0]
    expect(from).toContain('.tmp-')
    expect(to).not.toContain('.tmp-')
    expect(to.endsWith(`_${hostPlatform()}`)).toBe(true)
  })

  it('discards its own output when another preview published first', async () => {
    const { components, fs } = makeComponents()
    convert.mockResolvedValue(ok)
    fs.rename.mockRejectedValue(Object.assign(new Error('not empty'), { code: 'ENOTEMPTY' }))

    const assetBundles = await setupAssetBundles(components, PROJECT)

    // The scene still resolves: the winner's bytes are ours byte for byte.
    await expect(assetBundles!.ready).resolves.toBeDefined()
    expect(fs.rm).toHaveBeenCalledWith(expect.stringContaining('.tmp-'), { recursive: true, force: true })
  })

  it('takes over a lock whose owner died', async () => {
    const { components, fs } = makeComponents()
    convert.mockResolvedValue(ok)
    fs.writeFile.mockRejectedValueOnce(Object.assign(new Error('exists'), { code: 'EEXIST' }))
    fs.stat.mockResolvedValueOnce({ mtimeMs: Date.now() - 60 * 60_000 })

    const assetBundles = await setupAssetBundles(components, PROJECT)
    await assetBundles!.ready

    expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('.lock'))
    expect(convert).toHaveBeenCalledTimes(1)
  })

  it('uses what a live lock holder produced rather than converting again', async () => {
    const { components, fs } = makeComponents()
    convert.mockResolvedValue(ok)
    fs.writeFile.mockRejectedValueOnce(Object.assign(new Error('exists'), { code: 'EEXIST' }))
    // Absent for the pre-lock miss, present once the holder has published.
    fs.fileExists.mockResolvedValueOnce(false).mockResolvedValue(true)

    const assetBundles = await setupAssetBundles(components, PROJECT)

    await expect(assetBundles!.ready).resolves.toBeDefined()
    expect(convert).not.toHaveBeenCalled()
    // Held and fresh, so it was waited on. Without this the test passes even
    // if the lock is ignored outright, since the re-read alone finds the entry.
    expect(fs.stat).toHaveBeenCalledWith(expect.stringContaining('.lock'))
  })

  it('sweeps abandoned staging directories but leaves live ones alone', async () => {
    const { components, fs } = makeComponents()
    convert.mockResolvedValue(ok)
    fs.readdir.mockResolvedValue(['abc_mac', 'abc_mac.tmp-0011aabb', 'abc_mac.tmp-ffee2233'])
    fs.stat.mockImplementation(async (p: string) => ({
      mtimeMs: p.endsWith('0011aabb') ? Date.now() - 60 * 60_000 : Date.now()
    }))

    await setupAssetBundles(components, PROJECT)

    const swept = fs.rm.mock.calls.map((c: any) => c[0])
    expect(swept).toContain(`${PROJECT}/.dcl-optimized-assets/abc_mac.tmp-0011aabb`)
    expect(swept).not.toContain(`${PROJECT}/.dcl-optimized-assets/abc_mac.tmp-ffee2233`)
    expect(swept).not.toContain(`${PROJECT}/.dcl-optimized-assets/abc_mac`)
  })
})
