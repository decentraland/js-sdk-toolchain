/// <reference types="node" />

import * as execUtils from '../../../packages/@dcl/sdk-commands/src/logic/exec'

describe('utils/exec', () => {
  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  it('it should be called with proper params #1', async () => {
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
    const spawnSpy = jest.fn(() => spawnMock as any)
    const component = execUtils.createProcessSpawnerComponent(spawnSpy)
    const pipeSpy = jest.spyOn(spawnMock.stderr, 'pipe')
    spawnMock.on.mockImplementation((_: string, cb: (code: number) => void) => {
      cb(0)
    })

    const res = await component.exec(process.cwd(), 'run', ['some', 'test'])

    expect(spawnSpy).toHaveBeenCalledWith('run', ['some', 'test'], {
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: '' }
    })
    expect(pipeSpy).toHaveBeenCalled()
    expect(res).toBe(undefined)
  })

  it('it should be called with proper params #2', async () => {
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
    const spawnSpy = jest.fn(() => spawnMock as any)
    const component = execUtils.createProcessSpawnerComponent(spawnSpy)
    const pipeSpy = jest.spyOn(spawnMock.stderr, 'pipe')
    spawnMock.on.mockImplementation((_: string, cb: (code: number) => void) => {
      cb(0)
    })

    const res = await component.exec(process.cwd(), 'run', ['some', 'test'], {
      env: { someKey: '1' }
    })

    expect(spawnSpy).toHaveBeenCalledWith('run', ['some', 'test'], {
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: '', someKey: '1' }
    })
    expect(pipeSpy).toHaveBeenCalled()
    expect(res).toBe(undefined)
  })

  it('it should be silent', async () => {
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
    const spawnSpy = jest.fn(() => spawnMock as any)
    const component = execUtils.createProcessSpawnerComponent(spawnSpy)
    const pipeSpy = jest.spyOn(spawnMock.stderr, 'pipe')
    spawnMock.on.mockImplementation((_: string, cb: (code: number) => void) => {
      cb(0)
    })

    const res = await component.exec(process.cwd(), 'run', ['some', 'test'], {
      env: { someKey: '1' },
      silent: true
    })

    expect(spawnSpy).toHaveBeenCalledWith('run', ['some', 'test'], {
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: '', someKey: '1' }
    })
    expect(pipeSpy).not.toHaveBeenCalled()
    expect(res).toBe(undefined)
  })

  it('it should throw when returned code is not "0"', async () => {
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
    const spawnSpy = jest.fn(() => spawnMock as any)
    const component = execUtils.createProcessSpawnerComponent(spawnSpy)
    spawnMock.on.mockImplementation((_: string, cb: (code: number) => void) => {
      cb(1)
    })

    let error

    try {
      await component.exec(process.cwd(), 'run', ['some', 'test'], {
        env: { someKey: '1' },
        silent: true
      })
    } catch (e) {
      error = e
    }

    expect(spawnSpy).toHaveBeenCalledWith('run', ['some', 'test'], {
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: '', someKey: '1' }
    })
    expect(error).toBeInstanceOf(Error)
  })
})
