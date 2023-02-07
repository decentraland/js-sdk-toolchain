import { CliError } from '../../../../../packages/@dcl/sdk/cli/utils/error'
import * as helpers from '../../../../../packages/@dcl/sdk/cli/commands/build/helpers'
import * as dclCompiler from '../../../../../packages/@dcl/dcl-rollup/compile'
import * as build from '../../../../../packages/@dcl/sdk/cli/commands/build/index'
import { initComponents } from '../../../../../packages/@dcl/sdk/cli/components'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

const components = initComponents()

describe('build command', () => {
  it('help: return void', () => {
    const helpSpy = jest.spyOn(build, 'help')

    const res = build.help()

    expect(res).toStrictEqual(expect.any(String))
    expect(helpSpy).toBeCalled()
  })

  it('should throw if project has invalid structure', async () => {
    const projectValidatorSpy = jest.spyOn(helpers, 'validateProjectStructure').mockResolvedValue(false)

    const projectStructure = helpers.getProjectStructure()

    try {
      await build.main({ args: {}, components })
    } catch (e) {
      expect(projectValidatorSpy).toBeCalledWith(components, process.cwd(), projectStructure)
      expect(e).toBeInstanceOf(CliError)
    }
  })

  it('should throw if project has invalid "package.json" file', async () => {
    jest.spyOn(helpers, 'validateProjectStructure').mockResolvedValue(true)
    const packageJsonValidatorSpy = jest.spyOn(helpers, 'validatePackageJson').mockResolvedValue(false)

    try {
      await build.main({ args: {}, components })
    } catch (e) {
      expect(packageJsonValidatorSpy).toBeCalledWith(components, process.cwd(), helpers.REQUIRED_PACKAGE_JSON)
      expect(e).toBeInstanceOf(CliError)
    }
  })

  it('should install dependencies if needed', async () => {
    jest.spyOn(helpers, 'validateProjectStructure').mockResolvedValue(true)
    jest.spyOn(helpers, 'validatePackageJson').mockResolvedValue(true)

    const needsDependenciesSpy = jest.spyOn(helpers, 'needsDependencies').mockResolvedValue(true)
    const installDependenciesSpy = jest.spyOn(helpers, 'installDependencies').mockRejectedValue(undefined)

    try {
      await build.main({ args: {}, components })
    } catch (_) {}

    expect(needsDependenciesSpy).toBeCalledWith(components, process.cwd())
    expect(installDependenciesSpy).toBeCalledWith(process.cwd())
  })

  it('should avoid installing dependencies if not needed', async () => {
    jest.spyOn(helpers, 'validateProjectStructure').mockResolvedValue(true)
    jest.spyOn(helpers, 'validatePackageJson').mockResolvedValue(true)

    const needsDependenciesSpy = jest.spyOn(helpers, 'needsDependencies').mockResolvedValue(false)

    const installDependenciesSpy = jest.spyOn(helpers, 'installDependencies').mockRejectedValue(undefined)

    try {
      await build.main({ args: {}, components })
    } catch (_) {}

    expect(needsDependenciesSpy).toBeCalledWith(components, process.cwd())
    expect(installDependenciesSpy).not.toBeCalled()
  })

  it('should avoid installing dependencies if "--skip-install" is provided', async () => {
    jest.spyOn(helpers, 'validateProjectStructure').mockResolvedValue(true)
    jest.spyOn(helpers, 'validatePackageJson').mockResolvedValue(true)

    const needsDependenciesSpy = jest.spyOn(helpers, 'needsDependencies').mockResolvedValue(true)

    const installDependenciesSpy = jest.spyOn(helpers, 'installDependencies').mockRejectedValue(undefined)

    try {
      await build.main({ args: { '--skip-install': true }, components })
    } catch (_) {}
    expect(needsDependenciesSpy).toBeCalledWith(components, process.cwd())
    expect(installDependenciesSpy).not.toBeCalled()
  })

  it('should build typescript if all conditions are met', async () => {
    jest.spyOn(helpers, 'validateProjectStructure').mockResolvedValue(true)
    jest.spyOn(helpers, 'validatePackageJson').mockResolvedValue(true)
    jest.spyOn(helpers, 'needsDependencies').mockResolvedValue(false)

    const tsBuildSpy = jest.spyOn(dclCompiler, 'compile').mockResolvedValue(null as any)

    await build.main({
      args: { '--watch': false, '--production': true },
      components
    })

    expect(tsBuildSpy).toBeCalledWith({
      project: process.cwd(),
      watch: false,
      production: true,
      watchingFuture: expect.anything()
    })
  })
})
