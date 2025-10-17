import path from 'path'
import Module from 'module'
import i18next from 'i18next'
import { IEngine } from '@dcl/ecs'
import { CliComponents } from '../../components'
import { SceneProject } from '../../logic/project-validations'
import { CliError } from '../../logic/error'
import { bundleProject } from '../../logic/bundle'

/**
 * Mocks for ~system/* modules that are marked as external in the bundle.
 * These are runtime-specific modules that don't exist in Node.js.
 */
function createSystemModuleMock(moduleId: string) {
  if (moduleId === '~system/EngineApi') {
    return {
      crdtSendToRenderer: () => {},
      crdtGetState: async () => ({ hasEntities: false, data: [] }),
      sendBatch: () => {},
      subscribe: () => {},
      unsubscribe: () => {},
      isServer: () => false
    }
  }

  return {}
}

/**
 * Sets up a require hook to mock ~system/* modules during bundle execution.
 * Returns a function to restore the original require.
 */
function setupRequireHook(): () => void {
  const originalRequire = Module.prototype.require

  Module.prototype.require = function (this: Module, id: string) {
    if (id.startsWith('~system/')) {
      return createSystemModuleMock(id)
    }
    return originalRequire.apply(this, [id])
  } as any

  return () => {
    Module.prototype.require = originalRequire
  }
}

/**
 * Modifies the bundle code to export the engine instance.
 * The bundle creates a local `engine` variable but doesn't export it,
 * so we inject code to make it available via module.exports.
 */
function injectEngineExport(bundleCode: string): string {
  return bundleCode.replace(
    /var engine = (.*?Engine\(\));/,
    'var engine = $1; if (typeof module !== "undefined" && module.exports) { module.exports.engine = engine; }'
  )
}

/**
 * Loads and executes the scene bundle, returning the engine instance.
 */
async function loadAndExecuteBundle(bundlePath: string): Promise<IEngine> {
  delete require.cache[require.resolve(bundlePath)]
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sceneModule = require(bundlePath)

  if (typeof sceneModule.main === 'function') {
    const result = sceneModule.main()
    if (result && typeof result.then === 'function') {
      await result
    }
  }

  const engine: IEngine = sceneModule.engine
  if (!engine) {
    throw new CliError('CODE_TO_COMPOSITE_NO_ENGINE', i18next.t('errors.code_to_composite.no_engine'))
  }

  return engine
}

/**
 * Executes the scene's TypeScript code and returns the populated ECS engine.
 *
 * This works by:
 * 1. Building the scene to generate the bundled scene code
 * 2. Modifying the bundle to export the engine instance
 * 3. Loading and executing the bundle with mocked ~system/* modules
 * 4. Running the main() function to populate the engine
 * 5. Returning the engine with all entities and components
 */
export async function executeSceneCode(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  project: SceneProject
): Promise<IEngine> {
  const { fs, logger } = components
  logger.log('Building scene...')

  try {
    await bundleProject(
      components,
      {
        workingDirectory: project.workingDirectory,
        watch: false,
        production: false, // keep source maps for better error messages
        emitDeclaration: false,
        ignoreComposite: true, // don't load existing composite files
        customEntryPoint: false
      },
      project.scene
    )
  } catch (err: any) {
    throw new CliError(
      'CODE_TO_COMPOSITE_BUILD_FAILED',
      i18next.t('errors.code_to_composite.build_failed', { error: err.message })
    )
  }

  const bundlePath = path.join(project.workingDirectory, project.scene.main)
  if (!(await fs.fileExists(bundlePath))) {
    throw new CliError(
      'CODE_TO_COMPOSITE_BUNDLE_NOT_FOUND',
      i18next.t('errors.code_to_composite.bundle_not_found', { bundlePath })
    )
  }

  logger.log('Executing scene code to capture engine state...')

  const bundleCode = await fs.readFile(bundlePath, 'utf-8')
  const tempBundlePath = bundlePath + '.temp.js'
  const modifiedCode = injectEngineExport(bundleCode)
  const restoreRequire = setupRequireHook()

  try {
    await fs.writeFile(tempBundlePath, modifiedCode)
    return await loadAndExecuteBundle(tempBundlePath)
  } catch (err: any) {
    throw new CliError(
      'CODE_TO_COMPOSITE_EXECUTION_FAILED',
      i18next.t('errors.code_to_composite.execution_failed', { error: `${err.message}\n${err.stack || ''}` })
    )
  } finally {
    // cleanup: restore original require and delete temp file
    restoreRequire()
    await fs.rm(tempBundlePath, { force: true })
  }
}
