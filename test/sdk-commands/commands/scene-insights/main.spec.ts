import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { initComponents } from '../../../../packages/@dcl/sdk-commands/src/components'
import { parseArgs } from '../../../../packages/@dcl/sdk-commands/src/logic/args'
import { args, main } from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights'

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
