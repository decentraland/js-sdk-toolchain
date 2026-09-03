import { EventEmitter } from 'events'
import { PassThrough } from 'stream'
import { spawn } from 'child_process'
import {
  startMultiplayerServer,
  waitForServerReady
} from '../../../../packages/@dcl/sdk-commands/src/commands/start/multiplayer-server'

jest.mock('child_process', () => ({ spawn: jest.fn() }))

type FakeChild = EventEmitter & { stdout: PassThrough; stderr: PassThrough; kill: jest.Mock; killed: boolean }

function createFakeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.kill = jest.fn()
  child.killed = false
  return child
}

describe('multiplayer-server', () => {
  let child: FakeChild
  let components: {
    logger: { log: jest.Mock; info: jest.Mock; warn: jest.Mock; error: jest.Mock }
    analytics: { track: jest.Mock }
  }
  let stdoutWrite: jest.SpyInstance
  let stderrWrite: jest.SpyInstance
  let logged: () => string

  beforeEach(() => {
    child = createFakeChild()
    ;(spawn as jest.Mock).mockReturnValue(child)
    components = {
      logger: { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      analytics: { track: jest.fn() }
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

  describe('when the user overrides RUST_LOG', () => {
    let previous: string | undefined

    beforeEach(() => {
      previous = process.env.RUST_LOG
      process.env.RUST_LOG = 'error'
      startMultiplayerServer(components as any, '/scene', 'http://localhost:8000', 'bevy')
    })

    afterEach(() => {
      if (previous === undefined) delete process.env.RUST_LOG
      else process.env.RUST_LOG = previous
    })

    it('should keep the comms warnings the readiness check depends on', () => {
      const env: Record<string, string> = (spawn as jest.Mock).mock.calls[0][2].env
      expect(env.RUST_LOG).toBe('error,comms=warn')
    })
  })

  describe('when the bevy server logs that it joined the scene room', () => {
    let ready: Promise<boolean> | undefined

    beforeEach(() => {
      ready = startMultiplayerServer(components as any, '/scene', 'http://localhost:8000', 'bevy').ready
      child.stdout.write('2026-08-11T14:28:33.522058Z  WARN comms: added scene channel SetCurrentScene { .. }\n')
    })

    it('should resolve ready as true', async () => {
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
