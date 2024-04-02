import * as BABYLON from '@babylonjs/core'
import { ComponentDefinition, CrdtMessageType, Engine, Entity } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import * as Schemas from '@dcl/schemas'
import future from 'fp-future'

import { createEditorComponents } from '../../sdk/components'
import { ComponentOperation } from './component-operations'
import { EcsEntity } from './EcsEntity'
import { putEntitySelectedComponent } from './editorComponents/selection'
import { putBillboardComponent } from './sdkComponents/billboard'
import { putGltfContainerComponent } from './sdkComponents/gltf-container'
import { putMeshRendererComponent } from './sdkComponents/mesh-renderer'
import { putTransformComponent } from './sdkComponents/transform'
import { putTextShapeComponent } from './sdkComponents/text-shape'
import { putSceneComponent } from './editorComponents/scene'
import { createOperations } from '../../sdk/operations'
import { createGizmoManager } from './gizmo-manager'
import { getDataLayerInterface } from '../../../redux/data-layer'
import { putMaterialComponent } from './sdkComponents/material'
import { putNftShapeComponent } from './sdkComponents/nft'
import { putVideoPlayerComponent } from './sdkComponents/video-player'
import { putHideComponent } from './editorComponents/hide'
import { putLockComponent } from './editorComponents/lock'
import { ROOT } from '../../sdk/tree'

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
  Animator = components.Animator(this.engine)
  NftShape = components.NftShape(this.engine)
  VideoPlayer = components.VideoPlayer(this.engine)

  readonly editorComponents = createEditorComponents(this.engine)

  readonly componentPutOperations: Record<number, ComponentOperation> = {
    [this.Transform.componentId]: putTransformComponent,
    [this.MeshRenderer.componentId]: putMeshRendererComponent,
    [this.Material.componentId]: putMaterialComponent,
    [this.Billboard.componentId]: putBillboardComponent,
    [this.GltfContainer.componentId]: putGltfContainerComponent,
    [this.TextShape.componentId]: putTextShapeComponent,
    [this.NftShape.componentId]: putNftShapeComponent,
    [this.VideoPlayer.componentId]: putVideoPlayerComponent,
    [this.editorComponents.Selection.componentId]: putEntitySelectedComponent,
    [this.editorComponents.Scene.componentId]: putSceneComponent,
    [this.editorComponents.Hide.componentId]: putHideComponent,
    [this.editorComponents.Lock.componentId]: putLockComponent
  }

  // this future is resolved when the scene is disposed
  readonly stopped = future<void>()

  constructor(public babylon: BABYLON.Engine, public scene: BABYLON.Scene, public loadableScene: LoadableScene) {
    this.rootNode = this.getOrCreateEntity(ROOT)
    Object.assign(globalThis, { babylon: this.engine })
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
      // TODO: how we handle this with redux ?
      const dataLayer = getDataLayerInterface()
      if (!dataLayer) return null
      const response = await dataLayer.getAssetData({ path: src })
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
}

// an entity only exists if it has any component attached to it
function shouldEntityBeDeleted(entity: EcsEntity) {
  return entity.usedComponents.size === 0
}
