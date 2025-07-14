import { Vector3, TransformNode, Scene, UtilityLayerRenderer, PointerDragBehavior, AbstractMesh } from '@babylonjs/core'
import { Entity } from '@dcl/ecs'
import { EcsEntity } from '../EcsEntity'
import { IGizmoTransformer } from './types'

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

  constructor(private scene: Scene, private utilityLayer: UtilityLayerRenderer = new UtilityLayerRenderer(scene)) {
    this.dragBehavior = new PointerDragBehavior({ dragPlaneNormal: new Vector3(0, 1, 0) })
    this.dragBehavior.useObjectOrientationForDragging = false
  }

  setup(): void {
    this.cleanup()
    this.setupSceneObservers()
  }

  enable(): void {
    // Setup drag observables when the gizmo is enabled
    this.setupDragObservers()
  }

  cleanup(): void {
    this.removeSceneObservers()
    this.cleanupDragObservers()
    this.detachDragBehavior()
    this.selectedEntities = []
    this.pivotPosition = null
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

  // Add method to set drag end callback
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
    // Setup drag start
    this.dragStartObserver = this.dragBehavior.onDragStartObservable.add(() => {
      this.isDragging = true
    })

    // Setup drag update
    this.dragObserver = this.dragBehavior.onDragObservable.add((eventData) => {
      if (!this.isDragging || !eventData.delta || !this.pivotPosition) return
      const worldDelta = eventData.delta.clone()
      worldDelta.y = 0
      this.pivotPosition.addInPlace(worldDelta)
      for (const entity of this.selectedEntities) {
        const offset = this.entityOffsets.get(entity.entityId)
        if (!offset) continue
        const newWorldPosition = this.pivotPosition.add(offset)
        this.applyWorldPositionToEntity(entity, newWorldPosition)
      }

      // Update ECS position on each drag update for real-time feedback
      if (this.updateEntityPosition) {
        this.selectedEntities.forEach(this.updateEntityPosition)
      }
    })

    // Setup drag end
    this.dragEndObserver = this.dragBehavior.onDragEndObservable.add(() => {
      this.isDragging = false
      this.detachDragBehavior()

      // Only dispatch operations at the end to avoid excessive ECS operations
      if (this.dispatchOperations) {
        this.dispatchOperations()
      }

      if (this.onDragEndCallback) {
        this.onDragEndCallback()
      }
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

  private findClickedEntity(pickedMesh: AbstractMesh): EcsEntity | null {
    return (
      this.selectedEntities.find((entity) => {
        const isDescendant = pickedMesh.isDescendantOf(entity)
        const isMeshRenderer = entity.meshRenderer === pickedMesh
        const isGltfContainer = entity.gltfContainer === pickedMesh
        return isDescendant || isMeshRenderer || isGltfContainer
      }) || null
    )
  }

  private startDrag(_clickedEntity: EcsEntity, pickedMesh: AbstractMesh): void {
    // Calculate pivot (centroid)
    this.pivotPosition = new Vector3()
    for (const entity of this.selectedEntities) {
      this.pivotPosition.addInPlace(entity.getAbsolutePosition())
    }
    this.pivotPosition.scaleInPlace(1 / this.selectedEntities.length)
    // Store offsets
    this.entityOffsets.clear()
    for (const entity of this.selectedEntities) {
      const offset = entity.getAbsolutePosition().subtract(this.pivotPosition)
      this.entityOffsets.set(entity.entityId, offset)
    }
    // Attach drag behavior to the picked mesh
    this.dragBehavior.attach(pickedMesh)
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
    entity.computeWorldMatrix(true)
    // Only call refreshBoundingInfo if it exists
    if (typeof (entity as any).refreshBoundingInfo === 'function') {
      ;(entity as any).refreshBoundingInfo()
    }
    if (typeof entity.getChildMeshes === 'function') {
      entity.getChildMeshes().forEach((mesh) => {
        if (typeof mesh.refreshBoundingInfo === 'function') {
          mesh.refreshBoundingInfo({})
        }
      })
    }
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
