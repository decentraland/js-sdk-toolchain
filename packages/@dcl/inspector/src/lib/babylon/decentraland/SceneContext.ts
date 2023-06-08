import * as BABYLON from '@babylonjs/core'
import { ComponentDefinition, CrdtMessageType, Engine, Entity, Transport } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import * as Schemas from '@dcl/schemas'
import { AsyncQueue } from '@well-known-components/pushable-channel'
import future from 'fp-future'

import { CrdtStreamMessage } from '../../data-layer/proto/gen/data-layer.gen'
import { DataLayerRpcClient } from '../../data-layer/types'
import { createEditorComponents } from '../../sdk/components'
import { serializeCrdtMessages } from '../../sdk/crdt-logger'
import { ComponentOperation } from './component-operations'
import { EcsEntity } from './EcsEntity'
import { putEntitySelectedComponent } from './editorComponents/selection'
import { putBillboardComponent } from './sdkComponents/billboard'
import { putGltfContainerComponent } from './sdkComponents/gltf-container'
import { putMeshRendererComponent } from './sdkComponents/mesh-renderer'
import { putTransformComponent } from './sdkComponents/transform'
import { consumeAllMessagesInto } from '../../logic/consume-stream'
import { putSceneComponent } from './editorComponents/scene'
import { createOperations } from '../../sdk/operations'
import { createGizmoManager } from './gizmo-manager'

export type LoadableScene = {
  readonly entity: Readonly<Omit<Schemas.Entity, 'id'>>
  readonly baseUrl: string
  readonly id: string
}

export class SceneContext {
  #entities = new Map<Entity, EcsEntity>()
  #weakThis = new WeakRef(this)
  rootNode: EcsEntity

  logger = {
    log: console.log.bind(console),
    error: console.error.bind(console)
  }

  engine = Engine({
    onChangeFunction: (entity, op, component, _value) => {
      this.processEcsChange(entity, op, component)
    }
  })

  operations = createOperations(this.engine)
  gizmos = createGizmoManager(this)

  Billboard = components.Billboard(this.engine)
  Transform = components.Transform(this.engine)
  Material = components.Material(this.engine)
  MeshRenderer = components.MeshRenderer(this.engine)
  GltfContainer = components.GltfContainer(this.engine)
  TextShape = components.TextShape(this.engine)
  Name = components.Name(this.engine)

  readonly editorComponents = createEditorComponents(this.engine)

  readonly componentPutOperations: Record<number, ComponentOperation> = {
    [this.Transform.componentId]: putTransformComponent,
    [this.MeshRenderer.componentId]: putMeshRendererComponent,
    [this.Billboard.componentId]: putBillboardComponent,
    [this.GltfContainer.componentId]: putGltfContainerComponent,
    [this.editorComponents.Selection.componentId]: putEntitySelectedComponent,
    [this.editorComponents.Scene.componentId]: putSceneComponent
  }

  // this future is resolved when the scene is disposed
  readonly stopped = future<void>()

  constructor(
    public babylon: BABYLON.Engine,
    public scene: BABYLON.Scene,
    public loadableScene: LoadableScene,
    public dataLayer: DataLayerRpcClient
  ) {
    this.rootNode = new EcsEntity(0 as Entity, this.#weakThis, scene)
    Object.assign(globalThis, { babylon: this.engine })
  }

  addTransport(stream: AsyncQueue<CrdtStreamMessage>) {
    const engine = this.engine
    const transport: Transport = {
      filter() {
        return !stream.closed
      },
      async send(message) {
        if (stream.closed) return
        stream.enqueue({ data: message })
        if (message.byteLength) {
          Array.from(serializeCrdtMessages('Babylon>Datalayer', message, engine)).forEach(($) => console.log($))
        }
      }
    }
    Object.assign(transport, { name: 'BabylonTransportClient' })
    this.engine.addTransport(transport)
    return transport
  }

  private processEcsChange(entityId: Entity, op: CrdtMessageType, component?: ComponentDefinition<any>) {
    if (op === CrdtMessageType.PUT_COMPONENT) {
      // when setting a component value we need to get or create the entity
      const entity = this.getOrCreateEntity(entityId)
      entity.putComponent(component!)
    } else if (op === CrdtMessageType.DELETE_COMPONENT) {
      // when deleting a component, we can skip the entity creation if it doesn't exist
      const entity = this.getOrCreateEntity(entityId)
      if (entity) {
        entity.deleteComponent(component!)
        if (shouldEntityBeDeleted(entity)) {
          this.removeEntity(entityId)
        }
      }
    } else if (op === CrdtMessageType.DELETE_ENTITY) {
      this.removeEntity(entityId)
    }
  }

  removeEntity(entityId: Entity) {
    const entity = this.getEntityOrNull(entityId)
    if (entity) {
      entity.dispose()
      this.#entities.delete(entityId)
    }
  }

  getOrCreateEntity(entityId: Entity): EcsEntity {
    let entity = this.#entities.get(entityId)
    if (!entity) {
      entity = new EcsEntity(entityId, this.#weakThis, this.scene)
      this.#entities.set(entityId, entity)
    }
    return entity
  }

  getEntityOrNull(entityId: Entity): EcsEntity | null {
    return this.#entities.get(entityId) || null
  }

  resolveFile(src: string): string | null {
    // filenames are lower cased as per https://adr.decentraland.org/adr/ADR-80
    const normalized = src.toLowerCase()

    // and we iterate over the entity content mappings to resolve the file hash
    for (const { file, hash } of this.loadableScene.entity.content) {
      if (file.toLowerCase() === normalized) return hash
    }

    return null
  }

  async getFile(src: string): Promise<Uint8Array | null> {
    if (!src) return null
    try {
      const response = await this.dataLayer.getAssetData({ path: src })
      return response.data
    } catch (err) {
      console.error('Error fetching file ' + src, err)
      return null
    }
  }

  resolveFileAbsolute(src: string): string | null {
    const resolved = this.resolveFile(src)

    if (src) return this.loadableScene.baseUrl + resolved

    return null
  }

  dispose() {
    this.stopped.resolve()
    for (const [entityId] of this.#entities) {
      this.removeEntity(entityId)
    }
    this.rootNode.parent = null
    this.rootNode.dispose()
  }

  async connectCrdtTransport(crdtStream: DataLayerRpcClient['crdtStream']) {
    const outgoingMessages = new AsyncQueue<CrdtStreamMessage>((_, _action) => {
      // console.log('SCENE QUEUE', action)
    })
    const transport = this.addTransport(outgoingMessages)
    const engine = this.engine

    async function onMessage(message: Uint8Array) {
      if (message.byteLength) {
        Array.from(serializeCrdtMessages('DataLayer>Babylon', message, engine)).forEach(($) => console.log($))
      }
      transport.onmessage!(message)
      await engine.update(1)
    }

    consumeAllMessagesInto(crdtStream(outgoingMessages), onMessage, outgoingMessages.close).catch((e) => {
      console.error('consumeAllMessagesInto failed: ', e)
    })
  }
}

// an entity only exists if it has any component attached to it
function shouldEntityBeDeleted(entity: EcsEntity) {
  return entity.usedComponents.size === 0
}
