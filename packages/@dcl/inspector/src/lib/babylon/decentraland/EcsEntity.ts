import * as BABYLON from '@babylonjs/core'
import {
  ComponentDefinition,
  Entity,
  PBGltfContainer,
  PBMeshRenderer,
  PBPointerEvents,
  PBTextShape,
  TransformType,
  PBMaterial
} from '@dcl/ecs'
import future, { IFuture } from 'fp-future'
import { SceneContext } from './SceneContext'
import { createDefaultTransform } from './sdkComponents/transform'
import { getLayoutManager } from './layout-manager'

export type EcsComponents = Partial<{
  gltfContainer: PBGltfContainer
  material: PBMaterial
  meshRenderer: PBMeshRenderer
  pointerEvents: PBPointerEvents
  textShape: PBTextShape
  transform: TransformType
}>

export class EcsEntity extends BABYLON.TransformNode {
  readonly isDCLEntity = true
  usedComponents = new Map<number, ComponentDefinition<unknown>>()
  meshRenderer?: BABYLON.AbstractMesh
  gltfContainer?: BABYLON.AbstractMesh
  gltfAssetContainer?: BABYLON.AssetContainer
  textShape?: BABYLON.Mesh
  material?: BABYLON.StandardMaterial | BABYLON.PBRMaterial
  #gltfPathLoading?: IFuture<string>
  #gltfAssetContainerLoading: IFuture<BABYLON.AssetContainer> = future()
  #isLocked?: boolean = false

  ecsComponentValues: EcsComponents = {}

  constructor(public entityId: Entity, public context: WeakRef<SceneContext>, public scene: BABYLON.Scene) {
    super(`ecs-${entityId.toString(16)}`, scene)
    createDefaultTransform(this)
    this.initEventHandlers(this)
  }

  putComponent(component: ComponentDefinition<unknown>) {
    this.usedComponents.set(component.componentId, component)
    this.context.deref()!.componentPutOperations[component.componentId]?.call(null, this, component)
  }

  deleteComponent(component: ComponentDefinition<unknown>) {
    this.usedComponents.delete(component.componentId)
    this.context.deref()!.componentPutOperations[component.componentId]?.call(null, this, component)
  }

  /**
   * Returns the children that extends EcsEntity, filtering any other Object3D
   */
  *childrenEntities(): Iterable<EcsEntity> {
    if (this._children)
      for (let i = 0; i < this._children.length; i++) {
        const element = this._children[i] as any
        if (element.isDCLEntity) {
          yield element
        }
      }
  }

  dispose(_doNotRecurse?: boolean | undefined, _disposeMaterialAndTextures?: boolean | undefined): void {
    // first dispose all components
    for (const [_, component] of this.usedComponents) {
      this.deleteComponent(component)
    }

    // and then proceed with the native engine disposal
    super.dispose(true, false)
  }

  getMeshesBoundingBox() {
    const children = this.getChildMeshes(false)
    let boundingInfo = children[0].getBoundingInfo()
    let min = boundingInfo.boundingBox.minimumWorld
    let max = boundingInfo.boundingBox.maximumWorld
    for (let i = 1; i < children.length; i++) {
      // Cameras/lights doesn't have any materials and may be outside of the scene.
      if (!children[i].material) continue
      boundingInfo = children[i].getBoundingInfo()
      min = BABYLON.Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld)
      max = BABYLON.Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld)
    }
    return new BABYLON.BoundingInfo(min, max)
  }

  isGltfPathLoading() {
    return !!this.#gltfPathLoading
  }

  getGltfPathLoading() {
    return this.#gltfPathLoading
  }

  resolveGltfPathLoading(filePath: string) {
    this.#gltfPathLoading?.resolve(filePath)
    this.#gltfPathLoading = undefined
  }

  setGltfPathLoading() {
    this.#gltfPathLoading = future()
  }

  onGltfContainerLoaded() {
    return this.#gltfAssetContainerLoading
  }

  setGltfAssetContainer(gltfAssetContainer: BABYLON.AssetContainer) {
    this.gltfAssetContainer = gltfAssetContainer
    this.#gltfAssetContainerLoading.resolve(gltfAssetContainer)
  }

  isHidden() {
    const container = this.gltfContainer ?? this.meshRenderer
    return container ? !container.isEnabled(false) : false
  }

  getPickableMesh() {
    return this.gltfContainer?.getChildMeshes().find((mesh) => !!mesh.isPickable) ?? this.meshRenderer
  }

  isLocked() {
    return this.#isLocked
  }

  setLock(lock: boolean) {
    this.#isLocked = lock
  }

  initEventHandlers(entity: EcsEntity) {
    if (entity.entityId !== this.context.deref()!.rootNode.entityId) {
      // Initialize this event to handle the entity's position update
      entity.onAfterWorldMatrixUpdateObservable.addOnce((eventData, eventState) => {
        void entity.validateEntityIsOutsideLayout(eventData as EcsEntity, eventState)
      })
    }
  }

  async validateEntityIsOutsideLayout(eventData: EcsEntity, _eventState: BABYLON.EventState) {
    // When dropping a new entity, waits until the gltf is loaded
    if (eventData.isGltfPathLoading()) {
      await eventData.onGltfContainerLoaded()
    }
    // Get the entity's pickable mesh
    const mesh = eventData.getPickableMesh()
    if (mesh) {
      // Update the mesh's bounding box visibility
      mesh.onAfterWorldMatrixUpdateObservable.add((eventMeshData) =>
        this.updateMeshBoundingBoxVisibility(eventMeshData as BABYLON.AbstractMesh)
      )
    }
  }

  updateMeshBoundingBoxVisibility(mesh: BABYLON.AbstractMesh) {
    const scene = mesh.getScene()
    const { isEntityOutsideLayout } = getLayoutManager(scene)

    if (isEntityOutsideLayout(mesh)) {
      if (!(mesh.material instanceof BABYLON.MultiMaterial)) {
        const multiMaterial = new BABYLON.MultiMaterial('entity_outside_layout_multimaterial', scene)
        multiMaterial.subMaterials = [scene.getMaterialByName('entity_outside_layout'), mesh.material]
        mesh.material = multiMaterial
      }
      mesh.showBoundingBox = true
    } else {
      if (
        mesh.material instanceof BABYLON.MultiMaterial &&
        mesh.material.subMaterials.some((material) => material?.name === 'entity_outside_layout')
      ) {
        const multiMaterial = mesh.material
        mesh.material = multiMaterial.subMaterials[1]
        multiMaterial.dispose()
      }
      mesh.showBoundingBox = false
    }
  }
}

/**
 * Finds the closest parent that is or extends a EcsEntity
 * @param object the object to start looking
 */
export function findParentEntity(object: BABYLON.Node): EcsEntity | null {
  return findParentEntityOfType(object, EcsEntity)
}

/**
 * Finds the closest parent that is instance of the second parameter (constructor)
 * @param object the object to start looking
 * @param desiredClass the constructor of the kind of parent we want to find
 */
export function findParentEntityOfType<T extends EcsEntity>(
  object: BABYLON.Node,
  desiredClass: any // ConstructorOf<T>
): T | null {
  // Find the next entity parent to dispatch the event
  let parent: T | BABYLON.Node | null = object.parent

  while (parent && !(parent instanceof desiredClass)) {
    parent = parent.parent

    // If the element has no parent, stop execution
    if (!parent) return null
  }

  return (parent as any as T) || null
}
