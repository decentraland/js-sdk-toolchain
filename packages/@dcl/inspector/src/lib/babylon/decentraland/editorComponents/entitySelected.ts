import * as BABYLON from '@babylonjs/core'
import { ComponentType, Entity } from '@dcl/ecs'
import { memoize } from '../../../logic/once'
import type { ComponentOperation } from '../component-operations'
import { EcsEntity } from '../EcsEntity'

const gizmoManager = memoize((scene: BABYLON.Scene) => {
  // Create and initialize gizmo
  const gizmoManager = new BABYLON.GizmoManager(scene)
  gizmoManager.usePointerToAttachGizmos = false
  gizmoManager.positionGizmoEnabled = true
  gizmoManager.rotationGizmoEnabled = true
  gizmoManager.scaleGizmoEnabled = true
  gizmoManager.positionGizmoEnabled = false
  gizmoManager.rotationGizmoEnabled = false
  gizmoManager.scaleGizmoEnabled = false
  gizmoManager.gizmos.rotationGizmo!.updateGizmoRotationToMatchAttachedMesh = false

  let lastEntity: EcsEntity | null = null

  function update() {
    if (lastEntity) {
      const context = lastEntity.context.deref()!

      const parent = context.Transform.getOrNull(lastEntity.entityId)?.parent || (0 as Entity)

      context.Transform.createOrReplace(lastEntity.entityId, {
        position: lastEntity.position.clone(),
        scale: lastEntity.scaling.clone(),
        rotation: lastEntity.rotationQuaternion!.clone(),
        parent
      })
    }
  }

  gizmoManager.gizmos.scaleGizmo?.onDragEndObservable.add(update)
  gizmoManager.gizmos.positionGizmo?.onDragEndObservable.add(update)
  gizmoManager.gizmos.rotationGizmo?.onDragEndObservable.add(update)

  return {
    gizmoManager,
    setEntity(entity: EcsEntity | null) {
      if (entity === lastEntity) return
      gizmoManager.attachToNode(entity)
      lastEntity = entity
    }
  }
})

export const putEntitySelectedComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const enabled = component.getOrNull(entity.entityId) as { gizmo: number } | null
    if (entity.meshRenderer) {
      entity.meshRenderer.showBoundingBox = !!enabled
    }
    const context = entity.context.deref()!

    const gm = gizmoManager(context.scene)

    gm.setEntity(entity)

    gm.gizmoManager.positionGizmoEnabled = enabled?.gizmo === 0
    gm.gizmoManager.rotationGizmoEnabled = enabled?.gizmo === 1
    gm.gizmoManager.scaleGizmoEnabled = enabled?.gizmo === 2
  }
}
