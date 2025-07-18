import { Vector3, TransformNode, Scene, UtilityLayerRenderer, PointerDragBehavior, AbstractMesh } from '@babylonjs/core'
import { Entity } from '@dcl/ecs'
import { EcsEntity } from '../EcsEntity'
import { IGizmoTransformer } from './types'
import { LEFT_BUTTON } from '../mouse-utils'
import { snapVector } from '../snap-manager'

export class FreeGizmo implements IGizmoTransformer {
  private selectedEntities: EcsEntity[] = []
  private dragBehavior: PointerDragBehavior
  private pivotPosition: Vector3 | null = null
  private entityOffsets = new Map<Entity, Vector3>()
  private isDragging = false
  private onDragEndCallback: (() => void) | null = null
  private updateEntityPosition: ((entity: EcsEntity) => void) | null = null
  private dispatchOperations: (() => void) | null = null
  // This property is not used in the free gizmo, but it is required by the IGizmoTransformer interface
  private isWorldAligned = true
  private dragStartObserver: any = null
  private dragObserver: any = null
  private dragEndObserver: any = null
  private snapDistance = 0
  private lastSnappedPivotPosition: Vector3 | null = null

  constructor(private scene: Scene, private utilityLayer: UtilityLayerRenderer = new UtilityLayerRenderer(scene)) {
    this.dragBehavior = new PointerDragBehavior({ dragPlaneNormal: new Vector3(0, 1, 0) })
    this.dragBehavior.useObjectOrientationForDragging = false
    // Configure drag behavior to only work with left click
    this.dragBehavior.dragButtons = [LEFT_BUTTON]
    this.dragBehavior.moveAttached = false // disable object following the cursor...
  }

  setup(): void {
    this.cleanup()
    this.setupSceneObservers()
  }

  enable(): void {
    this.setupDragObservers()
  }

  cleanup(): void {
    this.removeSceneObservers()
    this.cleanupDragObservers()
    this.detachDragBehavior()
    this.selectedEntities = []
    this.pivotPosition = null
    this.lastSnappedPivotPosition = null
    this.entityOffsets.clear()
    this.isDragging = false
    this.onDragEndCallback = null
    this.updateEntityPosition = null
    this.dispatchOperations = null
  }

  setEntities(entities: EcsEntity[]): void {
    this.selectedEntities = entities
  }

  setUpdateCallbacks(updateEntityPosition: (entity: EcsEntity) => void, dispatchOperations: () => void): void {
    this.updateEntityPosition = updateEntityPosition
    this.dispatchOperations = dispatchOperations
  }

  setWorldAligned(value: boolean): void {
    // For free gizmo, world alignment is not used
    this.isWorldAligned = value
  }

  setSnapDistance(distance: number): void {
    this.snapDistance = distance
  }

  setOnDragEndCallback(callback: () => void): void {
    this.onDragEndCallback = callback
  }

  private setupSceneObservers(): void {
    this.scene.onPointerDown = (_event, pickResult) => {
      if (!pickResult.pickedMesh || this.selectedEntities.length === 0) return
      const clickedEntity = this.findClickedEntity(pickResult.pickedMesh)
      if (!clickedEntity) return
      this.startDrag(clickedEntity, pickResult.pickedMesh)
    }
    this.scene.onPointerUp = () => {
      if (this.isDragging) {
        this.endDrag()
      }
    }
  }

  private removeSceneObservers(): void {
    this.scene.onPointerDown = () => {}
    this.scene.onPointerUp = () => {}
  }

  private setupDragObservers(): void {
    this.dragStartObserver = this.dragBehavior.onDragStartObservable.add(() => {
      this.isDragging = true
    })

    this.dragObserver = this.dragBehavior.onDragObservable.add((eventData) => {
      if (!this.isDragging || !eventData.delta || !this.pivotPosition || !this.lastSnappedPivotPosition) return

      this.updatePivotPosition(eventData.delta)

      if (this.shouldMoveEntities()) {
        this.moveEntitiesToPivot()
      }
    })

    this.dragEndObserver = this.dragBehavior.onDragEndObservable.add(() => {
      this.isDragging = false
      this.detachDragBehavior()
      this.dispatchOperations?.()
      this.onDragEndCallback?.()
    })
  }

  private cleanupDragObservers(): void {
    if (this.dragStartObserver) {
      this.dragBehavior.onDragStartObservable.remove(this.dragStartObserver)
      this.dragStartObserver = null
    }

    if (this.dragObserver) {
      this.dragBehavior.onDragObservable.remove(this.dragObserver)
      this.dragObserver = null
    }

    if (this.dragEndObserver) {
      this.dragBehavior.onDragEndObservable.remove(this.dragEndObserver)
      this.dragEndObserver = null
    }
  }

  private detachDragBehavior(): void {
    this.dragBehavior.detach()
  }
  private updatePivotPosition(delta: Vector3): void {
    const worldDelta = delta.clone()
    worldDelta.y = 0 // keep Y position unchanged for free gizmo
    this.pivotPosition!.addInPlace(worldDelta)
  }

  // determines if entities should be moved based on snap distance
  private shouldMoveEntities(): boolean {
    if (this.snapDistance <= 0) return true

    const distanceFromLastSnapped = Vector3.Distance(this.pivotPosition!, this.lastSnappedPivotPosition!)
    return distanceFromLastSnapped >= this.snapDistance
  }

  // moves all entities to the current pivot position with snapping applied
  private moveEntitiesToPivot(): void {
    const finalPivotPosition = this.getSnappedPivotPosition()

    for (const entity of this.selectedEntities) {
      const offset = this.entityOffsets.get(entity.entityId)
      if (!offset) continue

      const newWorldPosition = finalPivotPosition.add(offset)
      this.applyWorldPositionToEntity(entity, newWorldPosition)
    }

    if (this.updateEntityPosition) {
      this.selectedEntities.forEach(this.updateEntityPosition)
    }
  }

  private getSnappedPivotPosition(): Vector3 {
    if (this.snapDistance <= 0) return this.pivotPosition!

    const snappedPivotPosition = snapVector(this.pivotPosition!, this.snapDistance)
    snappedPivotPosition.y = this.pivotPosition!.y // preserve Y position
    this.lastSnappedPivotPosition = snappedPivotPosition.clone()

    return snappedPivotPosition
  }

  private initializePivotPosition(): void {
    this.pivotPosition = new Vector3()
    for (const entity of this.selectedEntities) {
      this.pivotPosition.addInPlace(entity.getAbsolutePosition())
    }
    this.pivotPosition.scaleInPlace(1 / this.selectedEntities.length)
    this.lastSnappedPivotPosition = this.pivotPosition.clone()
  }

  // initializes entity offsets from the pivot position
  private initializeEntityOffsets(): void {
    this.entityOffsets.clear()
    for (const entity of this.selectedEntities) {
      const offset = entity.getAbsolutePosition().subtract(this.pivotPosition!)
      this.entityOffsets.set(entity.entityId, offset)
    }
  }

  private attachDragBehavior(clickedEntity: EcsEntity, pickedMesh: AbstractMesh): void {
    const dragMesh = this.getDragMesh(clickedEntity, pickedMesh)
    this.dragBehavior.attach(dragMesh)
  }

  private getDragMesh(clickedEntity: EcsEntity, pickedMesh: AbstractMesh): AbstractMesh {
    if (clickedEntity.meshRenderer) {
      return clickedEntity.meshRenderer
    } else if (clickedEntity.gltfContainer) {
      return clickedEntity.gltfContainer
    } else {
      // fallback: find the first child mesh of the entity
      const childMeshes = clickedEntity.getChildMeshes()
      return childMeshes.length > 0 ? childMeshes[0] : pickedMesh
    }
  }

  private findClickedEntity(pickedMesh: AbstractMesh): EcsEntity | null {
    for (const entity of this.selectedEntities) {
      if (pickedMesh.isDescendantOf(entity)) {
        return entity
      }
    }

    const meshEntity = this.selectedEntities.find((entity) => {
      return entity.meshRenderer === pickedMesh || entity.gltfContainer === pickedMesh
    })
    if (meshEntity) return meshEntity

    return null
  }

  private startDrag(clickedEntity: EcsEntity, pickedMesh: AbstractMesh): void {
    this.initializePivotPosition()
    this.initializeEntityOffsets()
    this.attachDragBehavior(clickedEntity, pickedMesh)
  }

  private applyWorldPositionToEntity(entity: EcsEntity, worldPosition: Vector3): void {
    const parent = entity.parent instanceof TransformNode ? entity.parent : null
    if (parent) {
      const parentWorldMatrix = parent.getWorldMatrix()
      const parentWorldMatrixInverse = parentWorldMatrix.invert()
      const localPosition = Vector3.TransformCoordinates(worldPosition, parentWorldMatrixInverse)
      entity.position.copyFrom(localPosition)
    } else {
      entity.position.copyFrom(worldPosition)
    }

    // Force immediate world matrix update
    entity.computeWorldMatrix(true)

    // Update bounding info for the entity
    if (typeof (entity as any).refreshBoundingInfo === 'function') {
      ;(entity as any).refreshBoundingInfo()
    }

    // Update all child meshes to ensure proper synchronization
    if (typeof entity.getChildMeshes === 'function') {
      entity.getChildMeshes().forEach((mesh) => {
        if (typeof mesh.refreshBoundingInfo === 'function') {
          mesh.refreshBoundingInfo({})
        }
        if (typeof mesh.computeWorldMatrix === 'function') {
          mesh.computeWorldMatrix(true)
        }
      })
    }

    // Update bounding info mesh if it exists
    if ((entity as any).boundingInfoMesh) {
      const boundingInfoMesh = (entity as any).boundingInfoMesh
      if (typeof boundingInfoMesh.refreshBoundingInfo === 'function') {
        boundingInfoMesh.refreshBoundingInfo()
      }
      if (typeof boundingInfoMesh.computeWorldMatrix === 'function') {
        boundingInfoMesh.computeWorldMatrix(true)
      }
    }
  }

  private endDrag(): void {
    this.isDragging = false
    this.detachDragBehavior()
    this.pivotPosition = null
    this.entityOffsets.clear()
    if (this.onDragEndCallback) {
      this.onDragEndCallback()
    }
  }

  onDragStart(entities: EcsEntity[], _gizmoNode: TransformNode): void {
    this.selectedEntities = entities
    this.pivotPosition = null
    this.entityOffsets.clear()
    this.detachDragBehavior()
  }

  update(entities: EcsEntity[], _gizmoNode: TransformNode): void {
    if (entities !== this.selectedEntities) {
      this.selectedEntities = entities
      this.pivotPosition = null
      this.entityOffsets.clear()
      this.detachDragBehavior()
    }
  }

  onDragEnd(): void {
    this.cleanup()
  }

  dispose(): void {
    this.cleanup()
    this.utilityLayer.dispose()
  }
}
