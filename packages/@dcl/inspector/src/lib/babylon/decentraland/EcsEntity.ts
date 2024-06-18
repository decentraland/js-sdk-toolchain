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
    this.initEventHandlers()
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

    // then dispose the boundingInfoMesh if exists
    this.boundingInfoMesh?.dispose()

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

  getTransformedVertices(mesh: BABYLON.AbstractMesh) {
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)!

    const worldVertices = []
    const scaling = mesh.scaling
    const rotationQuaternion = mesh.rotationQuaternion || BABYLON.Quaternion.Identity()
    const position = mesh.position

    for (let i = 0; i < positions.length; i += 3) {
      const vertex = BABYLON.Vector3.FromArray(positions, i)

      // Apply scaling
      vertex.multiplyInPlace(scaling)

      // Apply rotation
      vertex.rotateByQuaternionToRef(rotationQuaternion, vertex)

      // Apply translation
      vertex.addInPlace(position)

      worldVertices.push(vertex)
    }

    return worldVertices
  }

  computeMeshBoundingBox(mesh: BABYLON.AbstractMesh) {
    const worldVertices = this.getTransformedVertices(mesh)

    let min = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE)
    let max = new BABYLON.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE)

    for (const vertex of worldVertices) {
      min = BABYLON.Vector3.Minimize(min, vertex)
      max = BABYLON.Vector3.Maximize(max, vertex)
    }

    return { min, max }
  }

  getGroupMeshesBoundingBox() {
    const children = this.getChildMeshes(false)
    if (children.length === 0) {
      return null // No children to calculate the bounding box
    }

    let groupMin = new BABYLON.Vector3(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
    let groupMax = new BABYLON.Vector3(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER)

    for (const child of children) {
      if (!child.material) continue

      const { min, max } = this.computeMeshBoundingBox(child)
      groupMin = BABYLON.Vector3.Minimize(groupMin, min)
      groupMax = BABYLON.Vector3.Maximize(groupMax, max)
    }

    return new BABYLON.BoundingInfo(groupMin, groupMax)
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

    const meshesBoundingBox = this.getGroupMeshesBoundingBox()

    if (!meshesBoundingBox) return

    this.boundingInfoMesh = new BABYLON.Mesh(`BoundingMesh-${this.id}`, this.getScene())
    this.boundingInfoMesh.position = BABYLON.Vector3.Zero()
    this.boundingInfoMesh.rotationQuaternion = BABYLON.Quaternion.Identity()
    this.boundingInfoMesh.scaling = new BABYLON.Vector3(1, 1, 1)

    this.boundingInfoMesh.parent = this

    this.boundingInfoMesh.setBoundingInfo(
      new BABYLON.BoundingInfo(meshesBoundingBox.minimum, meshesBoundingBox.maximum, this.getWorldMatrix())
    )
  }

  initEventHandlers() {
    if (this.entityId !== this.context.deref()!.engine.RootEntity) {
      // Initialize this event to handle the entity's position update
      this.onAfterWorldMatrixUpdateObservable.addOnce((eventData) => {
        void validateEntityIsOutsideLayout(eventData as EcsEntity)
      })
    }
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
    for (const childMesh of entity.getChildMeshes(false)) {
      addOutsideLayoutMaterial(entity, childMesh, scene)
    }
  } else {
    if (!mesh.showBoundingBox) return
    mesh.showBoundingBox = false
    for (const childMesh of entity.getChildMeshes(false)) {
      removeOutsideLayoutMaterial(entity, childMesh)
    }
  }
}

function addOutsideLayoutMaterial(entity: EcsEntity, mesh: BABYLON.AbstractMesh, scene: BABYLON.Scene) {
  if (!(mesh.material instanceof BABYLON.MultiMaterial)) {
    const multiMaterial = new BABYLON.MultiMaterial(
      `entity_outside_layout_multimaterial-${entity.id}-${mesh.uniqueId}`,
      scene
    )
    multiMaterial.subMaterials = [getEntityOutsideLayoutMaterial(scene), mesh.material]
    mesh.material = multiMaterial
  }
}

function removeOutsideLayoutMaterial(entity: EcsEntity, mesh: BABYLON.AbstractMesh) {
  if (
    mesh.material instanceof BABYLON.MultiMaterial &&
    mesh.material.name === `entity_outside_layout_multimaterial-${entity.id}-${mesh.uniqueId}`
  ) {
    const multiMaterial = mesh.material
    mesh.material = multiMaterial.subMaterials[1]
    multiMaterial.subMaterials = []
    multiMaterial.dispose()
  }
}

function getEntityOutsideLayoutMaterial(scene: BABYLON.Scene) {
  let material = scene.getMaterialByName('entity_outside_layout')
  if (material) {
    return material
  }
  // Material for entity outside layout
  material = new BABYLON.StandardMaterial('entity_outside_layout', scene)
  ;(material as BABYLON.StandardMaterial).diffuseColor = new BABYLON.Color3(1, 0, 0)
  material.backFaceCulling = false
  return material
}
