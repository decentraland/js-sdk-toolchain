import { GizmoManager, IAxisDragGizmo, Quaternion, Scene, Vector3 } from '@babylonjs/core'
import { memoize } from '../../logic/once'
import { EcsEntity } from './EcsEntity'
import { Entity } from '@dcl/ecs'
import { getLayoutManager } from './layout-manager'
import { inBounds } from '../../utils/layout'
import { snapManager } from './snap-manager'

export const getGizmoManager = memoize((scene: Scene) => {
  // Create and initialize gizmo
  const gizmoManager = new GizmoManager(scene)
  gizmoManager.usePointerToAttachGizmos = false
  gizmoManager.positionGizmoEnabled = true
  gizmoManager.rotationGizmoEnabled = true
  gizmoManager.scaleGizmoEnabled = true
  gizmoManager.positionGizmoEnabled = false
  gizmoManager.rotationGizmoEnabled = false
  gizmoManager.scaleGizmoEnabled = false
  gizmoManager.gizmos.positionGizmo!.updateGizmoRotationToMatchAttachedMesh = false

  const layoutManager = getLayoutManager(scene)

  function dragBehavior(gizmo: IAxisDragGizmo) {
    gizmo.dragBehavior.validateDrag = function validateDrag(targetPosition: Vector3) {
      const yIsInBounds = targetPosition.y >= 0 || (!!lastEntity && lastEntity.position.y < targetPosition.y)
      const layout = layoutManager.getLayout()
      const isAlreadyOutOfBounds = !!lastEntity && !inBounds(layout, lastEntity?.position)
      const xzIsInBounds = inBounds(layout, targetPosition)
      // Allow drag if target position is within bounds, or if the gizmo is already out of bounds (it can get there by modifiying the transform values manually)
      return (yIsInBounds && xzIsInBounds) || isAlreadyOutOfBounds
    }
  }

  dragBehavior(gizmoManager.gizmos.positionGizmo!.xGizmo)
  dragBehavior(gizmoManager.gizmos.positionGizmo!.yGizmo)
  dragBehavior(gizmoManager.gizmos.positionGizmo!.zGizmo)

  let lastEntity: EcsEntity | null = null

  function update() {
    if (lastEntity) {
      const context = lastEntity.context.deref()!
      const parent = context.Transform.getOrNull(lastEntity.entityId)?.parent || (0 as Entity)
      context.Transform.createOrReplace(lastEntity.entityId, {
        position: snapPosition(lastEntity.position),
        scale: snapScale(lastEntity.scaling),
        rotation: snapRotation(lastEntity.rotationQuaternion!),
        parent
      })
    }
  }

  gizmoManager.gizmos.scaleGizmo?.onDragEndObservable.add(update)
  gizmoManager.gizmos.positionGizmo?.onDragEndObservable.add(update)
  gizmoManager.gizmos.rotationGizmo?.onDragEndObservable.add(update)

  // snap
  gizmoManager.gizmos.positionGizmo!.snapDistance = snapManager.getPositionSnap()
  gizmoManager.gizmos.scaleGizmo!.snapDistance = snapManager.getScaleSnap()
  gizmoManager.gizmos.rotationGizmo!.snapDistance = snapManager.getRotationSnap()
  snapManager.onChange(({ positionSnap, rotationSnap, scaleSnap, enabled }) => {
    gizmoManager.gizmos.positionGizmo!.snapDistance = enabled ? positionSnap : 0
    gizmoManager.gizmos.scaleGizmo!.snapDistance = enabled ? scaleSnap : 0
    gizmoManager.gizmos.rotationGizmo!.snapDistance = enabled ? rotationSnap : 0
  })

  return {
    gizmoManager,
    setEntity(entity: EcsEntity | null) {
      if (entity === lastEntity) return
      gizmoManager.attachToNode(entity)
      lastEntity = entity
    }
  }
})

function snapValue(value: number, snap: number) {
  return Math.round(value / snap) * snap
}

function snapVector(vector: Vector3, snap: number) {
  return new Vector3(snapValue(vector.x, snap), snapValue(vector.y, snap), snapValue(vector.z, snap))
}

function snapQuaternion(quaternion: Quaternion, snap: number) {
  const angles = snapVector(quaternion.toEulerAngles(), snap)
  return Quaternion.FromEulerVector(angles)
}

function snapPosition(position: Vector3) {
  return snapManager.isEnabled() ? snapVector(position, snapManager.getPositionSnap()) : position
}

function snapScale(scale: Vector3) {
  return snapManager.isEnabled() ? snapVector(scale, snapManager.getScaleSnap()) : scale
}

function snapRotation(rotation: Quaternion) {
  return snapManager.isEnabled() ? snapQuaternion(rotation, snapManager.getRotationSnap()) : rotation
}
