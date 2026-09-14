import { EventEmitter } from 'events'
import { PassThrough } from 'stream'
import { spawn } from 'child_process'
import {
  spawnAuthServer,
  startMultiplayerServer,
  waitForServerReady
} from '../../../../packages/@dcl/sdk-commands/src/commands/start/multiplayer-server'

jest.mock('child_process', () => ({ spawn: jest.fn() }))
jest.mock('../../../../packages/@dcl/sdk-commands/src/commands/start/utils', () => ({
  ...jest.requireActual('../../../../packages/@dcl/sdk-commands/src/commands/start/utils'),
  findNpxBin: jest.fn(() => '/node/npx.cmd'),
  findNpxCliJs: jest.fn(() => '/node/npx-cli.js')
}))
import { findNpxBin, findNpxCliJs } from '../../../../packages/@dcl/sdk-commands/src/commands/start/utils'

type FakeChild = EventEmitter & { stdout: PassThrough; stderr: PassThrough; kill: jest.Mock; killed: boolean }

function createFakeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.kill = jest.fn()
  child.killed = false
  return child
}

function setPlatform(value: NodeJS.Platform): () => void {
  const previous = Object.getOwnPropertyDescriptor(process, 'platform')!
  Object.defineProperty(process, 'platform', { value })
  return () => Object.defineProperty(process, 'platform', previous)
}

function setEnv(name: string, value: string): () => void {
  const previous = process.env[name]
  process.env[name] = value
  return () => {
    if (previous === undefined) delete process.env[name]
    else process.env[name] = previous
  }
}

describe('multiplayer-server', () => {
  let child: FakeChild
  let components: {
    logger: { log: jest.Mock; info: jest.Mock; warn: jest.Mock; error: jest.Mock }
    analytics: { track: jest.Mock }
    signaler: { programClosed: Promise<void> }
  }
  let stdoutWrite: jest.SpyInstance
  let stderrWrite: jest.SpyInstance
  let logged: () => string
  let closePreview: () => void

  beforeEach(() => {
    child = createFakeChild()
    ;(spawn as jest.Mock).mockReturnValue(child)
    components = {
      logger: { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      analytics: { track: jest.fn() },
      signaler: {
        programClosed: new Promise((resolve) => {
          closePreview = resolve
        })
      }
    }
    logged = () => components.logger.log.mock.calls.flat().join('\n')
    stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
    stderrWrite = jest.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    child.emit('close', 0, null)
    stdoutWrite.mockRestore()
    stderrWrite.mockRestore()
    jest.clearAllMocks()
  })

  describe('when starting the bevy server with a scene position', () => {
    beforeEach(() => {
      startMultiplayerServer(components as any, '/scene', 'http://localhost:8000', 'bevy', { x: 12, y: -3 })
    })

    it('should forward the position to the server process', () => {
      const args: string[] = (spawn as jest.Mock).mock.calls[0][1]
      expect(args).toEqual(expect.arrayContaining(['--realm=http://localhost:8000', '--position=12,-3']))
    })
  })

  describe('when npx-cli.js cannot be found on Windows', () => {
    let restorePlatform: () => void

    beforeEach(() => {
      restorePlatform = setPlatform('win32')
      ;(findNpxCliJs as jest.Mock).mockReturnValueOnce(null)
      startMultiplayerServer(components as any, '/scene', 'http://localhost:8000', 'bevy')
    })

    afterEach(() => {
      restorePlatform()
    })

    it('should run the absolute npx path through the shell because Windows cannot spawn a .cmd directly', () => {
      const [bin, , options] = (spawn as jest.Mock).mock.calls[0]
      expect(bin).toBe('/node/npx.cmd')
      expect(options.shell).toBe(true)
    })

    it('should quote every argument so cmd.exe passes each one through whole', () => {
      const args: string[] = (spawn as jest.Mock).mock.calls[0][1]
      expect(args).toEqual([
        '"--yes"',
        '"@dcl-regenesislabs/bevy-headless-server@latest"',
        '"--realm=http://localhost:8000"'
      ])
    })

    it('should warn that npx was not found next to node', () => {
      expect(logged()).toContain('npx')
    })
  })

  describe('when npx-cli.js cannot be found on Windows and the package override is a path with spaces and parentheses', () => {
    let restorePlatform: () => void
    let restoreEnv: () => void

    beforeEach(() => {
      restorePlatform = setPlatform('win32')
      restoreEnv = setEnv('DCL_SERVER_PACKAGE', 'C:\\Program Files (x86)\\bevy\\server.tgz')
      ;(findNpxCliJs as jest.Mock).mockReturnValueOnce(null)
      startMultiplayerServer(components as any, '/scene', 'http://localhost:8000', 'bevy')
    })

    afterEach(() => {
      restorePlatform()
      restoreEnv()
    })

    it('should hand the quoted path to the shell instead of refusing it', () => {
      const args: string[] = (spawn as jest.Mock).mock.calls[0][1]
      expect(args).toContain('"C:\\Program Files (x86)\\bevy\\server.tgz"')
    })
  })

  describe('when the preview lifecycle ends', () => {
    beforeEach(() => {
      spawnAuthServer(
        components as any,
        { workingDirectory: '/scene', scene: { scene: { base: '0,0' } } } as any,
        'http://localhost:8000'
      )
      closePreview()
    })

    it('should terminate the multiplayer server', async () => {
      await Promise.resolve()
      expect(child.kill).toHaveBeenCalledWith('SIGTERM')
    })
  })

  describe('when npx-cli.js cannot be found on Windows and an argument carries shell metacharacters', () => {
    let restorePlatform: () => void
    let restoreEnv: () => void
    let start: () => unknown

    beforeEach(() => {
      restorePlatform = setPlatform('win32')
      restoreEnv = setEnv('DCL_SERVER_PACKAGE', 'pkg@latest & calc.exe')
      ;(findNpxCliJs as jest.Mock).mockReturnValueOnce(null)
      start = () => startMultiplayerServer(components as any, '/scene', 'http://localhost:8000', 'bevy')
    })

    afterEach(() => {
      restorePlatform()
      restoreEnv()
    })

    it('should refuse to spawn instead of handing the argument to the shell', () => {
      expect(start).toThrow(/shell/)
      expect(spawn).not.toHaveBeenCalled()
    })
  })

  describe('when npx-cli.js cannot be found on a unix platform and the package override has spaces', () => {
    let restorePlatform: () => void
    let restoreEnv: () => void

    beforeEach(() => {
      restorePlatform = setPlatform('linux')
      restoreEnv = setEnv('DCL_SERVER_PACKAGE', '/opt/bevy server/server.tgz')
      ;(findNpxCliJs as jest.Mock).mockReturnValueOnce(null)
      startMultiplayerServer(components as any, '/scene', 'http://localhost:8000', 'bevy')
    })

    afterEach(() => {
      restorePlatform()
      restoreEnv()
    })

    it('should pass the path to npx verbatim because no shell parses it', () => {
      const [, args, options] = (spawn as jest.Mock).mock.calls[0]
      expect(args).toContain('/opt/bevy server/server.tgz')
      expect(options.shell).toBe(false)
    })
  })

  describe('when the user overrides RUST_LOG', () => {
    let restoreEnv: () => void

    beforeEach(() => {
      restoreEnv = setEnv('RUST_LOG', 'error')
      startMultiplayerServer(components as any, '/scene', 'http://localhost:8000', 'bevy')
    })

    afterEach(() => {
      restoreEnv()
    })

    it('should keep the comms warnings the readiness check depends on', () => {
      const env: Record<string, string> = (spawn as jest.Mock).mock.calls[0][2].env
      expect(env.RUST_LOG).toBe('error,comms=warn')
    })
  })

  describe('when the bevy server prints the scene-room-connected marker', () => {
    let ready: Promise<boolean> | undefined

    beforeEach(() => {
      ready = startMultiplayerServer(components as any, '/scene', 'http://localhost:8000', 'bevy').ready
      child.stdout.write('[headless] scene room connected: bafkrei\n')
    })

    it('should resolve ready as true', async () => {
      await expect(ready).resolves.toBe(true)
    })
  })

  describe('when the bevy server predates the marker and only logs the tracing line', () => {
    let ready: Promise<boolean> | undefined

    beforeEach(() => {
      ready = startMultiplayerServer(components as any, '/scene', 'http://localhost:8000', 'bevy').ready
      child.stdout.write('2026-08-11T14:28:33.522058Z  WARN comms: added scene channel SetCurrentScene { .. }\n')
    })

    it('should still resolve ready as true from the fallback signal', async () => {
      await expect(ready).resolves.toBe(true)
    })
  })

  describe('when the bevy server exits before joining the scene room', () => {
    let ready: Promise<boolean> | undefined

    beforeEach(() => {
      ready = startMultiplayerServer(components as any, '/scene', 'http://localhost:8000', 'bevy').ready
      child.emit('close', 1, null)
    })

    it('should resolve ready as false', async () => {
      await expect(ready).resolves.toBe(false)
    })

    it('should warn that clients will keep waiting for state sync', () => {
      expect(logged()).toContain('exited with code 1')
      expect(logged()).toContain('state sync')
    })
  })

  describe('when the bevy server emits a process error before joining the scene room', () => {
    let ready: Promise<boolean> | undefined

    beforeEach(() => {
      ready = startMultiplayerServer(components as any, '/scene', 'http://localhost:8000', 'bevy').ready
      child.emit('error', new Error('spawn npx ENOENT'))
    })

    it('should resolve ready as false', async () => {
      await expect(ready).resolves.toBe(false)
    })
  })

  describe('when starting the hammurabi server', () => {
    let ready: Promise<boolean> | undefined

    beforeEach(() => {
      ready = startMultiplayerServer(components as any, '/scene', 'http://localhost:8000', 'hammurabi').ready
    })

    it('should expose no readiness because its output is not observable', () => {
      expect(ready).toBeUndefined()
    })
  })

  describe('waitForServerReady', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    describe('when the server becomes ready in time', () => {
      let result: Promise<void>

      beforeEach(() => {
        result = waitForServerReady(components as any, Promise.resolve(true), 1000)
      })

      it('should report the server as ready', async () => {
        await result
        expect(logged()).toContain('is ready')
      })
    })

    describe('when the server exited before becoming ready', () => {
      let result: Promise<void>

      beforeEach(() => {
        result = waitForServerReady(components as any, Promise.resolve(false), 1000)
      })

      it('should warn that the server is not running and continue', async () => {
        await result
        expect(logged()).toContain('is not running')
      })
    })

    describe('when the server does not become ready before the timeout', () => {
      let result: Promise<void>

      beforeEach(() => {
        result = waitForServerReady(components as any, new Promise(() => {}), 1000)
        jest.advanceTimersByTime(1000)
      })

      it('should warn and continue', async () => {
        await result
        expect(logged()).toContain('is not ready after 1s')
      })
    })
  })
})
