import path from 'path'
import Module from 'module'
import i18next from 'i18next'
import { IEngine } from '@dcl/ecs'
import { CliComponents } from '../../components'
import { SceneProject } from '../../logic/project-validations'
import { CliError } from '../../logic/error'
import { bundleProject } from '../../logic/bundle'

/**
 * Pre-defined mocks for critical ~system modules.
 */
const CRITICAL_MODULE_MOCKS: Record<string, any> = {
  '~system/EngineApi': {
    crdtSendToRenderer: async () => ({ data: [] }),
    crdtGetState: async () => ({ hasEntities: false, data: [] }),
    sendBatch: async () => ({ events: [] }),
    subscribe: async () => ({}),
    unsubscribe: async () => ({}),
    isServer: async () => ({ isServer: false }),
    crdtGetMessageFromRenderer: async () => ({ data: [] })
  },

  '~system/Scene': {
    getSceneInfo: async () => ({
      cid: '',
      metadata: '{}',
      baseUrl: '',
      contents: []
    })
  },

  '~system/UserIdentity': {
    getUserData: async () => ({
      data: {
        displayName: 'Test User',
        userId: 'test-user-id',
        hasConnectedWeb3: false,
        version: 1,
        avatar: {
          bodyShape: 'urn:decentraland:off-chain:base-avatars:BaseMale',
          skinColor: '#000000',
          hairColor: '#000000',
          eyeColor: '#000000',
          wearables: [],
          snapshots: {
            face256: '',
            body: ''
          }
        }
      }
    }),
    getUserPublicKey: async () => ({ address: undefined })
  },

  '~system/EnvironmentApi': {
    isPreviewMode: async () => ({ isPreview: true }),
    getBootstrapData: async () => ({
      id: '',
      baseUrl: '',
      entity: {
        content: [],
        metadataJson: '{}'
      },
      useFPSThrottling: false
    }),
    getPlatform: async () => ({ platform: 'desktop' }),
    areUnsafeRequestAllowed: async () => ({ status: false }),
    getCurrentRealm: async () => ({ currentRealm: undefined }),
    getExplorerConfiguration: async () => ({ clientUri: '', configurations: {} }),
    getDecentralandTime: async () => ({ seconds: Date.now() / 1000 })
  },

  '~system/Runtime': {
    getRealm: async () => ({
      realmInfo: {
        baseUrl: 'http://localhost',
        realmName: 'localhost',
        networkId: 1,
        commsAdapter: 'offline',
        isPreview: true
      }
    }),
    getWorldTime: async () => ({ seconds: Date.now() / 1000 }),
    readFile: async () => ({ content: new Uint8Array(), hash: '' }),
    getSceneInformation: async () => ({
      urn: '',
      content: [],
      metadataJson: '{}',
      baseUrl: ''
    }),
    getExplorerInformation: async () => ({
      agent: 'code-to-composite',
      platform: 'desktop',
      configurations: {}
    })
  },

  '~system/Players': {
    getPlayerData: async () => ({ data: undefined }),
    getPlayersInScene: async () => ({ players: [] }),
    getConnectedPlayers: async () => ({ players: [] })
  },

  '~system/RestrictedActions': {
    movePlayerTo: async () => ({}),
    teleportTo: async () => ({}),
    triggerEmote: async () => ({}),
    changeRealm: async () => ({ success: false }),
    openExternalUrl: async () => ({ success: false }),
    openNftDialog: async () => ({ success: false }),
    setCommunicationsAdapter: async () => ({ success: false }),
    triggerSceneEmote: async () => ({ success: false })
  },

  '~system/CommsApi': {
    getActiveVideoStreams: async () => ({ streams: [] })
  },

  '~system/CommunicationsController': {
    send: async () => ({}),
    sendBinary: async () => ({ data: [] })
  },

  '~system/EthereumController': {
    requirePayment: async () => ({ jsonAnyResponse: '{}' }),
    signMessage: async () => ({ message: '', hexEncodedMessage: '', signature: '' }),
    convertMessageToObject: async () => ({ dict: {} }),
    sendAsync: async () => ({ jsonAnyResponse: '{}' }),
    getUserAccount: async () => ({ address: undefined })
  },

  '~system/PortableExperiences': {
    spawn: async () => ({ pid: '', parentCid: '', name: '' }),
    kill: async () => ({ status: false }),
    exit: async () => ({ status: false }),
    getPortableExperiencesLoaded: async () => ({ loaded: [] })
  },

  '~system/SignedFetch': {
    signedFetch: async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: {},
      body: ''
    }),
    getHeaders: async () => ({ headers: {} })
  },

  '~system/Testing': {
    logTestResult: async () => ({}),
    plan: async () => ({}),
    setCameraTransform: async () => ({})
  },

  '~system/UserActionModule': {
    requestTeleport: async () => ({})
  }
}

/**
 * Creates a Proxy that automatically returns async functions for any missing properties.
 * This ensures that any unknown function calls return a Promise resolving to an empty object.
 */
function createAutoMockProxy(baseMock: any = {}): any {
  return new Proxy(baseMock, {
    get(target, prop) {
      // If the property exists in the base mock, return it
      if (prop in target) {
        return target[prop]
      }

      // For any unknown property, return an async function that resolves to an empty object
      return async (...args: any[]) => {
        // Return empty object as default for unknown functions
        return {}
      }
    }
  })
}

/**
 * Mocks for ~system/* modules that are marked as external in the bundle.
 * These are runtime-specific modules that don't exist in Node.js.
 *
 * This hybrid approach:
 * 1. Returns pre-defined mocks for critical modules with meaningful defaults
 * 2. Auto-generates mocks for any other module using a Proxy
 * 3. Handles unknown functions gracefully by returning empty promises
 */
function createSystemModuleMock(moduleId: string) {
  if (moduleId in CRITICAL_MODULE_MOCKS) {
    return createAutoMockProxy(CRITICAL_MODULE_MOCKS[moduleId])
  }

  // for unknown ~system modules, return a proxy that handles function calls
  return createAutoMockProxy()
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
 * Transforms the scene bundle code to make it executable in Node.js environment.
 *
 * Applies the following modifications:
 * 1. Exports the engine instance so we can access it after execution
 * 2. Ensures PlayerEntity has a Transform component before main() runs
 */
function transformBundleCode(bundleCode: string): string {
  let transformed = bundleCode

  // Step 1: export the engine instance (the bundle creates a local 'engine' variable but doesn't export it)
  transformed = transformed.replace(
    /var engine = (.*?Engine\(\));/,
    'var engine = $1; if (typeof module !== "undefined" && module.exports) { module.exports.engine = engine; }'
  )

  // Step 2: inject PlayerEntity Transform creation
  // this code runs after engine is created but before main() executes
  const playerTransformSetup = `
// Auto-injected: Ensure PlayerEntity has Transform component
try {
  if (engine && engine.PlayerEntity !== undefined) {
    // Find the Transform component from the engine's registered components
    let Transform = null;
    for (const component of engine.componentsIter()) {
      if (component.componentName === 'core::Transform') {
        Transform = component;
        break;
      }
    }

    if (Transform && !Transform.has(engine.PlayerEntity)) {
      Transform.create(engine.PlayerEntity, {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 }
      });
    }
  }
} catch (err) {}
`

  // try to inject before main() function definition
  let injected = transformed.replace(
    /((?:function\s+main|(?:const|var|let)\s+main\s*=|exports\.main\s*=))/,
    `${playerTransformSetup}\n$1`
  )

  // fallback: inject right after engine creation if 'main()' pattern not found
  if (injected === transformed) {
    injected = transformed.replace(/(var engine = .*?Engine\(\);)/, `$1\n${playerTransformSetup}`)
  }

  return injected
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
  const modifiedCode = transformBundleCode(bundleCode)
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
