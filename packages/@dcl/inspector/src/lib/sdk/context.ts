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
import { createOperations } from './operations'
import { Gizmos } from '../babylon/decentraland/gizmo-manager'
import { CameraManager } from '../babylon/decentraland/camera'
import { InspectorPreferencesManager } from '../logic/preferences/manager'

export type SdkContextEvents = {
  change: { entity: Entity; operation: CrdtMessageType; component?: ComponentDefinition<any>; value?: any }
  dispose: undefined
}

export type SdkContextValue = {
  engine: IEngine
  components: EditorComponents & SdkComponents
  scene: Scene
  sceneContext: SceneContext
  events: Emitter<SdkContextEvents>
  dispose(): void
  dataLayer: DataLayerRpcClient
  operations: ReturnType<typeof createOperations>
  gizmos: Gizmos
  editorCamera: CameraManager
  preferences: InspectorPreferencesManager
}

export async function createSdkContext(canvas: HTMLCanvasElement, catalog: ITheme[]): Promise<SdkContextValue> {
  // initialize DataLayer
  const dataLayer = await createDataLayerClientRpc()

  // fetch user preferences from the data layer
  const preferences = await dataLayer.getInspectorPreferences({})

  const renderer = initRenderer(canvas, preferences)
  const { scene } = renderer

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

  // register some globals for debugging
  Object.assign(globalThis, { dataLayer, inspectorEngine: engine })

  return {
    engine,
    components,
    events,
    scene,
    sceneContext: ctx,
    dispose,
    dataLayer,
    operations: createOperations(engine),
    gizmos: ctx.gizmos,
    editorCamera: renderer.editorCamera,
    preferences: new InspectorPreferencesManager(preferences, dataLayer)
  }
}
