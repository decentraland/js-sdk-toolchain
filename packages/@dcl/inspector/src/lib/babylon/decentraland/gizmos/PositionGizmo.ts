import { Vector3, TransformNode, GizmoManager, Matrix, Quaternion } from '@babylonjs/core'
import { Entity } from '@dcl/ecs'
import { EcsEntity } from '../EcsEntity'
import { IGizmoTransformer } from './types'
import { TransformUtils } from './utils'

export class PositionGizmo implements IGizmoTransformer {
  private initialOffsets = new Map<Entity, Vector3>()
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
    this.isDragging = false
  }

  onDragStart(entities: EcsEntity[], gizmoNode: TransformNode): void {
    console.log('[PositionGizmo] onDragStart with entities:', entities.length)
    this.isDragging = true
    const centroid = gizmoNode.position.clone()
    this.initialOffsets.clear()

    for (const entity of entities) {
      const worldPosition = entity.getAbsolutePosition()
      const offset = worldPosition.subtract(centroid)
      this.initialOffsets.set(entity.entityId, offset)
    }
  }

  update(entities: EcsEntity[], gizmoNode: TransformNode): void {
    if (!this.isDragging) return

    console.log('[PositionGizmo] Updating entities:', entities.length)
    for (const entity of entities) {
      const offset = this.initialOffsets.get(entity.entityId)
      if (!offset) continue

      // Calculate new world position based on gizmo movement
      const newWorldPosition = gizmoNode.position.add(offset)

      // Convert to local space if entity has a parent
      const parent = entity.parent instanceof TransformNode ? entity.parent : null
      if (parent) {
        // Get parent's world matrix and decompose it
        const parentWorldMatrix = parent.getWorldMatrix()
        const parentScale = new Vector3()
        const parentRotation = new Quaternion()
        const parentPosition = new Vector3()
        parentWorldMatrix.decompose(parentScale, parentRotation, parentPosition)

        // Create inverse matrix considering scale
        const scaleMatrix = Matrix.Scaling(1 / parentScale.x, 1 / parentScale.y, 1 / parentScale.z)
        const rotationMatrix = Matrix.FromQuaternionToRef(parentRotation.invert(), new Matrix())
        const translationMatrix = Matrix.Translation(-parentPosition.x, -parentPosition.y, -parentPosition.z)

        const worldToLocalMatrix = scaleMatrix.multiply(rotationMatrix).multiply(translationMatrix)

        // Transform world position to local space
        const localPosition = Vector3.TransformCoordinates(newWorldPosition, worldToLocalMatrix)
        entity.position.copyFrom(localPosition)
      } else {
        entity.position.copyFrom(newWorldPosition)
      }

      // Force update world matrix
      entity.computeWorldMatrix(true)
    }

    // Notify change handlers
    this.changeHandlers.forEach((handler) => handler())
  }

  onDragEnd(): void {
    this.isDragging = false
    this.initialOffsets.clear()
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
