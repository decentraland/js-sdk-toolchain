import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { initComponents } from '../../../../packages/@dcl/sdk-commands/src/components'
import { parseArgs } from '../../../../packages/@dcl/sdk-commands/src/logic/args'
import { args, main } from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights'

/** An event stream that stays open until the request is aborted. */
function openStream(signal: AbortSignal): Response {
  const body = new ReadableStream({
    start(controller) {
      signal.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')))
    }
  })
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

describe('when running scene-insights', () => {
  let directory: string
  let sessionFile: string | undefined
  let privateKey: string | undefined
  let stdinIsTTY: boolean | undefined
  let stderr: jest.SpyInstance
  let components: Awaited<ReturnType<typeof initComponents>>

  beforeEach(async () => {
    directory = mkdtempSync(path.join(tmpdir(), 'scene-insights-'))
    sessionFile = process.env.DCL_SCENE_INSIGHTS_SESSION_DIR
    privateKey = process.env.DCL_PRIVATE_KEY
    stdinIsTTY = process.stdin.isTTY
    process.env.DCL_SCENE_INSIGHTS_SESSION_DIR = directory
    delete process.env.DCL_PRIVATE_KEY
    process.stdin.isTTY = false as any
    stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true)
    components = await initComponents()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    process.exitCode = undefined
    process.stdin.isTTY = stdinIsTTY as any
    rmSync(directory, { recursive: true, force: true })
    if (sessionFile === undefined) delete process.env.DCL_SCENE_INSIGHTS_SESSION_DIR
    else process.env.DCL_SCENE_INSIGHTS_SESSION_DIR = sessionFile
    if (privateKey === undefined) delete process.env.DCL_PRIVATE_KEY
    else process.env.DCL_PRIVATE_KEY = privateKey
  })

  describe('and the subcommand is unknown', () => {
    describe('and the output is JSON', () => {
      beforeEach(async () => {
        await main({ args: parseArgs(['nope', '--json'], args), components })
      })

      it('should write the error as JSON on stderr', () => {
        expect(JSON.parse(stderr.mock.calls[0][0])).toEqual({
          error: { code: 'SCENE_INSIGHTS_INVALID_ARGUMENT', message: expect.stringContaining('nope'), exitCode: 2 }
        })
      })

      it('should exit with the invalid arguments code', () => {
        expect(process.exitCode).toBe(2)
      })
    })

    describe('and the output is text', () => {
      let error: unknown

      beforeEach(async () => {
        error = await main({ args: parseArgs(['nope'], args), components }).catch((e: unknown) => e)
      })

      it('should throw the error for the CLI to print', () => {
        expect(error).toMatchObject({ name: 'SCENE_INSIGHTS_INVALID_ARGUMENT' })
      })

      it('should set the invalid arguments exit code', () => {
        expect(process.exitCode).toBe(2)
      })
    })
  })

  describe('and logs are requested without a session and without a terminal', () => {
    beforeEach(async () => {
      await main({ args: parseArgs(['logs', '--world', 'example', '--json'], args), components })
    })

    it('should exit with the sign-in needed code', () => {
      expect(process.exitCode).toBe(3)
    })
  })

  describe('and the session is checked without one', () => {
    beforeEach(async () => {
      await main({ args: parseArgs(['session', '--json'], args), components })
    })

    it('should exit with the sign-in needed code', () => {
      expect(process.exitCode).toBe(3)
    })
  })

  describe('and the session is checked with DCL_PRIVATE_KEY', () => {
    let result: unknown

    beforeEach(async () => {
      // a throwaway key generated for the test, never a real account
      process.env.DCL_PRIVATE_KEY = '0x' + '11'.repeat(32)
      result = await main({ args: parseArgs(['session', '--json'], args), components })
    })

    it('should return the key address as the signer, with no expiration', () => {
      expect(result).toEqual({
        address: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/),
        expiration: null,
        source: 'DCL_PRIVATE_KEY'
      })
    })
  })

  describe('and a subcommand gets a stray argument', () => {
    beforeEach(async () => {
      await main({ args: parseArgs(['logs', 'error', '--world', 'example', '--json'], args), components })
    })

    it('should refuse it with the invalid arguments code', () => {
      expect({ error: JSON.parse(stderr.mock.calls[0][0]).error, exitCode: process.exitCode }).toEqual({
        error: expect.objectContaining({ message: 'Unexpected argument "error" for logs' }),
        exitCode: 2
      })
    })
  })

  describe('and a flag of another subcommand is passed', () => {
    beforeEach(async () => {
      await main({
        args: parseArgs(['logs', '--for', '5m', '--step', '60', '--world', 'example', '--json'], args),
        components
      })
    })

    it('should refuse it instead of ignoring it', () => {
      expect(JSON.parse(stderr.mock.calls[0][0]).error).toMatchObject({
        message: '--for, --step do not apply to logs',
        exitCode: 2
      })
    })
  })

  describe('and the target is not a Decentraland host', () => {
    beforeEach(async () => {
      await main({
        args: parseArgs(
          ['executions', '--world', 'example', '--target', 'https://insights.example.com', '--json'],
          args
        ),
        components
      })
    })

    it('should refuse it before signing anything', () => {
      expect(JSON.parse(stderr.mock.calls[0][0]).error).toMatchObject({
        message: expect.stringContaining('pass --trust-target'),
        exitCode: 2
      })
    })
  })

  describe('and the tail is followed', () => {
    let sigintListenersBefore: number
    let sigintListenersDuring: number

    beforeEach(() => {
      // a throwaway key generated for the test, never a real account
      process.env.DCL_PRIVATE_KEY = '0x' + '11'.repeat(32)
      sigintListenersBefore = process.listenerCount('SIGINT')
    })

    describe('and it is interrupted', () => {
      beforeEach(async () => {
        jest.spyOn(components.fetch, 'fetch').mockImplementation(async (_url: any, init: any) => {
          sigintListenersDuring = process.listenerCount('SIGINT')
          const [interrupt] = process.listeners('SIGINT').slice(sigintListenersBefore)
          setImmediate(() => (interrupt as () => void)())
          return openStream(init.signal) as any
        })
        await main({ args: parseArgs(['tail', '--world', 'example', '--json'], args), components })
      })

      it('should stop, removing the SIGINT listener it added', () => {
        expect({ during: sigintListenersDuring, after: process.listenerCount('SIGINT') }).toEqual({
          during: sigintListenersBefore + 1,
          after: sigintListenersBefore
        })
      })
    })

    describe('and it is limited with --for', () => {
      let startedAt: number
      let elapsed: number

      beforeEach(async () => {
        jest
          .spyOn(components.fetch, 'fetch')
          .mockImplementation(async (_url: any, init: any) => openStream(init.signal) as any)
        startedAt = Date.now()
        await main({ args: parseArgs(['tail', '--world', 'example', '--for', '1s', '--json'], args), components })
        elapsed = Date.now() - startedAt
      })

      it('should stop after that long and remove its SIGINT listener', () => {
        expect({ stoppedInTime: elapsed >= 900 && elapsed < 3000, listeners: process.listenerCount('SIGINT') }).toEqual(
          {
            stoppedInTime: true,
            listeners: sigintListenersBefore
          }
        )
      })
    })
  })

  describe('and the user logs out without a session', () => {
    let result: unknown

    beforeEach(async () => {
      result = await main({ args: parseArgs(['logout', '--json'], args), components })
    })

    it('should report that nothing was removed', () => {
      expect(result).toEqual({
        removed: false,
        file: path.join(directory, '.dcl', 'scene-insights-session.json')
      })
    })
  })
})
