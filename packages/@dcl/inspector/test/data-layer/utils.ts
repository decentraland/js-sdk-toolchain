import * as BABYLON from '@babylonjs/core'
import { SceneContext, LoadableScene } from '../../src/lib/babylon/decentraland/SceneContext'
import { SdkContextValue } from '../../src/lib/sdk/context'
import { createInspectorEngine } from '../../src/lib/sdk/inspector-engine'
import { createLocalDataLayerRpcClient } from '../../src/lib/data-layer/client/local-data-layer'
import { feededFileSystem } from '../../src/lib/data-layer/client/feeded-local-fs'
import { DataLayerRpcClient } from '../../src/lib/data-layer/types'
import { stopEngine } from '../../src/lib/data-layer/host'
import { IEngine } from '@dcl/ecs'

export function initTestEngine(loadableScene: Readonly<LoadableScene>) {
  let sceneCtx: SceneContext
  let dataLayer: DataLayerRpcClient
  let inspector: Omit<SdkContextValue, 'scene'>

  beforeAll(async () => {
    const engine = new BABYLON.NullEngine({
      renderWidth: 512,
      renderHeight: 256,
      textureSize: 512,
      deterministicLockstep: true,
      lockstepMaxSteps: 4
    })
    const scene = new BABYLON.Scene(engine)
    sceneCtx = new SceneContext(engine, scene, loadableScene)

    // engine.runRenderLoop(() => {
    // process.stderr.write('RENDER FRAME\n')
    // })

    dataLayer = await createLocalDataLayerRpcClient(feededFileSystem())
    inspector = createInspectorEngine(dataLayer)
    void sceneCtx.connectDataLayer(dataLayer)
    stopEngine()
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
    get babylonEngine() {
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
    async updateInspector() {
      await inspector.engine.update(1)
      await getDataLayerEngine().update(1)

      // TODO: babylon engine needs some more ticks to update. Needs review.
      // Maybe related to the stream & asyn-queue waiting for the updateBatch promises
      await sceneCtx.update()
      await sceneCtx.update()
      await sceneCtx.update()
    },
    async updateRenderer() {
      // TODO: same as above
      await sceneCtx.update()
      await getDataLayerEngine().update(1)
      await sceneCtx.update()
      await getDataLayerEngine().update(1)
      // END TODO

      await inspector.engine.update(1)
    },
    async tick() {}
  }
}
