import { CliError } from '../../../../../packages/@dcl/sdk/cli/utils/error'
import * as helpers from '../../../../../packages/@dcl/sdk/cli/commands/build/helpers'
import * as build from '../../../../../packages/@dcl/sdk/cli/commands/build/index'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('build command', () => {
  it('help: return void', () => {
    const helpSpy = jest.spyOn(build, 'help')

    const res = build.help()

    expect(res).toStrictEqual(expect.any(String))
    expect(helpSpy).toBeCalled()
  })

  it('should throw if project has invalid structure', async () => {
    const projectValidatorSpy = jest
      .spyOn(helpers, 'validateProjectStructure')
      .mockResolvedValue(false)

    const projectStructure = helpers.getProjectStructure()

    try {
      await build.main({ args: {} })
    } catch (e) {
      expect(projectValidatorSpy).toBeCalledWith(
        process.cwd(),
        projectStructure
      )
      expect(e).toBeInstanceOf(CliError)
    }
  })

  it('should throw if project has invalid "package.json" file', async () => {
    jest.spyOn(helpers, 'validateProjectStructure').mockResolvedValue(true)
    const packageJsonValidatorSpy = jest
      .spyOn(helpers, 'validatePackageJson')
      .mockResolvedValue(false)

    try {
      await build.main({ args: {} })
    } catch (e) {
      expect(packageJsonValidatorSpy).toBeCalledWith(
        process.cwd(),
        helpers.REQUIRED_PACKAGE_JSON
      )
      expect(e).toBeInstanceOf(CliError)
    }
  })

  it('should install dependencies if needed', async () => {
    jest.spyOn(helpers, 'validateProjectStructure').mockResolvedValue(true)
    jest.spyOn(helpers, 'validatePackageJson').mockResolvedValue(true)

    const needsDependenciesSpy = jest
      .spyOn(helpers, 'needsDependencies')
      .mockResolvedValue(true)

    const installDependenciesSpy = jest
      .spyOn(helpers, 'installDependencies')
      .mockRejectedValue(undefined)

    try {
      await build.main({ args: {} })
    } catch (_) {
      expect(needsDependenciesSpy).toBeCalledWith(process.cwd())
      expect(installDependenciesSpy).toBeCalledWith(process.cwd())
    }
  })

  it('should avoid installing dependencies if not needed', async () => {
    jest.spyOn(helpers, 'validateProjectStructure').mockResolvedValue(true)
    jest.spyOn(helpers, 'validatePackageJson').mockResolvedValue(true)

    const needsDependenciesSpy = jest
      .spyOn(helpers, 'needsDependencies')
      .mockResolvedValue(false)

    const installDependenciesSpy = jest
      .spyOn(helpers, 'installDependencies')
      .mockRejectedValue(undefined)

    try {
      await build.main({ args: {} })
    } catch (_) {
      expect(needsDependenciesSpy).toBeCalledWith(process.cwd())
      expect(installDependenciesSpy).not.toBeCalled()
    }
  })

  it('should avoid installing dependencies if "--skip-install" is provided', async () => {
    jest.spyOn(helpers, 'validateProjectStructure').mockResolvedValue(true)
    jest.spyOn(helpers, 'validatePackageJson').mockResolvedValue(true)

    const needsDependenciesSpy = jest
      .spyOn(helpers, 'needsDependencies')
      .mockResolvedValue(true)

    const installDependenciesSpy = jest
      .spyOn(helpers, 'installDependencies')
      .mockRejectedValue(undefined)

    try {
      await build.main({ args: { '--skip-install': true } })
    } catch (_) {
      expect(needsDependenciesSpy).toBeCalledWith(process.cwd())
      expect(installDependenciesSpy).not.toBeCalled()
    }
  })

  it('should build typescript if all conditions are met', async () => {
    jest.spyOn(helpers, 'validateProjectStructure').mockResolvedValue(true)
    jest.spyOn(helpers, 'validatePackageJson').mockResolvedValue(true)
    jest.spyOn(helpers, 'needsDependencies').mockResolvedValue(false)

    const tsBuildSpy = jest
      .spyOn(helpers, 'buildTypescript')
      .mockResolvedValue()

    await build.main({ args: { '--watch': true, '--production': true } })
    expect(tsBuildSpy).toBeCalledWith({
      dir: process.cwd(),
      watch: true,
      production: true
    })
  })
})
