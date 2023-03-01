import * as BABYLON from '@babylonjs/core'
import { ComponentDefinition, Entity, PBGltfContainer, PBMeshRenderer, PBPointerEvents, TransformType } from '@dcl/ecs'
import { SceneContext } from './SceneContext'
import { createDefaultTransform } from './sdkComponents/transform'

export type EcsComponents = Partial<{
  transform: TransformType
  meshRenderer: PBMeshRenderer
  pointerEvents: PBPointerEvents
  gltfContainer: PBGltfContainer
}>

export class EcsEntity extends BABYLON.TransformNode {
  readonly isDCLEntity = true
  usedComponents = new Map<number, ComponentDefinition<unknown>>()

  meshRenderer?: BABYLON.AbstractMesh
  gltfContainer?: BABYLON.AbstractMesh
  gltfAssetContainer?: BABYLON.AssetContainer

  ecsComponentValues: EcsComponents = {}

  constructor(public entityId: Entity, public context: WeakRef<SceneContext>, scene: BABYLON.Scene) {
    super(`ecs-${entityId.toString(16)}`, scene)
    createDefaultTransform(this)
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
