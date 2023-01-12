import { resolve } from 'path'

import { CliError } from '../../../../packages/@dcl/sdk/cli/utils/error'
import * as commands from '../../../../packages/@dcl/sdk/cli/utils/commands'
import * as fsUtils from '../../../../packages/@dcl/sdk/cli/utils/fs'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('utils/commands', () => {
  it('should read commands from the defined commands path', async () => {
    const readDirSpy = jest
      .spyOn(fsUtils, 'readdir')
      .mockResolvedValue(['test'])
    const isDirSpy = jest.spyOn(fsUtils, 'isDirectory').mockResolvedValue(true)
    const isFileSpy = jest.spyOn(fsUtils, 'isFile').mockResolvedValue(true)

    await commands.getCommands()

    expect(readDirSpy).toBeCalledWith(commands.COMMANDS_PATH)
    expect(isDirSpy).toBeCalledWith(resolve(commands.COMMANDS_PATH, 'test'))
    expect(isFileSpy).toBeCalledWith(
      resolve(commands.COMMANDS_PATH, 'test', 'index.js')
    )
  })

  it('should throw if command is not inside a folder', async () => {
    const readDirSpy = jest
      .spyOn(fsUtils, 'readdir')
      .mockResolvedValue(['command1'])
    const isDirSpy = jest.spyOn(fsUtils, 'isDirectory')

    try {
      await commands.getCommands()
    } catch (e) {
      expect(e).toBeInstanceOf(CliError)
    }

    expect(readDirSpy).toBeCalled()
    expect(isDirSpy).toBeCalled()
    expect(isDirSpy).toReturn()
  })

  it('should throw if command does not have an "index.ts"', async () => {
    const readDirSpy = jest
      .spyOn(fsUtils, 'readdir')
      .mockResolvedValue(['command'])
    const isDirSpy = jest.spyOn(fsUtils, 'isDirectory').mockResolvedValue(true)
    const isFileSpy = jest.spyOn(fsUtils, 'isFile')

    try {
      await commands.getCommands()
    } catch (e) {
      expect(e).toBeInstanceOf(CliError)
    }

    expect(readDirSpy).toBeCalled()
    expect(isDirSpy).toBeCalled()
    expect(isFileSpy).toBeCalled()
  })

  it('should return all the commands in the directory', async () => {
    jest.spyOn(fsUtils, 'readdir').mockResolvedValue(['command1', 'command2'])
    jest.spyOn(fsUtils, 'isDirectory').mockResolvedValue(true)
    jest.spyOn(fsUtils, 'isFile').mockResolvedValue(true)

    const res = await commands.getCommands()

    expect(res).toStrictEqual(['command1', 'command2'])
  })
})
