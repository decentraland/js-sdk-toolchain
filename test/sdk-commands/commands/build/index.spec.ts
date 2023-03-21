import * as projectValidation from '../../../../packages/@dcl/sdk-commands/src/logic/project-validations'
import * as filesValidation from '../../../../packages/@dcl/sdk-commands/src/logic/scene-validations'
import * as dclCompiler from '../../../../packages/@dcl/dcl-rollup/compile'
import * as build from '../../../../packages/@dcl/sdk-commands/src/commands/build/index'
import { initComponents } from '../../../../packages/@dcl/sdk-commands/src/components'

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

  it('should install dependencies if needed', async () => {
    const components = await initComponents()
    jest.spyOn(projectValidation, 'assertValidProjectFolder').mockResolvedValue({ scene: {} as any })

    const needsDependenciesSpy = jest.spyOn(projectValidation, 'needsDependencies').mockResolvedValue(true)
    const installDependenciesSpy = jest.spyOn(projectValidation, 'installDependencies').mockRejectedValue(undefined)

    try {
      await build.main({ args: { _: [] }, components })
    } catch (_) {}

    expect(needsDependenciesSpy).toBeCalledWith(components, process.cwd())
    expect(installDependenciesSpy).toBeCalledWith(components, process.cwd())
  })

  it('should avoid installing dependencies if not needed', async () => {
    const components = await initComponents()
    jest.spyOn(projectValidation, 'assertValidProjectFolder').mockResolvedValue({ scene: {} as any })

    const needsDependenciesSpy = jest.spyOn(projectValidation, 'needsDependencies').mockResolvedValue(false)
    const installDependenciesSpy = jest.spyOn(projectValidation, 'installDependencies').mockRejectedValue(undefined)

    try {
      await build.main({ args: { _: [] }, components })
    } catch (_) {}

    expect(needsDependenciesSpy).toBeCalledWith(components, process.cwd())
    expect(installDependenciesSpy).not.toBeCalled()
  })

  it('should avoid installing dependencies if "--skip-install" is provided', async () => {
    const components = await initComponents()
    jest.spyOn(projectValidation, 'assertValidProjectFolder').mockResolvedValue({ scene: {} as any })

    const needsDependenciesSpy = jest.spyOn(projectValidation, 'needsDependencies').mockResolvedValue(true)

    const installDependenciesSpy = jest.spyOn(projectValidation, 'installDependencies').mockRejectedValue(undefined)

    try {
      await build.main({ args: { _: [], '--skip-install': true }, components })
    } catch (_) {}
    expect(needsDependenciesSpy).toBeCalledWith(components, process.cwd())
    expect(installDependenciesSpy).not.toBeCalled()
  })

  it('should build typescript if all conditions are met', async () => {
    const components = await initComponents()
    jest.spyOn(projectValidation, 'assertValidProjectFolder').mockResolvedValue({ scene: {} as any })
    jest.spyOn(projectValidation, 'needsDependencies').mockResolvedValue(false)
    jest.spyOn(filesValidation, 'getValidSceneJson').mockResolvedValue({ scene: { base: '0,0' } } as any)
    const tsBuildSpy = jest.spyOn(dclCompiler, 'compile').mockResolvedValue(null as any)

    await build.main({
      args: { _: [], '--watch': false, '--production': true },
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
