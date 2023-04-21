import { Scene } from '@babylonjs/core'
import { ComponentDefinition, CrdtMessageType, Entity, IEngine } from '@dcl/ecs'
import { Emitter } from 'mitt'

import { ITheme } from '../../components/AssetsCatalog'
import { SceneContext } from '../babylon/decentraland/SceneContext'
import { initRenderer } from '../babylon/setup/init'
import { createDataLayerClientRpc } from '../data-layer/client'
import { EditorComponents, SdkComponents } from './components'
import { getHardcodedLoadableScene } from './test-local-scene'
import { createInspectorEngine } from './inspector-engine'
import { DataLayerRpcClient } from '../data-layer/types'
import { getTransformNodeChecker } from './transform-node'

export type SdkContextEvents = {
  change: { entity: Entity; operation: CrdtMessageType; component?: ComponentDefinition<any>; value?: any }
  dispose: undefined
}

export type SdkContextValue = {
  engine: IEngine
  components: EditorComponents & SdkComponents
  scene: Scene
  events: Emitter<SdkContextEvents>
  dispose(): void
  dataLayer: DataLayerRpcClient
}

export async function createSdkContext(canvas: HTMLCanvasElement, catalog: ITheme[]): Promise<SdkContextValue> {
  const renderer = initRenderer(canvas)
  const { scene } = renderer

  // initialize DataLayer
  const dataLayer = await createDataLayerClientRpc()

  // create scene context
  const ctx = new SceneContext(
    renderer.engine,
    scene,
    getHardcodedLoadableScene(
      'urn:decentraland:entity:bafkreid44xhavttoz4nznidmyj3rjnrgdza7v6l7kd46xdmleor5lmsxfm1',
      catalog
    ),
    dataLayer
  )
  ctx.rootNode.position.set(0, 0, 0)

  // Connect babylon engine with dataLayer transport
  void ctx.connectCrdtTransport(dataLayer.crdtStream)

  // create inspector engine context and components
  const { engine, components, events, dispose } = createInspectorEngine(dataLayer)

  // add auto parenting
  engine.addSystem(getTransformNodeChecker(engine, components.EntityNode))

  // register some globals for debugging
  Object.assign(globalThis, { dataLayer, inspectorEngine: engine })

  return {
    engine,
    components,
    events,
    scene,
    dispose,
    dataLayer
  }
}
