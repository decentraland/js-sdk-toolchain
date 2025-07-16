import { Vector3, TransformNode, GizmoManager, Quaternion } from '@babylonjs/core'
import { Entity } from '@dcl/ecs'
import { EcsEntity } from '../EcsEntity'
import { IGizmoTransformer } from './types'

export class PositionGizmo implements IGizmoTransformer {
  private initialOffsets = new Map<Entity, Vector3>()
  private initialPositions = new Map<Entity, Vector3>()
  private initialScales = new Map<Entity, Vector3>()
  private initialRotations = new Map<Entity, Quaternion>()
  private pivotPosition: Vector3 | null = null
  private isDragging = false
  private dragStartObserver: any = null
  private dragObserver: any = null
  private dragEndObserver: any = null
  private currentEntities: EcsEntity[] = []
  private updateEntityPosition: ((entity: EcsEntity) => void) | null = null
  private dispatchOperations: (() => void) | null = null
  private isWorldAligned = true

  constructor(private gizmoManager: GizmoManager, private snapPosition: (position: Vector3) => Vector3) {}

  setup(): void {
    if (!this.gizmoManager.gizmos.positionGizmo) return
    const positionGizmo = this.gizmoManager.gizmos.positionGizmo
    positionGizmo.updateGizmoRotationToMatchAttachedMesh = !this.isWorldAligned

    // Don't setup drag observables here - they will be set up when the gizmo is enabled
  }

  enable(): void {
    if (!this.gizmoManager.gizmos.positionGizmo) return

    // Setup drag observables when the gizmo is enabled
    this.setupDragObservables()
  }

  cleanup(): void {
    if (!this.gizmoManager.gizmos.positionGizmo) return
    this.gizmoManager.positionGizmoEnabled = false

    // Clean up drag observables
    this.cleanupDragObservables()

    this.initialOffsets.clear()
    this.initialPositions.clear()
    this.initialScales.clear()
    this.initialRotations.clear()
    this.pivotPosition = null
    this.isDragging = false
    this.currentEntities = []
  }

  setEntities(entities: EcsEntity[]): void {
    this.currentEntities = entities
  }

  setUpdateCallbacks(updateEntityPosition: (entity: EcsEntity) => void, dispatchOperations: () => void): void {
    this.updateEntityPosition = updateEntityPosition
    this.dispatchOperations = dispatchOperations
  }

  setWorldAligned(value: boolean): void {
    this.isWorldAligned = value
    if (this.gizmoManager.gizmos.positionGizmo) {
      this.gizmoManager.gizmos.positionGizmo.updateGizmoRotationToMatchAttachedMesh = !value
    }

    // Apply the alignment to the current gizmo node
    if (this.gizmoManager.attachedNode && this.currentEntities.length > 0) {
      const gizmoNode = this.gizmoManager.attachedNode as TransformNode

      if (value) {
        // World aligned: reset to identity rotation
        if (gizmoNode.rotationQuaternion) {
          gizmoNode.rotationQuaternion.set(0, 0, 0, 1) // Quaternion.Identity()
        }
      } else {
        // Local aligned: sync with the first entity's rotation (if single entity)
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
        }
      }

      gizmoNode.computeWorldMatrix(true)
    }
  }

  setSnapDistance(distance: number): void {
    if (!this.gizmoManager.gizmos.positionGizmo) return
    this.gizmoManager.gizmos.positionGizmo.snapDistance = distance
  }

  private setupDragObservables(): void {
    if (!this.gizmoManager.gizmos.positionGizmo) return

    const positionGizmo = this.gizmoManager.gizmos.positionGizmo

    // Setup drag start
    this.dragStartObserver = positionGizmo.onDragStartObservable.add(() => {
      if (this.gizmoManager.attachedNode) {
        this.onDragStart(this.currentEntities, this.gizmoManager.attachedNode as TransformNode)
      }
    })

    // Setup drag update
    this.dragObserver = positionGizmo.onDragObservable.add(() => {
      if (this.gizmoManager.attachedNode) {
        this.update(this.currentEntities, this.gizmoManager.attachedNode as TransformNode)

        // Update ECS position on each drag update for real-time feedback
        if (this.updateEntityPosition) {
          this.currentEntities.forEach(this.updateEntityPosition)
        }
      }
    })

    // Setup drag end
    this.dragEndObserver = positionGizmo.onDragEndObservable.add(() => {
      this.onDragEnd()

      // Only dispatch operations at the end to avoid excessive ECS operations
      if (this.dispatchOperations) {
        this.dispatchOperations()
      }
    })
  }

  private cleanupDragObservables(): void {
    if (!this.gizmoManager.gizmos.positionGizmo) return

    const positionGizmo = this.gizmoManager.gizmos.positionGizmo

    if (this.dragStartObserver) {
      positionGizmo.onDragStartObservable.remove(this.dragStartObserver)
      this.dragStartObserver = null
    }

    if (this.dragObserver) {
      positionGizmo.onDragObservable.remove(this.dragObserver)
      this.dragObserver = null
    }

    if (this.dragEndObserver) {
      positionGizmo.onDragEndObservable.remove(this.dragEndObserver)
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

    // Store initial state for all entities
    this.initialOffsets.clear()
    this.initialPositions.clear()
    this.initialScales.clear()
    this.initialRotations.clear()

    for (const entity of entities) {
      const worldPosition = entity.getAbsolutePosition()

      // Store initial transforms
      this.initialPositions.set(entity.entityId, entity.position.clone())
      this.initialScales.set(entity.entityId, entity.scaling.clone())
      this.initialRotations.set(entity.entityId, entity.rotationQuaternion?.clone() || Quaternion.Identity())

      // Store offset from pivot (like Blender's relative positioning)
      const offset = worldPosition.subtract(this.pivotPosition)
      this.initialOffsets.set(entity.entityId, offset)
    }
  }

  update(entities: EcsEntity[], gizmoNode: TransformNode): void {
    if (!this.isDragging || !this.pivotPosition) return

    // Calculate the movement delta from the gizmo
    const movementDelta = gizmoNode.position.subtract(this.pivotPosition)

    for (const entity of entities) {
      const offset = this.initialOffsets.get(entity.entityId)
      const initialPosition = this.initialPositions.get(entity.entityId)
      const initialScale = this.initialScales.get(entity.entityId)
      const initialRotation = this.initialRotations.get(entity.entityId)

      if (!offset || !initialPosition || !initialScale || !initialRotation) continue

      // Calculate new world position: pivot + movement + offset
      const newWorldPosition = this.pivotPosition.add(movementDelta).add(offset)

      const parent = entity.parent instanceof TransformNode ? entity.parent : null

      if (parent) {
        // For child entities, convert world position to local space
        const parentWorldMatrix = parent.getWorldMatrix()
        const parentWorldMatrixInverse = parentWorldMatrix.clone().invert()

        // Convert world position to local space and apply snapping
        const localPosition = Vector3.TransformCoordinates(newWorldPosition, parentWorldMatrixInverse)
        const snappedLocalPosition = this.snapPosition(localPosition)

        // Apply transforms
        entity.position.copyFrom(snappedLocalPosition)
        entity.scaling.copyFrom(initialScale)
        if (!entity.rotationQuaternion) {
          entity.rotationQuaternion = new Quaternion()
        }
        entity.rotationQuaternion.copyFrom(initialRotation)
        entity.rotationQuaternion.normalize()
      } else {
        // For entities without parent, apply world position directly with snapping
        const snappedWorldPosition = this.snapPosition(newWorldPosition)
        entity.position.copyFrom(snappedWorldPosition)
        entity.scaling.copyFrom(initialScale)
        if (!entity.rotationQuaternion) {
          entity.rotationQuaternion = new Quaternion()
        }
        entity.rotationQuaternion.copyFrom(initialRotation)
        entity.rotationQuaternion.normalize()
      }

      // Force update world matrix
      entity.computeWorldMatrix(true)
    }
  }

  onDragEnd(): void {
    // Sync gizmo position with the final snapped positions of entities
    if (this.gizmoManager.attachedNode && this.currentEntities.length > 0) {
      const gizmoNode = this.gizmoManager.attachedNode as TransformNode

      // Calculate the centroid of all entities' current world positions
      const centroid = new Vector3()
      for (const entity of this.currentEntities) {
        const worldPosition = entity.getAbsolutePosition()
        centroid.addInPlace(worldPosition)
      }
      centroid.scaleInPlace(1 / this.currentEntities.length)

      // Update gizmo node to match the final snapped centroid
      gizmoNode.position.copyFrom(centroid)

      // Respect the world alignment setting when syncing gizmo rotation
      if (this.isWorldAligned) {
        // If world aligned, reset to identity rotation
        if (gizmoNode.rotationQuaternion) {
          gizmoNode.rotationQuaternion.set(0, 0, 0, 1) // Quaternion.Identity()
        }
      } else {
        // If not world aligned, sync with the first entity's rotation (if single entity)
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
        }
      }

      gizmoNode.computeWorldMatrix(true)
    }

    this.isDragging = false
    this.pivotPosition = null
    this.initialOffsets.clear()
    this.initialPositions.clear()
    this.initialScales.clear()
    this.initialRotations.clear()
  }
}
