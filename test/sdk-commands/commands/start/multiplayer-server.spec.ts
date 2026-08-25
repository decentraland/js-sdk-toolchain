import { EventEmitter } from 'events'
import * as childProcess from 'child_process'
import { startMultiplayerServer } from '../../../../packages/@dcl/sdk-commands/src/commands/start/multiplayer-server'
import { lsdRealmKey } from '../../../../packages/@dcl/sdk-commands/src/logic/lsd-realm'

jest.mock('child_process', () => ({ spawn: jest.fn() }))

const spawnMock = childProcess.spawn as unknown as jest.Mock

function fakeChild() {
  const child = new EventEmitter() as any
  child.stdout = null
  child.stderr = null
  child.killed = false
  child.kill = jest.fn()
  return child
}

const components = {
  logger: { log: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  analytics: { track: jest.fn(), stop: jest.fn() }
} as any

/** The argv handed to npx, whichever way npx was located. */
function spawnedArgs(): string[] {
  const [, args] = spawnMock.mock.calls[0]
  return args as string[]
}

describe('multiplayer server Pulse realm flag', () => {
  const original = process.env.DCL_SERVER_PULSE_REALM
  const workingDir = '/home/dev/my-scene'

  beforeEach(() => {
    jest.clearAllMocks()
    spawnMock.mockImplementation(() => fakeChild())
  })

  afterEach(() => {
    if (original === undefined) delete process.env.DCL_SERVER_PULSE_REALM
    else process.env.DCL_SERVER_PULSE_REALM = original
  })

  // Until bevy-explorer#1030 lands the headless binary ignores unknown flags;
  // afterwards it exits 2. Passing --pulse-realm unconditionally would therefore
  // break every preview on the default engine the day that ships.
  it('passes no --pulse-realm while the gate is closed', () => {
    delete process.env.DCL_SERVER_PULSE_REALM

    startMultiplayerServer(components, workingDir, 'http://localhost:8000', 'bevy')

    expect(spawnedArgs().some((arg) => arg.startsWith('--pulse-realm'))).toBe(false)
  })

  it('passes the realm key derived from the project root when opted in', () => {
    process.env.DCL_SERVER_PULSE_REALM = '1'

    startMultiplayerServer(components, workingDir, 'http://localhost:8000', 'bevy')

    expect(spawnedArgs()).toContain(`--pulse-realm=${lsdRealmKey(workingDir)}`)
  })

  it('passes the identical flag to the hammurabi opt-out', () => {
    process.env.DCL_SERVER_PULSE_REALM = '1'

    startMultiplayerServer(components, workingDir, 'http://localhost:8000', 'hammurabi')

    expect(spawnedArgs()).toContain(`--pulse-realm=${lsdRealmKey(workingDir)}`)
  })

  it('keeps the existing --realm argument alongside it', () => {
    process.env.DCL_SERVER_PULSE_REALM = '1'

    startMultiplayerServer(components, workingDir, 'http://localhost:8000', 'bevy')

    expect(spawnedArgs()).toContain('--realm=http://localhost:8000')
  })
})
