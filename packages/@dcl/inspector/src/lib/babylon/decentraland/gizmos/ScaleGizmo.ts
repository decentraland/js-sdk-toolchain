import { Vector3, TransformNode, GizmoManager, Quaternion } from '@babylonjs/core'
import { Entity } from '@dcl/ecs'
import { EcsEntity } from '../EcsEntity'
import { IGizmoTransformer } from './types'

export class ScaleGizmo implements IGizmoTransformer {
  private initialOffsets = new Map<Entity, Vector3>()
  private initialScales = new Map<Entity, Vector3>()
  private initialRotations = new Map<Entity, Quaternion>()
  private initialPositions = new Map<Entity, Vector3>()
  private pivotPosition: Vector3 | null = null
  private initialGizmoScale: Vector3 | null = null
  private changeHandlers: (() => void)[] = []
  private isDragging = false
  private dragStartObserver: any = null
  private dragObserver: any = null
  private dragEndObserver: any = null
  private currentEntities: EcsEntity[] = []
  private updateEntityScale: ((entity: EcsEntity) => void) | null = null
  private dispatchOperations: (() => void) | null = null
  private isWorldAligned = true

  constructor(private gizmoManager: GizmoManager, private snapScale: (scale: Vector3) => Vector3) {}

  setup(): void {
    if (!this.gizmoManager.gizmos.scaleGizmo) return
    const scaleGizmo = this.gizmoManager.gizmos.scaleGizmo
    // Scale gizmo should always be locally aligned to the entity
    scaleGizmo.updateGizmoRotationToMatchAttachedMesh = true

    // Don't setup drag observables here - they will be set up when the gizmo is enabled
  }

  enable(): void {
    if (!this.gizmoManager.gizmos.scaleGizmo) return

    // Setup drag observables when the gizmo is enabled
    this.setupDragObservables()
  }

  cleanup(): void {
    if (!this.gizmoManager.gizmos.scaleGizmo) return
    this.gizmoManager.scaleGizmoEnabled = false

    // Clean up drag observables
    this.cleanupDragObservables()

    this.initialOffsets.clear()
    this.initialScales.clear()
    this.initialRotations.clear()
    this.initialPositions.clear()
    this.initialGizmoScale = null
    this.pivotPosition = null
    this.isDragging = false
    this.currentEntities = []
  }

  setEntities(entities: EcsEntity[]): void {
    this.currentEntities = entities
    // Sync gizmo alignment with the new entities (always local)
    this.syncGizmoAlignment()
  }

  setUpdateCallbacks(updateEntityScale: (entity: EcsEntity) => void, dispatchOperations: () => void): void {
    this.updateEntityScale = updateEntityScale
    this.dispatchOperations = dispatchOperations
  }

  setWorldAligned(value: boolean): void {
    // Scale gizmo should always be locally aligned, regardless of the parameter
    this.isWorldAligned = false
    if (this.gizmoManager.gizmos.scaleGizmo) {
      this.gizmoManager.gizmos.scaleGizmo.updateGizmoRotationToMatchAttachedMesh = true
    }

    // Sync gizmo alignment with the new entities (always local)
    this.syncGizmoAlignment()
  }

  private syncGizmoAlignment(): void {
    if (!this.gizmoManager.attachedNode || this.currentEntities.length === 0) return

    const gizmoNode = this.gizmoManager.attachedNode as TransformNode

    // Scale gizmo should always be locally aligned
    if (this.currentEntities.length === 1) {
      const entity = this.currentEntities[0]
      if (entity.rotationQuaternion && gizmoNode.rotationQuaternion) {
        // If the entity has a parent, convert to world rotation
        if (entity.parent && entity.parent instanceof TransformNode) {
          const parent = entity.parent as TransformNode
          const parentWorldRotation =
            parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
          const worldRotation = parentWorldRotation.multiply(entity.rotationQuaternion)
          gizmoNode.rotationQuaternion.copyFrom(worldRotation)
        } else {
          // If no parent, apply directly
          gizmoNode.rotationQuaternion.copyFrom(entity.rotationQuaternion)
        }
      }
    } else {
      // For multiple entities, always reset to identity rotation
      // This provides a consistent reference point for scaling operations
      if (gizmoNode.rotationQuaternion) {
        gizmoNode.rotationQuaternion.set(0, 0, 0, 1) // Quaternion.Identity()
      }
    }

    gizmoNode.computeWorldMatrix(true)
  }

  private setupDragObservables(): void {
    if (!this.gizmoManager.gizmos.scaleGizmo) return

    const scaleGizmo = this.gizmoManager.gizmos.scaleGizmo

    // Setup drag start
    this.dragStartObserver = scaleGizmo.onDragStartObservable.add(() => {
      console.log('[ScaleGizmo] Scale drag start')
      if (this.gizmoManager.attachedNode) {
        this.onDragStart(this.currentEntities, this.gizmoManager.attachedNode as TransformNode)
      }
    })

    // Setup drag update
    this.dragObserver = scaleGizmo.onDragObservable.add(() => {
      if (this.gizmoManager.attachedNode) {
        this.update(this.currentEntities, this.gizmoManager.attachedNode as TransformNode)

        // Update ECS scale on each drag update for real-time feedback
        if (this.updateEntityScale) {
          this.currentEntities.forEach(this.updateEntityScale)
        }
      }
    })

    // Setup drag end
    this.dragEndObserver = scaleGizmo.onDragEndObservable.add(() => {
      console.log('[ScaleGizmo] Scale drag end')
      this.onDragEnd()

      // Only dispatch operations at the end to avoid excessive ECS operations
      if (this.dispatchOperations) {
        this.dispatchOperations()
      }
    })
  }

  private cleanupDragObservables(): void {
    if (!this.gizmoManager.gizmos.scaleGizmo) return

    const scaleGizmo = this.gizmoManager.gizmos.scaleGizmo

    if (this.dragStartObserver) {
      scaleGizmo.onDragStartObservable.remove(this.dragStartObserver)
      this.dragStartObserver = null
    }

    if (this.dragObserver) {
      scaleGizmo.onDragObservable.remove(this.dragObserver)
      this.dragObserver = null
    }

    if (this.dragEndObserver) {
      scaleGizmo.onDragEndObservable.remove(this.dragEndObserver)
      this.dragEndObserver = null
    }
  }

  onDragStart(entities: EcsEntity[], gizmoNode: TransformNode): void {
    if (this.isDragging) return

    this.isDragging = true

    // Calculate pivot position (centroid of all selected entities)
    this.pivotPosition = new Vector3()
    for (const entity of entities) {
      const worldPosition = entity.getAbsolutePosition()
      this.pivotPosition.addInPlace(worldPosition)
    }
    this.pivotPosition.scaleInPlace(1 / entities.length)

    // Store initial gizmo scale
    this.initialGizmoScale = gizmoNode.scaling.clone()

    // Store initial state for all entities
    this.initialOffsets.clear()
    this.initialScales.clear()
    this.initialRotations.clear()
    this.initialPositions.clear()

    for (const entity of entities) {
      const worldPosition = entity.getAbsolutePosition()

      // Store initial transforms
      this.initialPositions.set(entity.entityId, entity.position.clone())
      this.initialScales.set(entity.entityId, entity.scaling.clone())
      this.initialRotations.set(entity.entityId, entity.rotationQuaternion?.clone() || Quaternion.Identity())

      // Store offset from pivot (for proportional scaling)
      const offset = worldPosition.subtract(this.pivotPosition)
      this.initialOffsets.set(entity.entityId, offset)
    }
  }

  update(entities: EcsEntity[], gizmoNode: TransformNode): void {
    if (!this.isDragging || !this.initialGizmoScale || !this.pivotPosition) return

    // Calculate scale change from gizmo
    const scaleChange = new Vector3(
      gizmoNode.scaling.x / this.initialGizmoScale.x,
      gizmoNode.scaling.y / this.initialGizmoScale.y,
      gizmoNode.scaling.z / this.initialGizmoScale.z
    )

    for (const entity of entities) {
      const offset = this.initialOffsets.get(entity.entityId)
      const initialScale = this.initialScales.get(entity.entityId)
      const initialRotation = this.initialRotations.get(entity.entityId)
      const initialPosition = this.initialPositions.get(entity.entityId)

      if (!offset || !initialScale || !initialRotation || !initialPosition) continue

      // Scale the offset proportionally (like Blender's proportional scaling)
      const scaledOffset = new Vector3(offset.x * scaleChange.x, offset.y * scaleChange.y, offset.z * scaleChange.z)
      const newWorldPosition = this.pivotPosition.add(scaledOffset)

      // Scale the entity's scale
      const newWorldScale = new Vector3(
        initialScale.x * scaleChange.x,
        initialScale.y * scaleChange.y,
        initialScale.z * scaleChange.z
      )

      const parent = entity.parent instanceof TransformNode ? entity.parent : null

      if (parent) {
        // For child entities, convert world transforms to local space
        const parentWorldMatrix = parent.getWorldMatrix()
        const parentWorldMatrixInverse = parentWorldMatrix.clone().invert()
        const parentWorldRotation = parent.rotationQuaternion || Quaternion.FromRotationMatrix(parentWorldMatrix)

        // Convert world position to local space
        const localPosition = Vector3.TransformCoordinates(newWorldPosition, parentWorldMatrixInverse)

        // Convert world rotation to local space
        const localRotation = parentWorldRotation.invert().multiply(initialRotation)

        // Apply scale directly to the child without considering parent's scale
        // This maintains the local scale as intended by the user
        const localScale = new Vector3(
          initialScale.x * scaleChange.x,
          initialScale.y * scaleChange.y,
          initialScale.z * scaleChange.z
        )
        const snappedLocalScale = this.snapScale(localScale)

        // Apply transforms
        entity.position.copyFrom(localPosition)
        entity.scaling.copyFrom(snappedLocalScale)
        if (!entity.rotationQuaternion) {
          entity.rotationQuaternion = new Quaternion()
        }
        entity.rotationQuaternion.copyFrom(localRotation)
        entity.rotationQuaternion.normalize()
      } else {
        // For entities without parent, apply world transforms directly
        entity.position.copyFrom(newWorldPosition)
        const snappedWorldScale = this.snapScale(newWorldScale)
        entity.scaling.copyFrom(snappedWorldScale)
        if (!entity.rotationQuaternion) {
          entity.rotationQuaternion = new Quaternion()
        }
        entity.rotationQuaternion.copyFrom(initialRotation)
        entity.rotationQuaternion.normalize()
      }

      // Force update world matrix
      entity.computeWorldMatrix(true)
    }

    // Notify change handlers
    this.changeHandlers.forEach((handler) => handler())
  }

  onDragEnd(): void {
    // Sync gizmo scale with the final snapped scales of entities
    if (this.gizmoManager.attachedNode) {
      const gizmoNode = this.gizmoManager.attachedNode as TransformNode

      // Reset gizmo scale to identity after scaling is complete
      // This ensures the gizmo doesn't accumulate scale changes
      gizmoNode.scaling.set(1, 1, 1)

      // Scale gizmo should always be locally aligned
      if (this.currentEntities.length === 1) {
        const entity = this.currentEntities[0]
        if (entity.rotationQuaternion && gizmoNode.rotationQuaternion) {
          // If the entity has a parent, convert to world rotation
          if (entity.parent && entity.parent instanceof TransformNode) {
            const parent = entity.parent as TransformNode
            const parentWorldRotation =
              parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
            const worldRotation = parentWorldRotation.multiply(entity.rotationQuaternion)
            gizmoNode.rotationQuaternion.copyFrom(worldRotation)
          } else {
            // If no parent, apply directly
            gizmoNode.rotationQuaternion.copyFrom(entity.rotationQuaternion)
          }
        }
      } else {
        // For multiple entities, always reset to identity rotation
        // This provides a consistent reference point for scaling operations
        if (gizmoNode.rotationQuaternion) {
          gizmoNode.rotationQuaternion.set(0, 0, 0, 1) // Quaternion.Identity()
        }
      }

      gizmoNode.computeWorldMatrix(true)
    }

    this.isDragging = false
    this.initialGizmoScale = null
    this.pivotPosition = null
    this.initialOffsets.clear()
    this.initialScales.clear()
    this.initialRotations.clear()
    this.initialPositions.clear()
  }

  onChange(callback: () => void): () => void {
    this.changeHandlers.push(callback)
    return () => {
      const index = this.changeHandlers.indexOf(callback)
      if (index !== -1) {
        this.changeHandlers.splice(index, 1)
      }
    }
  }
}
