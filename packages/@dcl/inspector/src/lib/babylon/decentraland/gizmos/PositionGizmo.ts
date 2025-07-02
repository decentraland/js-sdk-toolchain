import { Vector3, TransformNode, GizmoManager, Matrix, Quaternion } from '@babylonjs/core'
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
  private changeHandlers: (() => void)[] = []

  constructor(private gizmoManager: GizmoManager) {}

  setup(): void {
    if (!this.gizmoManager.gizmos.positionGizmo) return
    const positionGizmo = this.gizmoManager.gizmos.positionGizmo
    positionGizmo.snapDistance = 0
  }

  cleanup(): void {
    if (!this.gizmoManager.gizmos.positionGizmo) return
    this.gizmoManager.positionGizmoEnabled = false
    this.initialOffsets.clear()
    this.initialPositions.clear()
    this.initialScales.clear()
    this.initialRotations.clear()
    this.pivotPosition = null
    this.isDragging = false
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

        // Convert world position to local space
        const localPosition = Vector3.TransformCoordinates(newWorldPosition, parentWorldMatrixInverse)

        // Apply transforms
        entity.position.copyFrom(localPosition)
        entity.scaling.copyFrom(initialScale)
        if (!entity.rotationQuaternion) {
          entity.rotationQuaternion = new Quaternion()
        }
        entity.rotationQuaternion.copyFrom(initialRotation)
        entity.rotationQuaternion.normalize()
      } else {
        // For entities without parent, apply world position directly
        entity.position.copyFrom(newWorldPosition)
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

    // Notify change handlers
    this.changeHandlers.forEach((handler) => handler())
  }

  onDragEnd(): void {
    this.isDragging = false
    this.pivotPosition = null
    this.initialOffsets.clear()
    this.initialPositions.clear()
    this.initialScales.clear()
    this.initialRotations.clear()
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
