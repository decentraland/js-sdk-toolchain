import mitt from 'mitt'
import { GizmoManager, IAxisDragGizmo, Scene, Vector3 } from '@babylonjs/core'
import { memoize } from '../../logic/once'
import { EcsEntity } from './EcsEntity'
import { Entity } from '@dcl/ecs'
import { getLayoutManager } from './layout-manager'
import { inBounds } from '../../utils/layout'
import { snapManager, snapPosition, snapRotation, snapScale } from './snap-manager'
import { Operations } from '../../sdk/operations'

export const getGizmoManager = memoize((scene: Scene, operations: Operations) => {
  // events
  const events = mitt<{ change: void }>()

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
  gizmoManager.gizmos.rotationGizmo!.updateGizmoRotationToMatchAttachedMesh = true

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
      operations.updateValue(context.Transform, lastEntity.entityId, {
        position: snapPosition(lastEntity.position),
        scale: snapScale(lastEntity.scaling),
        rotation: snapRotation(lastEntity.rotationQuaternion!),
        parent
      })
      void operations.dispatch()
    }
  }

  gizmoManager.gizmos.scaleGizmo?.onDragEndObservable.add(update)
  gizmoManager.gizmos.positionGizmo?.onDragEndObservable.add(update)
  gizmoManager.gizmos.rotationGizmo?.onDragEndObservable.add(update)

  // snap
  function updateSnap() {
    gizmoManager.gizmos.positionGizmo!.snapDistance = snapManager.isEnabled() ? snapManager.getPositionSnap() : 0
    gizmoManager.gizmos.scaleGizmo!.snapDistance = snapManager.isEnabled() ? snapManager.getScaleSnap() : 0
    gizmoManager.gizmos.rotationGizmo!.snapDistance = snapManager.isEnabled() ? snapManager.getRotationSnap() : 0
  }
  snapManager.onChange(updateSnap)
  updateSnap()

  return {
    gizmoManager,
    setEntity(entity: EcsEntity | null) {
      if (entity === lastEntity) return
      gizmoManager.attachToNode(entity)
      lastEntity = entity
      events.emit('change')
    },
    getEntity() {
      return lastEntity
    },
    unsetEntity() {
      lastEntity = null
      gizmoManager.attachToNode(lastEntity)
      events.emit('change')
    },
    isPositionGizmoWorldAligned() {
      return !!gizmoManager.gizmos.positionGizmo!.updateGizmoRotationToMatchAttachedMesh
    },
    setPositionGizmoWorldAligned(worldAligned: boolean) {
      gizmoManager.gizmos.positionGizmo!.updateGizmoRotationToMatchAttachedMesh = worldAligned
      events.emit('change')
    },
    isRotationGizmoWorldAligned() {
      return !!gizmoManager.gizmos.rotationGizmo!.updateGizmoRotationToMatchAttachedMesh
    },
    setRotationGizmoWorldAligned(worldAligned: boolean) {
      gizmoManager.gizmos.rotationGizmo!.updateGizmoRotationToMatchAttachedMesh = worldAligned
      events.emit('change')
    },
    onChange: (cb: () => void) => {
      events.on('change', cb)
      return () => events.off('change', cb)
    }
  }
})
