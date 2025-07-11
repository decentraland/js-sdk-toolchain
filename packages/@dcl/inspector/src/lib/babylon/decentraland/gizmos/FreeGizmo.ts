import {
  Vector3,
  TransformNode,
  Scene,
  UtilityLayerRenderer,
  PointerDragBehavior,
  PickingInfo,
  AbstractMesh
} from '@babylonjs/core'
import { Entity } from '@dcl/ecs'
import { EcsEntity } from '../EcsEntity'
import { IGizmoTransformer } from './types'

export class FreeGizmo implements IGizmoTransformer {
  private changeHandlers: (() => void)[] = []
  private selectedEntities: EcsEntity[] = []
  private gizmoNode: TransformNode | null = null
  private dragBehavior: PointerDragBehavior
  private pivotPosition: Vector3 | null = null
  private entityOffsets = new Map<Entity, Vector3>()
  private isDragging = false
  private onDragEndCallback: (() => void) | null = null

  constructor(private scene: Scene, private utilityLayer: UtilityLayerRenderer = new UtilityLayerRenderer(scene)) {
    this.dragBehavior = new PointerDragBehavior({ dragPlaneNormal: new Vector3(0, 1, 0) })
    this.dragBehavior.useObjectOrientationForDragging = false
    this.setupDragObservers()
  }

  setup(): void {
    this.cleanup()
    this.setupSceneObservers()
  }

  cleanup(): void {
    this.removeSceneObservers()
    this.detachDragBehavior()
    this.selectedEntities = []
    this.gizmoNode = null
    this.pivotPosition = null
    this.entityOffsets.clear()
    this.isDragging = false
    this.onDragEndCallback = null
  }

  setEntities(entities: EcsEntity[]): void {
    this.selectedEntities = entities
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
    this.dragBehavior.onDragStartObservable.add(() => {
      this.isDragging = true
      this.notifyChange()
    })
    this.dragBehavior.onDragObservable.add((eventData) => {
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
    })
    this.dragBehavior.onDragEndObservable.add(() => {
      this.isDragging = false
      this.detachDragBehavior()
      this.notifyChange()
      if (this.onDragEndCallback) {
        this.onDragEndCallback()
      }
    })
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

  private startDrag(clickedEntity: EcsEntity, pickedMesh: AbstractMesh): void {
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
    this.notifyChange()
    if (this.onDragEndCallback) {
      this.onDragEndCallback()
    }
  }

  onDragStart(entities: EcsEntity[], gizmoNode: TransformNode): void {
    this.selectedEntities = entities
    this.gizmoNode = gizmoNode
    this.pivotPosition = null
    this.entityOffsets.clear()
    this.detachDragBehavior()
  }

  onChange(callback: () => void): () => void {
    this.changeHandlers.push(callback)
    return () => {
      const index = this.changeHandlers.indexOf(callback)
      if (index !== -1) this.changeHandlers.splice(index, 1)
    }
  }

  update(entities: EcsEntity[], gizmoNode: TransformNode): void {
    if (entities !== this.selectedEntities) {
      this.selectedEntities = entities
      this.pivotPosition = null
      this.entityOffsets.clear()
      this.detachDragBehavior()
    }
    if (gizmoNode !== this.gizmoNode) {
      this.gizmoNode = gizmoNode
    }
  }

  onDragEnd(): void {
    this.cleanup()
  }

  dispose(): void {
    this.cleanup()
    this.utilityLayer.dispose()
  }

  private notifyChange(): void {
    for (const handler of this.changeHandlers) {
      handler()
    }
  }
}
