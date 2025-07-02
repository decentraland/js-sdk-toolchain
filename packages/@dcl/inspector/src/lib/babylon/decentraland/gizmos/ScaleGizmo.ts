import { Vector3, TransformNode, GizmoManager, Quaternion, Matrix } from '@babylonjs/core'
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

  constructor(private gizmoManager: GizmoManager) {}

  setup(): void {
    if (!this.gizmoManager.gizmos.scaleGizmo) return
    const scaleGizmo = this.gizmoManager.gizmos.scaleGizmo
    scaleGizmo.snapDistance = 0
  }

  cleanup(): void {
    if (!this.gizmoManager.gizmos.scaleGizmo) return
    this.gizmoManager.scaleGizmoEnabled = false
    this.initialOffsets.clear()
    this.initialScales.clear()
    this.initialRotations.clear()
    this.initialPositions.clear()
    this.initialGizmoScale = null
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

        // Apply transforms
        entity.position.copyFrom(localPosition)
        entity.scaling.copyFrom(localScale)
        if (!entity.rotationQuaternion) {
          entity.rotationQuaternion = new Quaternion()
        }
        entity.rotationQuaternion.copyFrom(localRotation)
        entity.rotationQuaternion.normalize()
      } else {
        // For entities without parent, apply world transforms directly
        entity.position.copyFrom(newWorldPosition)
        entity.scaling.copyFrom(newWorldScale)
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
