import path from 'path'
import Module from 'module'
import i18next from 'i18next'
import {
  IEngine,
  Transport,
  Entity,
  UiCanvasInformation,
  CameraMode,
  PutComponentOperation,
  engine,
  Transform,
  UiTransform,
  UiText,
  UiBackground,
  UiInput,
  UiInputResult,
  UiDropdown,
  UiDropdownResult,
} from '@dcl/ecs/dist-cjs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist-cjs/serialization/ByteBuffer'
import { createEngineContext } from '@dcl/inspector'


import { CliComponents } from '../../components'
import { SceneProject } from '../../logic/project-validations'
import { CliError } from '../../logic/error'
import { bundleProject } from '../../logic/bundle'

/**
 * Returns the set of component IDs that are used by the @dcl/inspector.
 */
function getInspectorComponentsIds() {
  const { components } = createEngineContext()
  const ids = new Set<number>()
  for (const [_, component] of Object.entries(components)) {
    ids.add(component.componentId)
  }
  return ids
}

/**
 * Initializes the ECS engine with a mock transport layer.
 *
 * The transport layer is used to capture CRDT messages sent by the scene code.
 * This allows us to capture the state of all entities and components.
 */
function initEngine(): { engine: IEngine, transport: Transport } {
  const transport: Transport = {
    filter: () => true,
    send: async (_messages) => {}
  }

  engine.addTransport(transport)

  return {
    engine,
    transport
  }
}

/**
 * Creates initial CRDT state with required engine components.
 */
function getInitialCrdtState(): Uint8Array[] {
  function addPlayerEntityTransform() {
    const buffer = new ReadWriteByteBuffer()
    const transform = Transform.create(engine.PlayerEntity)
    Transform.schema.serialize(transform, buffer)
    const transformData = buffer.toCopiedBinary()
    buffer.resetBuffer()
    PutComponentOperation.write(1 as Entity, 1, Transform.componentId, transformData, buffer)
    PutComponentOperation.write(2 as Entity, 1, Transform.componentId, transformData, buffer)
    return buffer.toBinary()
  }

  function addUICanvasOnRootEntity() {
    const buffer = new ReadWriteByteBuffer()
    const uiCanvasInformation = UiCanvasInformation.create(engine.RootEntity)
    UiCanvasInformation.schema.serialize(uiCanvasInformation, buffer)
    const uiCanvasComponentData = buffer.toCopiedBinary()
    buffer.resetBuffer()
    PutComponentOperation.write(0 as Entity, 1, UiCanvasInformation.componentId, uiCanvasComponentData, buffer)
    return buffer.toBinary()
  }

  function addCameraMode() {
    const buffer = new ReadWriteByteBuffer()
    const cameraMode = CameraMode.create(engine.RootEntity)
    CameraMode.schema.serialize(cameraMode, buffer)
    const cameraModeComponentData = buffer.toCopiedBinary()
    buffer.resetBuffer()
    PutComponentOperation.write(2 as Entity, 1, CameraMode.componentId, cameraModeComponentData, buffer)
    return buffer.toBinary()
  }

  return [addPlayerEntityTransform(), addUICanvasOnRootEntity(), addCameraMode()]
}

/**
 * Creates pre-defined mocks for critical ~system modules.
 *
 * These modules are runtime-specific and don't exist in Node.js.
 * This function provides meaningful mock implementations for the most
 * commonly used system modules to ensure scene code executes correctly.
 */
function createCriticalModuleMocks(engine: IEngine, transport: Transport, crdtState: Uint8Array): Record<string, any> {
  return {
    '~system/EngineApi': {
      crdtSendToRenderer: async (crdt: { data: Uint8Array }) => {
        transport.onmessage!(crdt.data)
        await engine.update(0)
      },
      crdtGetState: async () => ({
        hasEntities: false,
        data: [...getInitialCrdtState(), crdtState]
      }),
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
}

/**
 * Creates a Proxy that automatically mocks unknown properties and functions.
 *
 * This provides a fallback mechanism for ~system module functions that aren't
 * explicitly mocked.
 */
function createAutoMockProxy(baseMock: any = {}): any {
  return new Proxy(baseMock, {
    get(target, prop) {
      if (prop in target) {
        return target[prop]
      }

      return async (...args: any[]) => {
        return {}
      }
    }
  })
}

/**
 * Creates a mock implementation for a ~system/* module.
 *
 * ~system modules are runtime-specific and don't exist in Node.js, so they need
 * to be mocked for scene execution.
 */
function createSystemModuleMock(engine: IEngine, transport: Transport, mainCrdt: Uint8Array, moduleId: string) {
  const criticalModuleMocks = createCriticalModuleMocks(engine, transport, mainCrdt);
  if (moduleId in criticalModuleMocks) {
    return createAutoMockProxy(criticalModuleMocks[moduleId])
  }
  return createAutoMockProxy()
}

/**
 * Sets up a Node.js require hook to intercept and mock ~system/* module imports.
 *
 * This patches Module.prototype.require to intercept require() calls during
 * scene bundle execution.
 *
 * NOTE: The hook is temporary and should be removed after scene execution using
 * the returned cleanup function.
 */
function setupRequireHook(engine: IEngine, transport: Transport, mainCrdt: Uint8Array): () => void {
  const originalRequire = Module.prototype.require

  Module.prototype.require = function (this: Module, id: string) {
    if (id.startsWith('~system/')) {
      return createSystemModuleMock(engine, transport, mainCrdt, id)
    }
    return originalRequire.apply(this, [id])
  } as any

  return () => {
    Module.prototype.require = originalRequire
  }
}

/**
 * Loads and executes the scene bundle to populate the ECS engine.
 */
async function loadAndExecuteBundle(bundlePath: string): Promise<void> {
  delete require.cache[require.resolve(bundlePath)]
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sceneModule = require(bundlePath)

  if (typeof sceneModule.onStart === 'function') {
    const onStart = sceneModule.onStart()
    if (typeof onStart.then === 'function') {
      await onStart
    }
  }

  if (typeof sceneModule.onUpdate === 'function') {
    const onUpdate = sceneModule.onUpdate(0)
    if (typeof onUpdate.then === 'function') {
      await onUpdate
    }
  }
}

/**
 * Filters out components that are not supported by the @dcl/inspector.
 */
function filterInspectorCompatibleComponents(engine: IEngine) {
  const validComponentIds = getInspectorComponentsIds()

  const reactEcsComponentIds = new Set([
    UiTransform.componentId,
    UiText.componentId,
    UiBackground.componentId,
    UiInput.componentId,
    UiInputResult.componentId,
    UiDropdown.componentId,
    UiDropdownResult.componentId,
  ])

  // first pass: identify entities with react-ecs components
  const uiEntities = new Set<Entity>()
  for (const component of engine.componentsIter()) {
    if (reactEcsComponentIds.has(component.componentId)) {
      for (const [entity] of engine.getEntitiesWith(component)) {
        uiEntities.add(entity)
      }
    }
  }

  // second pass: remove components from entities that either:
  // - are root engine entities
  // - have react-ecs components
  for (const component of engine.componentsIter()) {
    if ('deleteFrom' in component) {
      const isValidComponent = validComponentIds.has(component.componentId)
      for (const [entity] of engine.getEntitiesWith(component)) {
        if (uiEntities.has(entity) || !isValidComponent) {
          component.deleteFrom(entity)
        }
      }
    }
  }
}

/**
 * Loads the main CRDT file if it exists, otherwise returns an empty buffer.
 *
 * The CRDT file contains serialized component state that may already exist
 * in the scene. This is used to initialize the engine with any pre-existing
 * state before executing the scene code.
 */
async function getMainCrdtFile(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  crdtFilePath: string
): Promise<Uint8Array> {
  let mainCrdt = new Uint8Array()
  if (await components.fs.fileExists(crdtFilePath)) {
    mainCrdt = new Uint8Array(await components.fs.readFile(crdtFilePath))
  }
  return mainCrdt
}

/**
 * Bundles the scene code and returns the entrypoint.
 */
async function bundle(components: Pick<CliComponents, 'fs' | 'logger'>, project: SceneProject): Promise<string> {
  try {
    const { inputs } = await bundleProject(
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
    return inputs[0].entrypoint
  } catch (err: any) {
    throw new CliError(
      'CODE_TO_COMPOSITE_BUILD_FAILED',
      i18next.t('errors.code_to_composite.build_failed', { error: err.message })
    )
  }
}

/**
 * Executes a Decentraland scene's code and captures the resulting ECS engine state.
 *
 * This is the main entry point for the code-to-composite command. It runs scene
 * code in a Node.js environment to extract the entity/component structure.
 *
 * The returned engine can then be used to generate composite/CRDT files.
 */
export async function executeSceneCode(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  project: SceneProject,
  crdtFilePath: string
): Promise<{ engine: IEngine, sceneCodeEntrypoint: string }> {
  const { fs, logger } = components

  logger.log('Building scene...')
  const sceneCodeEntrypoint = await bundle(components, project)

  const bundlePath = path.join(project.workingDirectory, project.scene.main)
  if (!(await fs.fileExists(bundlePath))) {
    throw new CliError(
      'CODE_TO_COMPOSITE_BUNDLE_NOT_FOUND',
      i18next.t('errors.code_to_composite.bundle_not_found', { bundlePath })
    )
  }

  logger.log('Executing scene code to capture engine state...')

  const crdtState = await getMainCrdtFile(components, crdtFilePath)
  const { engine, transport } = initEngine()
  const restoreRequire = setupRequireHook(engine, transport, crdtState)

  try {
    await loadAndExecuteBundle(bundlePath)
    filterInspectorCompatibleComponents(engine)
    return { engine: engine as any as IEngine, sceneCodeEntrypoint }
  } catch (err: any) {
    throw new CliError(
      'CODE_TO_COMPOSITE_EXECUTION_FAILED',
      i18next.t('errors.code_to_composite.execution_failed', { error: `${err.message}\n${err.stack || ''}` })
    )
  } finally {
    // cleanup: restore original require
    restoreRequire()
  }
}
