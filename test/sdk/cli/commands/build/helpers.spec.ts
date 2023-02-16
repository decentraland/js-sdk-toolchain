import * as helpers from '../../../../../packages/@dcl/sdk/cli/commands/build/helpers'
import * as execUtils from '../../../../../packages/@dcl/sdk/cli/utils/exec'
import { initComponents } from '../../../../../packages/@dcl/sdk/cli/components'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

const components = initComponents()

describe('build:helpers', () => {
  it('validateProjectStructure: should return true if provided list of files is inside the dir', async () => {
    jest.spyOn(components.fs, 'readdir').mockResolvedValue(['a', 'file'])
    jest.spyOn(helpers, 'validateProjectStructure')

    const res = await helpers.validateProjectStructure(components, 'some/path', ['a', 'file'])

    expect(res).toBe(true)
  })

  it('validateProjectStructure: should return false if provided list of files is not inside the dir', async () => {
    jest.spyOn(components.fs, 'readdir').mockResolvedValue(['a', 'file'])
    jest.spyOn(helpers, 'validateProjectStructure')

    const res = await helpers.validateProjectStructure(components, 'some/path', ['a', 'file', 'new-file'])

    expect(res).toBe(false)
  })

  it('validatePackageJson: should return true if "package.json" has valid structure', async () => {
    const structure = { test: 1 }
    jest.spyOn(components.fs, 'readFile').mockResolvedValue(JSON.stringify(structure))

    const res = await helpers.validatePackageJson(components, 'some/path', structure)

    expect(res).toBe(true)
  })

  it('validatePackageJson: should return false if "package.json" has invalid structure', async () => {
    const structure = { test: 1 }
    jest.spyOn(components.fs, 'readFile').mockResolvedValue(JSON.stringify(structure))

    const res = await helpers.validatePackageJson(components, 'some/path', { fail: 1 })

    expect(res).toBe(false)
  })

  it('needsDependencies: should return true if "node_modules" does not exist', async () => {
    jest.spyOn(components.fs, 'directoryExists').mockResolvedValue(false)

    const res = await helpers.needsDependencies(components, 'some/path')

    expect(res).toBe(true)
  })

  it('needsDependencies: should return true if "node_modules" is empty', async () => {
    jest.spyOn(components.fs, 'directoryExists').mockResolvedValue(true)
    jest.spyOn(components.fs, 'readdir').mockResolvedValue([])

    const res = await helpers.needsDependencies(components, 'some/path')

    expect(res).toBe(true)
  })

  it('needsDependencies: should return false if "node_modules" is valid', async () => {
    jest.spyOn(components.fs, 'directoryExists').mockResolvedValue(true)
    jest.spyOn(components.fs, 'readdir').mockResolvedValue(['some', 'files'])

    const res = await helpers.needsDependencies(components, 'some/path')

    expect(res).toBe(false)
  })

  it('installDependencies: should run dependencies installation', async () => {
    const execSpy = jest.spyOn(execUtils, 'exec').mockResolvedValue()

    await helpers.installDependencies('some/path')

    expect(execSpy).toBeCalledWith('some/path', 'npm', ['install'])
  })

  it('npmRun: should build pass on the process.env', async () => {
    const execSpy = jest.spyOn(execUtils, 'exec').mockResolvedValue()

    await helpers.npmRun('some/path', 'build', 'a')

    expect(execSpy).toBeCalledWith('some/path', 'npm', ['run', 'build', '--silent', '--', 'a'], {
      env: process.env
    })
  })
})
