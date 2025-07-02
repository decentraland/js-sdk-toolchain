import { Vector3, TransformNode, Quaternion, Matrix, GizmoManager } from '@babylonjs/core'
import { Entity } from '@dcl/ecs'
import { EcsEntity } from '../EcsEntity'
import { IGizmoTransformer } from './types'
import { TransformUtils } from './utils'

export class RotationGizmo implements IGizmoTransformer {
  private initialOffsets = new Map<Entity, Vector3>()
  private initialRotations = new Map<Entity, Quaternion>()
  private initialWorldScales = new Map<Entity, Vector3>()
  private initialGizmoRotation: Quaternion | null = null
  private changeHandlers: (() => void)[] = []
  private isDragging = false

  constructor(private gizmoManager: GizmoManager) {}

  setup(): void {
    if (!this.gizmoManager.gizmos.rotationGizmo) return
    const rotationGizmo = this.gizmoManager.gizmos.rotationGizmo
    rotationGizmo.snapDistance = 0

    // Reset state
    this.isDragging = false
    this.initialGizmoRotation = null
    this.initialOffsets.clear()
    this.initialRotations.clear()
    this.initialWorldScales.clear()
  }

  cleanup(): void {
    if (!this.gizmoManager.gizmos.rotationGizmo) return
    this.gizmoManager.rotationGizmoEnabled = false
    this.initialOffsets.clear()
    this.initialRotations.clear()
    this.initialWorldScales.clear()
    this.initialGizmoRotation = null
    this.isDragging = false
  }

  private getEntityWorldMatrix(entity: EcsEntity): Matrix {
    return entity.computeWorldMatrix(true)
  }

  private decomposeWorldMatrix(worldMatrix: Matrix): { position: Vector3; rotation: Quaternion; scale: Vector3 } {
    const position = new Vector3()
    const rotation = new Quaternion()
    const scale = new Vector3()
    worldMatrix.decompose(scale, rotation, position)
    return { position, rotation, scale }
  }

  onDragStart(entities: EcsEntity[], gizmoNode: TransformNode): void {
    if (this.isDragging) {
      return
    }

    // Initialize gizmo rotation from entity if this is a new selection
    if (entities.length === 1) {
      const entity = entities[0]
      if (entity.rotationQuaternion) {
        const worldMatrix = this.getEntityWorldMatrix(entity)
        const { rotation: worldRotation } = this.decomposeWorldMatrix(worldMatrix)

        if (!gizmoNode.rotationQuaternion) {
          gizmoNode.rotationQuaternion = new Quaternion()
        }
        gizmoNode.rotationQuaternion.copyFrom(worldRotation)
        gizmoNode.computeWorldMatrix(true)
      }
    }

    this.isDragging = true
    const centroid = gizmoNode.position.clone()
    this.initialOffsets.clear()
    this.initialRotations.clear()
    this.initialWorldScales.clear()

    // Store initial gizmo rotation
    this.initialGizmoRotation = gizmoNode.rotationQuaternion
      ? gizmoNode.rotationQuaternion.clone()
      : Quaternion.Identity()

    for (const entity of entities) {
      // Get current world state
      const worldMatrix = this.getEntityWorldMatrix(entity)
      const {
        position: worldPosition,
        rotation: worldRotation,
        scale: worldScale
      } = this.decomposeWorldMatrix(worldMatrix)

      // Store initial world position offset
      const offset = worldPosition.subtract(centroid)
      this.initialOffsets.set(entity.entityId, offset)

      // Store initial world rotation
      this.initialRotations.set(entity.entityId, worldRotation)

      // Store initial world scale
      this.initialWorldScales.set(entity.entityId, worldScale)
    }
  }

  update(entities: EcsEntity[], gizmoNode: TransformNode): void {
    if (!this.isDragging || !this.initialGizmoRotation || !gizmoNode.rotationQuaternion) return

    // Calculate total rotation from initial state
    const rotationDelta = this.initialGizmoRotation.invert().multiply(gizmoNode.rotationQuaternion)

    for (const entity of entities) {
      const offset = this.initialOffsets.get(entity.entityId)
      const initialRotation = this.initialRotations.get(entity.entityId)
      const initialWorldScale = this.initialWorldScales.get(entity.entityId)
      if (!offset || !initialRotation || !initialWorldScale) continue

      // Rotate the offset around the gizmo
      const rotatedOffset = Vector3.Zero()
      offset.rotateByQuaternionToRef(rotationDelta, rotatedOffset)
      const newWorldPosition = gizmoNode.position.add(rotatedOffset)

      // Calculate new world rotation considering scale
      const parent = entity.parent instanceof TransformNode ? entity.parent : null

      if (parent) {
        // Get parent's world state
        const parentWorldMatrix = parent.getWorldMatrix()
        const parentDecomposed = this.decomposeWorldMatrix(parentWorldMatrix)

        // Create scale compensation matrix
        const scaleCompensation = Matrix.Scaling(
          1 / parentDecomposed.scale.x,
          1 / parentDecomposed.scale.y,
          1 / parentDecomposed.scale.z
        )

        // Apply rotation with scale compensation
        const compensatedRotation = initialRotation.multiply(Quaternion.FromRotationMatrix(scaleCompensation))
        const newWorldRotation = compensatedRotation.multiply(rotationDelta)

        // Convert world transforms to local space
        const localPosition = TransformUtils.convertToLocalPosition(newWorldPosition, parent)
        const localRotation = TransformUtils.convertToLocalRotation(newWorldRotation, parent)

        // Apply transforms
        entity.position.copyFrom(localPosition)
        if (!entity.rotationQuaternion) {
          entity.rotationQuaternion = new Quaternion()
        }
        entity.rotationQuaternion.copyFrom(localRotation)
        entity.rotationQuaternion.normalize()

        // Maintain original world scale
        const localScale = new Vector3(
          initialWorldScale.x / parentDecomposed.scale.x,
          initialWorldScale.y / parentDecomposed.scale.y,
          initialWorldScale.z / parentDecomposed.scale.z
        )
        entity.scaling.copyFrom(localScale)
      } else {
        // No parent, use world space directly
        entity.position.copyFrom(newWorldPosition)
        const newWorldRotation = initialRotation.multiply(rotationDelta)
        if (!entity.rotationQuaternion) {
          entity.rotationQuaternion = new Quaternion()
        }
        entity.rotationQuaternion.copyFrom(newWorldRotation)
        entity.rotationQuaternion.normalize()
        entity.scaling.copyFrom(initialWorldScale)
      }

      // Force update world matrix
      entity.computeWorldMatrix(true)

      // Notify change handlers
      this.changeHandlers.forEach((handler) => handler())
    }
  }

  onDragEnd(): void {
    this.isDragging = false
    this.initialOffsets.clear()
    this.initialRotations.clear()
    this.initialWorldScales.clear()
    this.initialGizmoRotation = null
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
