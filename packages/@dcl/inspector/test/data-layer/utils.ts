import * as BABYLON from '@babylonjs/core'
import { IEngine } from '@dcl/ecs'

import { SceneContext, LoadableScene } from '../../src/lib/babylon/decentraland/SceneContext'
import { SdkContextValue } from '../../src/lib/sdk/context'
import { createInspectorEngine } from '../../src/lib/sdk/inspector-engine'
import { createLocalDataLayerRpcClient } from '../../src/lib/data-layer/client/local-data-layer'
import { DataLayerRpcClient } from '../../src/lib/data-layer/types'
import { createOperations } from '../../src/lib/sdk/operations'
import { getDefaultInspectorPreferences } from '../../src/lib/logic/preferences/types'
import { connectCrdtToEngine } from '../../src/lib/sdk/connect-stream'

export function initTestEngine(loadableScene: Readonly<LoadableScene>) {
  let sceneCtx: SceneContext
  let dataLayer: DataLayerRpcClient
  let inspector: Omit<
    SdkContextValue,
    'scene' | 'dataLayer' | 'operations' | 'editorCamera' | 'sceneContext' | 'gizmos' | 'preferences'
  >

  beforeAll(async () => {
    dataLayer = await createLocalDataLayerRpcClient()
    // Enable autosave to improve test coverage
    await dataLayer.setInspectorPreferences({
      ...getDefaultInspectorPreferences(),
      autosaveEnabled: true
    })

    const engine = new BABYLON.NullEngine({
      renderWidth: 512,
      renderHeight: 256,
      textureSize: 512,
      deterministicLockstep: true,
      lockstepMaxSteps: 4
    })

    const scene = new BABYLON.Scene(engine)
    sceneCtx = new SceneContext(engine, scene, loadableScene)
    inspector = createInspectorEngine()
    connectCrdtToEngine(sceneCtx.engine, dataLayer.crdtStream, 'renderer')
    connectCrdtToEngine(inspector.engine, dataLayer.crdtStream, 'inspector')
  })

  afterAll(() => {
    sceneCtx.scene.dispose()
    sceneCtx.babylon.dispose()
  })

  function getDataLayerEngine() {
    return (globalThis as any).dataLayerEngine as IEngine
  }

  return {
    get sceneCtx() {
      if (!sceneCtx) throw new Error('You can only access the sceneCtx inside a test')
      return sceneCtx
    },
    get rendererEngine() {
      if (!sceneCtx) throw new Error('You can only access the sceneCtx inside a test')
      return sceneCtx.engine
    },
    get inspectorEngine() {
      if (!inspector) throw new Error('You can only access the inspector inside a test')
      return inspector.engine
    },
    get dataLayerEngine() {
      if (!dataLayer) throw new Error('You can only access the dataLayer inside a test')
      return getDataLayerEngine()
    },
    get dataLayer() {
      if (!dataLayer) throw new Error('You can only access the dataLayer inside a test')
      return dataLayer
    },
    get inspectorOperations() {
      return createOperations(inspector.engine)
    },
    get rendererOperations() {
      return createOperations(sceneCtx.engine)
    },
    async tick() {
      await new Promise((resolve) => {
        setTimeout(resolve, 0)
      })
    }
  }
}
