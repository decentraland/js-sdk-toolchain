import * as projectValidation from '../../../../packages/@dcl/sdk-commands/src/logic/project-validations'
import * as dclCompiler from '../../../../packages/@dcl/sdk-commands/src/logic/bundle'
import * as build from '../../../../packages/@dcl/sdk-commands/src/commands/build/index'
import { initComponents } from '../../../../packages/@dcl/sdk-commands/src/components'
import {
  getScriptImportName,
  generateInitializeScriptsModule
} from '../../../../packages/@dcl/sdk-commands/src/logic/bundle'
import { createFsComponent } from '../../../../packages/@dcl/sdk-commands/src/components/fs'

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

describe('bundle script utilities', () => {
  describe('getScriptImportName', () => {
    it('should sanitize script paths into valid import names', () => {
      expect(getScriptImportName('src/scripts/my-script.ts')).toBe('script_src_scripts_my_script')
      expect(getScriptImportName('scripts/movePlayer.tsx')).toBe('script_scripts_movePlayer')
      expect(getScriptImportName('custom/path/to/script.ts')).toBe('script_custom_path_to_script')
    })

    it('should handle special characters in paths', () => {
      expect(getScriptImportName('scripts/my-special@script.ts')).toBe('script_scripts_my_special_script')
      expect(getScriptImportName('scripts/script#1.ts')).toBe('script_scripts_script_1')
      expect(getScriptImportName('scripts/script$name.ts')).toBe('script_scripts_script_name')
    })

    it('should remove .ts and .tsx extensions', () => {
      expect(getScriptImportName('scripts/test.ts')).toBe('script_scripts_test')
      expect(getScriptImportName('scripts/test.tsx')).toBe('script_scripts_test')
    })
  })

  describe('generateInitializeScriptsModule', () => {
    let mockFs: ReturnType<typeof createFsComponent>

    beforeEach(() => {
      mockFs = createFsComponent()
    })

    it('should generate empty initializeScripts when no scripts are found', async () => {
      const compositeData = null

      const result = await generateInitializeScriptsModule(mockFs, '/test/project', compositeData)

      expect(result.contents).toBe(`export function initializeScripts(engine) {}`)
      expect(result.watchFiles).toEqual([])
    })

    it('should generate empty initializeScripts when compositeData has no scripts', async () => {
      const compositeData = {
        scripts: new Map(),
        compositeLines: [],
        watchFiles: [],
        withErrors: false
      }

      const result = await generateInitializeScriptsModule(mockFs, '/test/project', compositeData)

      expect(result.contents).toBe(`export function initializeScripts(engine) {}`)
      expect(result.watchFiles).toEqual([])
    })

    it('should generate initializeScripts with runScripts call when scripts are found', async () => {
      const compositeData = {
        scripts: new Map([
          [
            'src/scripts/test.ts',
            [
              {
                entity: 512,
                path: 'src/scripts/test.ts',
                priority: 0
              }
            ]
          ]
        ]),
        compositeLines: [],
        watchFiles: [],
        withErrors: false
      }

      const result = await generateInitializeScriptsModule(mockFs, '/test/project', compositeData)

      expect(result.contents).toContain("import * as script_src_scripts_test from './src/scripts/test.ts'")
      expect(result.contents).toContain('return runScripts(engine,')
      expect(result.contents).toContain('"path":"src/scripts/test.ts"')
      expect(result.contents).toContain('module: script_src_scripts_test')
      expect(result.watchFiles).toEqual(['/test/project/src/scripts/test.ts'])
    })

    it('should generate imports for multiple scripts', async () => {
      const compositeData = {
        scripts: new Map([
          ['src/scripts/movePlayer.ts', [{ entity: 512, path: 'src/scripts/movePlayer.ts', priority: 0 }]],
          ['src/scripts/rotateBox.ts', [{ entity: 513, path: 'src/scripts/rotateBox.ts', priority: 1 }]]
        ]),
        compositeLines: [],
        watchFiles: [],
        withErrors: false
      }

      const result = await generateInitializeScriptsModule(mockFs, '/test/project', compositeData)

      expect(result.contents).toContain("import * as script_src_scripts_movePlayer from './src/scripts/movePlayer.ts'")
      expect(result.contents).toContain("import * as script_src_scripts_rotateBox from './src/scripts/rotateBox.ts'")
      expect(result.contents).toContain('module: script_src_scripts_movePlayer')
      expect(result.contents).toContain('module: script_src_scripts_rotateBox')
      expect(result.watchFiles).toEqual([
        '/test/project/src/scripts/movePlayer.ts',
        '/test/project/src/scripts/rotateBox.ts'
      ])
    })

    it('should include runtime script code in the generated module', async () => {
      const compositeData = {
        scripts: new Map([['src/scripts/test.ts', [{ entity: 512, path: 'src/scripts/test.ts', priority: 0 }]]]),
        compositeLines: [],
        watchFiles: [],
        withErrors: false
      }

      const result = await generateInitializeScriptsModule(mockFs, '/test/project', compositeData)

      expect(result.contents).toContain('function runScripts(')
      expect(result.contents).toContain('export function initializeScripts(engine)')
    })

    it('should import script only once when used by multiple entities', async () => {
      const compositeData = {
        scripts: new Map([
          [
            'src/scripts/movePlayer.ts',
            [
              { entity: 512, path: 'src/scripts/movePlayer.ts', priority: 0 },
              { entity: 513, path: 'src/scripts/movePlayer.ts', priority: 0 },
              { entity: 514, path: 'src/scripts/movePlayer.ts', priority: 0 }
            ]
          ]
        ]),
        compositeLines: [],
        watchFiles: [],
        withErrors: false
      }

      const result = await generateInitializeScriptsModule(mockFs, '/test/project', compositeData)

      // Count how many times the import statement appears
      const importStatement = "import * as script_src_scripts_movePlayer from './src/scripts/movePlayer.ts'"
      const importCount =
        (result.contents.match(new RegExp(importStatement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length

      // Should only import once
      expect(importCount).toBe(1)

      // But should have 3 script instances in the array
      expect(result.contents.match(/"entity":512/g)?.length).toBe(1)
      expect(result.contents.match(/"entity":513/g)?.length).toBe(1)
      expect(result.contents.match(/"entity":514/g)?.length).toBe(1)

      // All should reference the same module
      const moduleReferenceCount = (result.contents.match(/module: script_src_scripts_movePlayer/g) || []).length
      expect(moduleReferenceCount).toBe(3)

      // Should only watch the file once
      expect(result.watchFiles).toEqual(['/test/project/src/scripts/movePlayer.ts'])
    })
  })
})
