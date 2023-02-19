import { resolve } from 'path'

import { CliError } from '../../../packages/@dcl/sdk-commands/src/logic/error'
import * as commands from '../../../packages/@dcl/sdk-commands/src/logic/commands'
import { initComponents } from '../../../packages/@dcl/sdk-commands/src/components'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

const components = initComponents()

describe('utils/commands', () => {
  it('should read commands from the defined commands path', async () => {
    const readDirSpy = jest.spyOn(components.fs, 'readdir').mockResolvedValue(['test'] as any)
    const stat = {
      isDirectory: jest.fn(() => true),
      isFile: jest.fn(() => true)
    }
    const statSpy = jest.spyOn(components.fs, 'stat').mockResolvedValue(stat as any)

    await commands.getCommands(components)

    expect(readDirSpy).toBeCalledWith(commands.COMMANDS_PATH)
    expect(statSpy).toBeCalledWith(resolve(commands.COMMANDS_PATH, 'test'))
    expect(statSpy).toBeCalledWith(resolve(commands.COMMANDS_PATH, 'test', 'index.js'))
    expect(stat.isDirectory).toBeCalled()
    expect(stat.isFile).toBeCalled()
  })

  it('should throw if command is not inside a folder', async () => {
    const readDirSpy = jest.spyOn(components.fs, 'readdir').mockResolvedValue(['command1'] as any)
    const stat = {
      isDirectory: jest.fn(() => false),
      isFile: jest.fn(() => true)
    }
    jest.spyOn(components.fs, 'stat').mockResolvedValue(stat as any)

    let error

    try {
      await commands.getCommands(components)
    } catch (e) {
      error = e
    }
    expect(readDirSpy).toBeCalled()
    expect(stat.isDirectory).toBeCalled()
    expect(error).toBeInstanceOf(CliError)
  })

  it('should throw if command does not have an "index.ts"', async () => {
    const readDirSpy = jest.spyOn(components.fs, 'readdir').mockResolvedValue(['command'] as any)
    const stat = {
      isDirectory: jest.fn(() => true),
      isFile: jest.fn(() => false)
    }
    jest.spyOn(components.fs, 'stat').mockResolvedValue(stat as any)

    let error

    try {
      await commands.getCommands(components)
    } catch (e) {
      error = e
    }

    expect(readDirSpy).toBeCalled()
    expect(stat.isDirectory).toBeCalled()
    expect(stat.isFile).toBeCalled()
    expect(error).toBeInstanceOf(CliError)
  })

  it('should return all the commands in the directory', async () => {
    jest.spyOn(components.fs, 'readdir').mockResolvedValue(['command1', 'command2'] as any)
    const stat = {
      isDirectory: jest.fn(() => true),
      isFile: jest.fn(() => true)
    }
    jest.spyOn(components.fs, 'stat').mockResolvedValue(stat as any)

    const res = await commands.getCommands(components)

    expect(res).toStrictEqual(['command1', 'command2'])
  })
})
