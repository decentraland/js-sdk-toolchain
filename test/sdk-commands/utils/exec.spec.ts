const spawnMock = {
  stdout: {
    on: jest.fn(),
    pipe: jest.fn()
  },
  stderr: {
    pipe: jest.fn()
  },
  on: jest.fn()
}

jest.mock('child_process', () => ({
  spawn: jest.fn(() => spawnMock)
}))

import * as childProcess from 'child_process'
import * as execUtils from '../../../packages/@dcl/sdk-commands/src/logic/exec'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('utils/exec', () => {
  it('it should be called with proper params #1', async () => {
    const spawnSpy = jest.spyOn(childProcess, 'spawn')
    const pipeSpy = jest.spyOn(spawnMock.stderr, 'pipe')
    spawnMock.on.mockImplementation((_: string, cb: (code: number) => void) => {
      cb(0)
    })

    const res = await execUtils.exec(process.cwd(), 'run', ['some', 'test'])

    expect(spawnSpy).toBeCalledWith('run', ['some', 'test'], {
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: '' }
    })
    expect(pipeSpy).toBeCalled()
    expect(res).toBe(undefined)
  })

  it('it should be called with proper params #2', async () => {
    const spawnSpy = jest.spyOn(childProcess, 'spawn')
    const pipeSpy = jest.spyOn(spawnMock.stderr, 'pipe')
    spawnMock.on.mockImplementation((_: string, cb: (code: number) => void) => {
      cb(0)
    })

    const res = await execUtils.exec(process.cwd(), 'run', ['some', 'test'], {
      env: { someKey: '1' }
    })

    expect(spawnSpy).toBeCalledWith('run', ['some', 'test'], {
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: '', someKey: '1' }
    })
    expect(pipeSpy).toBeCalled()
    expect(res).toBe(undefined)
  })

  it('it should be silent', async () => {
    const spawnSpy = jest.spyOn(childProcess, 'spawn')
    const pipeSpy = jest.spyOn(spawnMock.stderr, 'pipe')
    spawnMock.on.mockImplementation((_: string, cb: (code: number) => void) => {
      cb(0)
    })

    const res = await execUtils.exec(process.cwd(), 'run', ['some', 'test'], {
      env: { someKey: '1' },
      silent: true
    })

    expect(spawnSpy).toBeCalledWith('run', ['some', 'test'], {
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: '', someKey: '1' }
    })
    expect(pipeSpy).not.toBeCalled()
    expect(res).toBe(undefined)
  })

  it('it should resolve when compiler starts waching files', async () => {
    const spawnSpy = jest.spyOn(childProcess, 'spawn')
    spawnMock.stdout.on.mockImplementationOnce((_: string, cb: (data: any) => void) => {
      cb('The compiler is watching file changes...')
    })

    const res = await execUtils.exec(process.cwd(), 'run', ['some', 'test'], {
      env: { someKey: '1' },
      silent: true
    })

    expect(spawnSpy).toBeCalledWith('run', ['some', 'test'], {
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: '', someKey: '1' }
    })
    expect(res).toBeUndefined()
  })

  it('it should throw when returned code is not "0"', async () => {
    const spawnSpy = jest.spyOn(childProcess, 'spawn')
    spawnMock.on.mockImplementation((_: string, cb: (code: number) => void) => {
      cb(1)
    })

    let error

    try {
      await execUtils.exec(process.cwd(), 'run', ['some', 'test'], {
        env: { someKey: '1' },
        silent: true
      })
    } catch (e) {
      error = e
    }

    expect(spawnSpy).toBeCalledWith('run', ['some', 'test'], {
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: '', someKey: '1' }
    })
    expect(error).toBeInstanceOf(Error)
  })
})
