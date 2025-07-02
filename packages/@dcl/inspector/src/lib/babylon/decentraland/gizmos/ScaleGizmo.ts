import { Vector3, TransformNode, GizmoManager, Quaternion, Matrix } from '@babylonjs/core'
import { Entity } from '@dcl/ecs'
import { EcsEntity } from '../EcsEntity'
import { IGizmoTransformer } from './types'
import { TransformUtils } from './utils'

export class ScaleGizmo implements IGizmoTransformer {
  private initialOffsets = new Map<Entity, Vector3>()
  private initialScales = new Map<Entity, Vector3>()
  private initialRotations = new Map<Entity, Quaternion>()
  private initialGizmoScale: Vector3 | null = null
  private changeHandlers: (() => void)[] = []

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
    this.initialGizmoScale = null
  }

  onDragStart(entities: EcsEntity[], gizmoNode: TransformNode): void {
    const centroid = gizmoNode.position.clone()
    this.initialOffsets.clear()
    this.initialScales.clear()
    this.initialRotations.clear()
    this.initialGizmoScale = gizmoNode.scaling.clone()

    for (const entity of entities) {
      const worldPosition = entity.getAbsolutePosition()
      const offset = worldPosition.subtract(centroid)
      this.initialOffsets.set(entity.entityId, offset)

      const worldRotation = TransformUtils.getWorldRotation(entity)
      this.initialRotations.set(entity.entityId, worldRotation)

      const parent = entity.parent instanceof TransformNode ? entity.parent : null
      const parentScale = TransformUtils.getParentWorldScale(parent)
      const worldScale = new Vector3(
        entity.scaling.x * parentScale.x,
        entity.scaling.y * parentScale.y,
        entity.scaling.z * parentScale.z
      )
      this.initialScales.set(entity.entityId, worldScale)
    }
  }

  update(entities: EcsEntity[], gizmoNode: TransformNode): void {
    if (!this.initialGizmoScale) return

    const scaleChange = new Vector3(
      gizmoNode.scaling.x / this.initialGizmoScale.x,
      gizmoNode.scaling.y / this.initialGizmoScale.y,
      gizmoNode.scaling.z / this.initialGizmoScale.z
    )

    for (const entity of entities) {
      const offset = this.initialOffsets.get(entity.entityId)
      const initialScale = this.initialScales.get(entity.entityId)
      const initialRotation = this.initialRotations.get(entity.entityId)
      if (!offset || !initialScale || !initialRotation) continue

      const scaledOffset = new Vector3(offset.x * scaleChange.x, offset.y * scaleChange.y, offset.z * scaleChange.z)
      const newWorldPosition = gizmoNode.position.add(scaledOffset)

      const newWorldScale = new Vector3(
        initialScale.x * scaleChange.x,
        initialScale.y * scaleChange.y,
        initialScale.z * scaleChange.z
      )

      const parent = entity.parent instanceof TransformNode ? entity.parent : null

      if (parent) {
        const parentWorldMatrix = parent.getWorldMatrix()
        const parentScale = TransformUtils.getParentWorldScale(parent)
        const parentRotation =
          parent.rotationQuaternion ||
          Quaternion.FromRotationMatrix(
            Matrix.FromValues(
              parentWorldMatrix.m[0],
              parentWorldMatrix.m[1],
              parentWorldMatrix.m[2],
              0,
              parentWorldMatrix.m[4],
              parentWorldMatrix.m[5],
              parentWorldMatrix.m[6],
              0,
              parentWorldMatrix.m[8],
              parentWorldMatrix.m[9],
              parentWorldMatrix.m[10],
              0,
              0,
              0,
              0,
              1
            )
          )

        const localPosition = TransformUtils.convertToLocalPosition(newWorldPosition, parent)
        entity.position.copyFrom(localPosition)

        entity.scaling.set(
          newWorldScale.x / parentScale.x,
          newWorldScale.y / parentScale.y,
          newWorldScale.z / parentScale.z
        )

        const scaleCompensationMatrix = Matrix.Scaling(1 / parentScale.x, 1 / parentScale.y, 1 / parentScale.z)
        const compensatedRotation = initialRotation.multiply(Quaternion.FromRotationMatrix(scaleCompensationMatrix))
        const localRotation = parentRotation.invert().multiply(compensatedRotation)

        if (!entity.rotationQuaternion) {
          entity.rotationQuaternion = new Quaternion()
        }
        entity.rotationQuaternion.copyFrom(localRotation)
        entity.rotationQuaternion.normalize()
      } else {
        entity.position.copyFrom(newWorldPosition)
        entity.scaling.copyFrom(newWorldScale)
        if (!entity.rotationQuaternion) {
          entity.rotationQuaternion = new Quaternion()
        }
        entity.rotationQuaternion.copyFrom(initialRotation)
        entity.rotationQuaternion.normalize()
      }

      this.changeHandlers.forEach((handler) => handler())
    }
  }

  onDragEnd(): void {
    this.initialOffsets.clear()
    this.initialScales.clear()
    this.initialRotations.clear()
    this.initialGizmoScale = null
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
