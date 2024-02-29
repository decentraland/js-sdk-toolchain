import { Scene } from '@babylonjs/core'
import { ComponentDefinition, CrdtMessageType, Entity, IEngine } from '@dcl/ecs'
import { MessageTransport } from '@dcl/mini-rpc'
import { Emitter } from 'mitt'

import { SceneContext } from '../babylon/decentraland/SceneContext'
import { initRenderer } from '../babylon/setup/init'
import { EditorComponents, SdkComponents } from './components'
import { getHardcodedLoadableScene } from './test-local-scene'
import { createInspectorEngine } from './inspector-engine'
import { createOperations } from './operations'
import { Gizmos } from '../babylon/decentraland/gizmo-manager'
import { CameraManager } from '../babylon/decentraland/camera'
import { InspectorPreferences } from '../logic/preferences/types'
import { CameraServer } from '../rpc/camera/server'
import { getConfig } from '../logic/config'
import { AssetPack } from '../logic/catalog'
import { EnumEntity, createEnumEntityId } from './enum-entity'

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
  operations: ReturnType<typeof createOperations>
  gizmos: Gizmos
  editorCamera: CameraManager
  enumEntity: EnumEntity
}

export async function createSdkContext(
  canvas: HTMLCanvasElement,
  catalog: AssetPack[],
  preferences: InspectorPreferences
): Promise<SdkContextValue> {
  const renderer = initRenderer(canvas, preferences)
  const { scene } = renderer

  // create scene context
  const ctx = new SceneContext(
    renderer.engine,
    scene,
    getHardcodedLoadableScene(
      'urn:decentraland:entity:bafkreid44xhavttoz4nznidmyj3rjnrgdza7v6l7kd46xdmleor5lmsxfm1',
      catalog
    )
  )
  ctx.rootNode.position.set(0, 0, 0)

  // create inspector engine context and components
  const { engine, components, events, dispose } = createInspectorEngine()

  // register some globals for debugging
  Object.assign(globalThis, { inspectorEngine: engine })

  // if there is a parent, initialize rpc servers
  const config = getConfig()
  if (config.dataLayerRpcParentUrl) {
    const tranport = new MessageTransport(window, window.parent, config.dataLayerRpcParentUrl)
    new CameraServer(tranport, renderer.engine, renderer.editorCamera.getCamera())
  }

  return {
    engine,
    components,
    events,
    scene,
    sceneContext: ctx,
    dispose,
    operations: createOperations(engine),
    gizmos: ctx.gizmos,
    editorCamera: renderer.editorCamera,
    enumEntity: createEnumEntityId(engine)
  }
}
