import * as fsUtils from '../../../../packages/@dcl/sdk-commands/src/logic/fs'
import * as init from '../../../../packages/@dcl/sdk-commands/src/commands/init/index'
import { initComponents } from '../../../../packages/@dcl/sdk-commands/src/components'
import * as projectValidations from '../../../../packages/@dcl/sdk-commands/src/logic/project-validations'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('init command', () => {
  beforeEach(() => {
    jest.spyOn(projectValidations, 'needsDependencies').mockResolvedValue(true)
  })

  it('main: should throw if directory is not empty and no bypass arg is provided', async () => {
    const downloadSpy = jest.spyOn(fsUtils, 'download')
    const extractSpy = jest.spyOn(fsUtils, 'extract')
    const installDependenciesSpy = jest.spyOn(projectValidations, 'installDependencies').mockRejectedValue(undefined)

    const components = await initComponents()

    await expect(() => init.main({ args: { _: [] }, components })).rejects.toThrow()

    expect(downloadSpy).not.toBeCalled()
    expect(extractSpy).not.toBeCalled()
    expect(installDependenciesSpy).not.toBeCalled()
  })

  it('main: should download & extract if directory is not empty and "--yes" arg is provided', async () => {
    const components = await initComponents()
    const downloadSpy = jest.spyOn(fsUtils, 'download').mockImplementation()
    const extractSpy = jest
      .spyOn(fsUtils, 'extract')
      .mockImplementation(async (_, destPath) => ({ destPath, topLevelFolders: ['test'] }))
    const removeSpy = jest.spyOn(components.fs, 'unlink').mockImplementation()
    jest.spyOn(components.fs, 'readdir').mockResolvedValue(['test'])
    jest.spyOn(components.fs, 'rename').mockImplementation()
    jest.spyOn(components.fs, 'rmdir').mockImplementation()
    const installDependenciesSpy = jest.spyOn(projectValidations, 'installDependencies').mockResolvedValue(undefined)
    await init.main({ args: { _: [], '--yes': true }, components })

    expect(downloadSpy).toBeCalled()
    expect(extractSpy).toBeCalled()
    expect(removeSpy).toBeCalled()
    expect(installDependenciesSpy).toBeCalled()
  })

  it('main: should move files out of dirs', async () => {
    const components = await initComponents()
    const downloadSpy = jest.spyOn(fsUtils, 'download').mockImplementation()
    const extractSpy = jest
      .spyOn(fsUtils, 'extract')
      .mockImplementation(async (_, destPath) => ({ destPath, topLevelFolders: ['test'] }))
    const removeSpy = jest.spyOn(components.fs, 'unlink').mockImplementation()
    const readdirSpy = jest.spyOn(components.fs, 'readdir').mockResolvedValue(['test'])
    const renameSpy = jest.spyOn(components.fs, 'rename').mockImplementation()
    const rmdirSpy = jest.spyOn(components.fs, 'rmdir').mockImplementation()

    await init.main({ args: { _: [], '--yes': true, '--skip-install': true }, components })

    expect(downloadSpy).toBeCalled()
    expect(extractSpy).toBeCalled()
    expect(removeSpy).toBeCalled()
    expect(readdirSpy).toBeCalled()
    expect(renameSpy).toBeCalled()
    expect(rmdirSpy).toBeCalled()
  })

  it('main: should throw if something wrong happens', async () => {
    jest.spyOn(fsUtils, 'download').mockImplementation(() => {
      throw new Error()
    })

    const components = await initComponents()

    await expect(() =>
      init.main({ args: { _: [], '--yes': true, '--skip-install': true }, components })
    ).rejects.toThrow()
  })
})
