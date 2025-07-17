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
import { getRoot } from '../../sdk/nodes'

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
  boundingInfoMesh?: BABYLON.AbstractMesh
  gltfAssetContainer?: BABYLON.AssetContainer
  textShape?: BABYLON.Mesh
  material?: BABYLON.StandardMaterial | BABYLON.PBRMaterial
  #gltfPathLoading?: IFuture<string>
  #gltfAssetContainerLoading: IFuture<BABYLON.AssetContainer> = future()
  #isLocked?: boolean = false
  #assetLoading: IFuture<BABYLON.AbstractMesh> = future()

  ecsComponentValues: EcsComponents = {}

  constructor(public entityId: Entity, public context: WeakRef<SceneContext>, public scene: BABYLON.Scene) {
    super(`ecs-${entityId}`, scene)
    createDefaultTransform(this)
  }

  putComponent(component: ComponentDefinition<unknown>) {
    const ctx = this.context.deref()!
    const operation = ctx.componentPutOperations[component.componentId]
    this.usedComponents.set(component.componentId, component)
    operation?.call(null, this, component)
  }

  deleteComponent(component: ComponentDefinition<unknown>) {
    const ctx = this.context.deref()!
    const operation = ctx.componentDeleteOperations[component.componentId]
    this.usedComponents.delete(component.componentId)
    operation?.call(null, this, component)
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

    // then dispose the boundingInfoMesh if exists
    this.boundingInfoMesh?.dispose()

    // and then proceed with the native engine disposal
    super.dispose(true, false)
  }

  getMeshesBoundingBox(_children: BABYLON.AbstractMesh[] = []) {
    const children = _children.length > 0 ? _children : this.getChildMeshes(false)
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

  getGroupMeshesBoundingBox() {
    // This will get the GLTF contaier children if it exists, otherwise it will get the entity's children
    const children = this.gltfContainer ? this.gltfContainer.getChildMeshes(false) : this.getChildMeshes(false)
    if (children.length === 0) return null
    return this.getMeshesBoundingBox(children)
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

  resetGltfAssetContainerLoading() {
    this.#gltfAssetContainerLoading = future()
  }

  setGltfAssetContainer(gltfAssetContainer: BABYLON.AssetContainer) {
    this.gltfAssetContainer = gltfAssetContainer
    this.#gltfAssetContainerLoading.resolve(gltfAssetContainer)
  }

  setGltfContainer(mesh: BABYLON.AbstractMesh) {
    this.gltfContainer = mesh
    this.#assetLoading.resolve(mesh)
  }

  setMeshRenderer(mesh: BABYLON.AbstractMesh) {
    this.meshRenderer = mesh
    this.#assetLoading.resolve(mesh)
  }

  onAssetLoaded() {
    return this.#assetLoading
  }

  isHidden() {
    const container = this.gltfContainer ?? this.meshRenderer
    return container ? !container.isEnabled(false) : false
  }

  getRoot() {
    const ctx = this.context.deref()
    const nodes = ctx?.editorComponents.Nodes.getOrNull(ctx.engine.RootEntity)?.value || []
    if (nodes.length === 0) return null
    const root = getRoot(this.entityId, nodes)
    return root
  }

  setVisibility(enabled: boolean) {
    const container = this.gltfContainer ?? this.meshRenderer
    if (container) {
      container.setEnabled(enabled)
    }
    for (const child of this.childrenEntities()) {
      child.setVisibility(enabled)
    }
  }

  isLocked() {
    return this.#isLocked
  }

  setLock(lock: boolean) {
    this.#isLocked = lock
  }

  generateBoundingBox() {
    if (!!this.boundingInfoMesh) return

    const boundingVectors = this.getGroupMeshesBoundingBox()

    if (!boundingVectors) return

    const boundingInfoMesh = new BABYLON.Mesh(`BoundingMesh-${this.id}`, this.getScene())

    boundingInfoMesh.position = BABYLON.Vector3.Zero()
    boundingInfoMesh.rotationQuaternion = BABYLON.Quaternion.Identity()
    boundingInfoMesh.scaling = BABYLON.Vector3.One()

    boundingInfoMesh.setBoundingInfo(new BABYLON.BoundingInfo(boundingVectors.minimum, boundingVectors.maximum))

    this.boundingInfoMesh = boundingInfoMesh

    this.boundingInfoMesh.parent = this

    // Validate if the entity is outside the layout
    void validateEntityIsOutsideLayout(this)
  }

  isOutOfBoundaries() {
    return !!this.boundingInfoMesh?.showBoundingBox
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

async function validateEntityIsOutsideLayout(entity: EcsEntity) {
  // Waits until the asset is loaded
  await entity.onAssetLoaded()
  const mesh = entity.boundingInfoMesh
  if (mesh) {
    // First run to initializate the bounding box visibility when the scene is already loaded
    entity.getScene().onReadyObservable.addOnce(() => {
      updateMeshBoundingBoxVisibility(entity, mesh)
    })

    mesh.onAfterWorldMatrixUpdateObservable.add(() => {
      updateMeshBoundingBoxVisibility(entity, mesh)
    })
  }
}

function updateMeshBoundingBoxVisibility(entity: EcsEntity, mesh: BABYLON.AbstractMesh) {
  const scene = mesh.getScene()
  const { isEntityOutsideLayout } = getLayoutManager(scene)

  if (isEntityOutsideLayout(mesh)) {
    if (mesh.showBoundingBox) return
    mesh.showBoundingBox = true
  } else {
    if (!mesh.showBoundingBox) return
    mesh.showBoundingBox = false
  }
}
