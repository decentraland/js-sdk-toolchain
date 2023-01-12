import * as prompt from '../../../../packages/@dcl/sdk/cli/utils/prompt'
import * as fsUtils from '../../../../packages/@dcl/sdk/cli/utils/fs'
import { CliError } from '../../../../packages/@dcl/sdk/cli/utils/error'
import * as init from '../../../../packages/@dcl/sdk/cli/commands/init/index'
import { initComponents } from '../../../../packages/@dcl/sdk/cli/components'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('init command', () => {
  it('help: return void', async () => {
    const helpSpy = jest.spyOn(init, 'help')

    const res = await init.help()

    expect(res).toBe(undefined)
    expect(helpSpy).toBeCalled()
  })

  it('main: should do nothing if directory is not empty and no bypass arg is provided nor prompt accepted', async () => {
    const confirmSpy = jest.spyOn(prompt, 'confirm').mockResolvedValue(false)
    const downloadSpy = jest.spyOn(fsUtils, 'download')
    const extractSpy = jest.spyOn(fsUtils, 'extract')

    const components = initComponents()

    await init.main({ args: { _: [] }, components })

    expect(confirmSpy).toBeCalled()
    expect(downloadSpy).not.toBeCalled()
    expect(extractSpy).not.toBeCalled()
  })

  it('main: should download & extract if directory is not empty and prompt is accepted', async () => {
    const components = initComponents()
    const confirmSpy = jest.spyOn(prompt, 'confirm').mockResolvedValueOnce(true)
    const downloadSpy = jest.spyOn(fsUtils, 'download').mockResolvedValue('1')
    const extractSpy = jest.spyOn(fsUtils, 'extract').mockImplementation()
    const removeSpy = jest.spyOn(components.fs, 'unlink').mockImplementation()

    await init.main({ args: { _: [] }, components })

    expect(confirmSpy).toBeCalled()
    expect(downloadSpy).toBeCalled()
    expect(extractSpy).toBeCalledWith('1', process.cwd())
    expect(removeSpy).toBeCalledWith('1')
  })

  it('main: should download & extract if directory is not empty and "--yes" arg is provided', async () => {
    const components = initComponents()
    const confirmSpy = jest.spyOn(prompt, 'confirm')
    const downloadSpy = jest.spyOn(fsUtils, 'download').mockImplementation()
    const extractSpy = jest.spyOn(fsUtils, 'extract').mockImplementation()
    const removeSpy = jest.spyOn(components.fs, 'unlink').mockImplementation()

    await init.main({ args: { _: [], '--yes': true }, components })

    expect(confirmSpy).not.toBeCalled()
    expect(downloadSpy).toBeCalled()
    expect(extractSpy).toBeCalled()
    expect(removeSpy).toBeCalled()
  })

  it('main: should throw if something wrong happens', async () => {
    jest.spyOn(fsUtils, 'download').mockImplementation(() => {
      throw new Error()
    })

    const components = initComponents()

    try {
      await init.main({ args: { _: [], '--yes': true }, components })
    } catch (e) {
      expect(e).toBeInstanceOf(CliError)
    }
  })
})
