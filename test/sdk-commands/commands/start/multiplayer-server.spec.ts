import { EventEmitter } from 'events'
import * as childProcess from 'child_process'
import { startMultiplayerServer } from '../../../../packages/@dcl/sdk-commands/src/commands/start/multiplayer-server'
import { lsdRealmKey } from '../../../../packages/@dcl/sdk-commands/src/logic/lsd-realm'

jest.mock('child_process', () => ({ spawn: jest.fn() }))

const spawnMock = childProcess.spawn as unknown as jest.Mock
const WORKING_DIR = '/home/dev/my-scene'

const components = {
  logger: { log: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  analytics: { track: jest.fn(), stop: jest.fn() }
} as any

function fakeChild() {
  const child = new EventEmitter() as any
  child.stdout = null
  child.stderr = null
  child.killed = false
  child.kill = jest.fn()
  return child
}

/** Spawns, then closes so the process-level cleanup handlers are released. */
function spawnedArgs(engine: 'bevy' | 'hammurabi'): string[] {
  const child = startMultiplayerServer(components, WORKING_DIR, 'http://localhost:8000', engine)
  child.emit('close', 0, null)
  const [, args] = spawnMock.mock.calls[0]
  return args as string[]
}

describe('multiplayer server Pulse realm flag', () => {
  const original = process.env.DCL_SERVER_PULSE_REALM

  beforeEach(() => {
    jest.clearAllMocks()
    spawnMock.mockImplementation(() => fakeChild())
  })

  afterEach(() => {
    if (original === undefined) delete process.env.DCL_SERVER_PULSE_REALM
    else process.env.DCL_SERVER_PULSE_REALM = original
  })

  // the engine currently ignores unknown flags but is due to start rejecting
  // them, so passing this ungated would break every preview on the default engine
  it('passes no --pulse-realm while the gate is closed', () => {
    delete process.env.DCL_SERVER_PULSE_REALM

    const args = spawnedArgs('bevy')

    expect(args.some((arg) => arg.startsWith('--pulse-realm'))).toBe(false)
    expect(args).toContain('--realm=http://localhost:8000')
  })

  it('passes the realm key derived from the project root when opted in', () => {
    process.env.DCL_SERVER_PULSE_REALM = '1'

    const args = spawnedArgs('bevy')

    expect(args).toContain(`--pulse-realm=${lsdRealmKey(WORKING_DIR)}`)
    expect(args).toContain('--realm=http://localhost:8000')
  })

  it('passes the identical flag to the hammurabi opt-out', () => {
    process.env.DCL_SERVER_PULSE_REALM = '1'

    expect(spawnedArgs('hammurabi')).toContain(`--pulse-realm=${lsdRealmKey(WORKING_DIR)}`)
  })
})
