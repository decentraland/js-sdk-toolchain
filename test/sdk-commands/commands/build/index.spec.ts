import * as projectValidation from '../../../../packages/@dcl/sdk-commands/src/logic/project-validations'
import * as dclCompiler from '../../../../packages/@dcl/sdk-commands/src/logic/bundle'
import * as build from '../../../../packages/@dcl/sdk-commands/src/commands/build/index'
import { initComponents } from '../../../../packages/@dcl/sdk-commands/src/components'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})
describe('build command', () => {
  it('should install dependencies if needed', async () => {
    const components = await initComponents()
    jest
      .spyOn(projectValidation, 'assertValidProjectFolder')
      .mockResolvedValue({ kind: 'scene', scene: {} as any, workingDirectory: process.cwd() })

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
    jest
      .spyOn(projectValidation, 'assertValidProjectFolder')
      .mockResolvedValue({ kind: 'scene', scene: {} as any, workingDirectory: process.cwd() })

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
    jest
      .spyOn(projectValidation, 'assertValidProjectFolder')
      .mockResolvedValue({ kind: 'scene', scene: {} as any, workingDirectory: process.cwd() })

    const needsDependenciesSpy = jest.spyOn(projectValidation, 'needsDependencies').mockResolvedValue(true)

    const installDependenciesSpy = jest.spyOn(projectValidation, 'installDependencies').mockRejectedValue(undefined)

    try {
      await build.main({ args: { _: [], '--skip-install': true }, components })
    } catch (_) {}
    expect(needsDependenciesSpy).not.toBeCalled()
    expect(installDependenciesSpy).not.toBeCalled()
  })

  it('should build typescript if all conditions are met', async () => {
    const components = await initComponents()
    jest
      .spyOn(projectValidation, 'assertValidProjectFolder')
      .mockResolvedValue({ kind: 'scene', scene: {} as any, workingDirectory: process.cwd() })
    jest.spyOn(projectValidation, 'needsDependencies').mockResolvedValue(false)
    const sceneJson = { scene: { base: '0,0' } } as any
    const tsBuildSpy = jest.spyOn(dclCompiler, 'bundleProject').mockResolvedValue({ sceneJson, inputs: [] })

    await build.main({
      args: { _: [], '--watch': false, '--production': true },
      components
    })

    expect(tsBuildSpy).toBeCalledWith(
      components,
      {
        workingDirectory: process.cwd(),
        emitDeclaration: false,
        watch: false,
        single: undefined,
        production: true,
        customEntryPoint: false,
        ignoreComposite: false
      },
      expect.anything() /* workspace */
    )
  })
})
