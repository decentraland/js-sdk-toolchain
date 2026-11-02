import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { Authenticator, AuthIdentity } from '../../../../packages/@dcl/sdk-commands/node_modules/@dcl/crypto'
import { initComponents } from '../../../../packages/@dcl/sdk-commands/src/components'
import { createEphemeralIdentity } from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/session'
import { getSession } from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/sign-in'
import { getSessionFilePath } from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/session-store'
import { args, main } from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights'
import { parseArgs } from '../../../../packages/@dcl/sdk-commands/src/logic/args'
import { setRoutes } from '../../../../packages/@dcl/sdk-commands/src/linker-dapp/routes'
import { runDapp } from '../../../../packages/@dcl/sdk-commands/src/run-dapp'

jest.mock('../../../../packages/@dcl/sdk-commands/src/linker-dapp/routes', () => ({ setRoutes: jest.fn() }))
jest.mock('../../../../packages/@dcl/sdk-commands/src/run-dapp', () => ({ runDapp: jest.fn() }))

type Handler = (ctx: unknown) => Promise<{ status?: number; body: { success: boolean; error?: string } }>

describe('when signing in through the browser linker', () => {
  let directory: string
  let file: string
  let previousDirectory: string | undefined
  let previousKey: string | undefined
  let parent: AuthIdentity
  let message: string
  let handler: Handler
  let browserResponse: Awaited<ReturnType<Handler>>
  let components: Awaited<ReturnType<typeof initComponents>>
  let fetchSpy: jest.SpyInstance
  let stop: jest.Mock
  let stderr: jest.SpyInstance

  beforeEach(async () => {
    directory = mkdtempSync(path.join(tmpdir(), 'scene-insights-browser-'))
    file = getSessionFilePath(directory)
    previousDirectory = process.env.DCL_SCENE_INSIGHTS_SESSION_DIR
    previousKey = process.env.DCL_PRIVATE_KEY
    process.env.DCL_SCENE_INSIGHTS_SESSION_DIR = directory
    delete process.env.DCL_PRIVATE_KEY
    components = await initComponents()
    parent = await Authenticator.initializeAuthChain(
      '0x1111111111111111111111111111111111111111',
      createEphemeralIdentity(),
      10,
      async () => '0x1234'
    )
    stop = jest.fn().mockResolvedValue(undefined)
    stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true)
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const payload = JSON.parse(String(init?.body))
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: payload.id, result: '0x1626ba7e' + '0'.repeat(56) }))
    })
    jest.mocked(setRoutes).mockImplementation((_components, options) => {
      message = options.rootCID
      return {
        router: {
          post: (_path: string, callback: Handler) => {
            handler = callback
          }
        }
      } as ReturnType<typeof setRoutes>
    })
    jest.mocked(runDapp).mockImplementation(async () => {
      const authChain = Authenticator.signPayload(parent, message)
      browserResponse = await handler({
        request: {
          headers: new Headers({ origin: 'http://localhost:8001', host: 'localhost:8001' }),
          json: async () => ({ address: parent.authChain[0].payload, authChain })
        }
      })
      return { program: { stop } } as Awaited<ReturnType<typeof runDapp>>
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.resetAllMocks()
    process.exitCode = undefined
    if (previousDirectory === undefined) delete process.env.DCL_SCENE_INSIGHTS_SESSION_DIR
    else process.env.DCL_SCENE_INSIGHTS_SESSION_DIR = previousDirectory
    if (previousKey === undefined) delete process.env.DCL_PRIVATE_KEY
    else process.env.DCL_PRIVATE_KEY = previousKey
    rmSync(directory, { recursive: true, force: true })
  })

  it('should validate once, preserve the parent expiry and save the successful delegation', async () => {
    await expect(
      getSession(
        components,
        { label: 'scene insights' },
        {
          file,
          targetUrl: 'https://multiplayer-scenes-insights-service.decentraland.zone',
          linkOptions: { openBrowser: false, isHttps: false },
          interactive: true,
          forceNew: true
        }
      )
    ).resolves.toMatchObject({ source: 'signed', session: { expiration: parent.expiration } })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(JSON.parse(readFileSync(file, 'utf8')).expiration).toBe(parent.expiration.toISOString())
    expect(stop).toHaveBeenCalledTimes(1)
  })

  describe('and RPC fails during browser validation', () => {
    beforeEach(() => {
      fetchSpy.mockRejectedValueOnce(new Error('private provider details'))
      mkdirSync(path.dirname(file), { recursive: true })
      writeFileSync(file, 'previous credential fixture')
    })
    it('should return retryable exit 6, stop the linker and preserve the previous credential', async () => {
      await main({ args: parseArgs(['login', '--json'], args), components })
      expect(process.exitCode).toBe(6)
      expect(JSON.parse(stderr.mock.calls[stderr.mock.calls.length - 1][0])).toMatchObject({
        error: { code: 'SCENE_INSIGHTS_UNAVAILABLE', exitCode: 6 }
      })
      expect(browserResponse.status).toBe(503)
      expect(stop).toHaveBeenCalledTimes(1)
      expect(readFileSync(file, 'utf8')).toBe('previous credential fixture')
    })
    describe('and linker shutdown also fails', () => {
      beforeEach(() => {
        stop.mockRejectedValueOnce(new Error('Linker shutdown failed'))
      })

      it('should preserve the retryable RPC error and saved credential', async () => {
        await main({ args: parseArgs(['login', '--json'], args), components })
        expect(process.exitCode).toBe(6)
        expect(JSON.parse(stderr.mock.calls[stderr.mock.calls.length - 1][0])).toMatchObject({
          error: { code: 'SCENE_INSIGHTS_UNAVAILABLE', exitCode: 6 }
        })
        expect(stop).toHaveBeenCalledTimes(1)
        expect(readFileSync(file, 'utf8')).toBe('previous credential fixture')
      })
    })
  })
})
