import mitt from 'mitt'
import { IAxisDragGizmo, Quaternion, Vector3 } from '@babylonjs/core'
import { BabylonEntity } from 'decentraland-babylon/src/lib/babylon/scene/BabylonEntity'
import { getLayoutManager } from './layout-manager'
import { inBounds } from '../../utils/layout'
import { snapManager, snapPosition, snapRotation, snapScale } from './snap-manager'
import { SceneContext } from './SceneContext'
import { GizmoType } from '../../utils/gizmo'
import { PatchedGizmoManager } from './gizmo-patch'
import { Transform } from 'decentraland-babylon/src/lib/decentraland/sdk-components/transform-component'
import { StaticEntities } from 'decentraland-babylon/src/lib/babylon/scene/logic/static-entities'

function areProportional(a: number, b: number) {
  // this leeway is here to account for rounding errors due to serializing/deserializing floating point numbers
  return Math.abs(a - b) < 1e-5
}

export function createGizmoManager(context: SceneContext) {
  // events
  const events = mitt<{ change: void }>()

  // Create and initialize gizmo
  const gizmoManager = new PatchedGizmoManager(context.babylonScene)
  gizmoManager.usePointerToAttachGizmos = false
  gizmoManager.positionGizmoEnabled = true
  gizmoManager.rotationGizmoEnabled = true
  gizmoManager.scaleGizmoEnabled = true
  gizmoManager.positionGizmoEnabled = false
  gizmoManager.rotationGizmoEnabled = false
  gizmoManager.scaleGizmoEnabled = false
  gizmoManager.gizmos.positionGizmo!.updateGizmoRotationToMatchAttachedMesh = false
  gizmoManager.gizmos.rotationGizmo!.updateGizmoRotationToMatchAttachedMesh = true

  const layoutManager = getLayoutManager(context.babylonScene)

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

  let lastEntity: BabylonEntity | null = null
  let rotationGizmoAlignmentDisabled = false
  let shouldRestorRotationGizmoAlignment = false

  function fixRotationGizmoAlignment(value: Transform) {
    const isProportional =
      areProportional(value.scale.x, value.scale.y) && areProportional(value.scale.y, value.scale.z)
    rotationGizmoAlignmentDisabled = !isProportional
    if (!isProportional && !isRotationGizmoWorldAligned()) {
      setRotationGizmoWorldAligned(true) // set to world
      shouldRestorRotationGizmoAlignment = true
    } else if (shouldRestorRotationGizmoAlignment && isProportional) {
      setRotationGizmoWorldAligned(false) // restore to local
      shouldRestorRotationGizmoAlignment = false
    } else {
      events.emit('change')
    }
  }

  function getTransform() {
    if (lastEntity) {
      const currentValue = context.components[1 /* transform */].getOrNull(lastEntity.entityId)
      const value = {
        position: snapPosition(currentValue?.position ?? Vector3.Zero()),
        scale: snapScale(currentValue?.scale ?? Vector3.One()),
        rotation: snapRotation(currentValue?.rotation ?? Quaternion.Identity()),
        parent: currentValue?.parent ?? StaticEntities.RootEntity
      }
      return value
    } else {
      throw new Error('No entity selected')
    }
  }

  function update() {
    if (lastEntity) {
      const transform = getTransform()
      fixRotationGizmoAlignment(transform)
      context.components[1 /* transform */].createOrReplace(lastEntity.entityId, transform)
      context.dispatchChanges()
    }
  }

  function updateFinal() {
    if (lastEntity) {
      const transform = getTransform()
      fixRotationGizmoAlignment(transform)
      context.components[1 /* transform */].createOrReplace(lastEntity.entityId, transform)
      context.dispatchChanges()
    }
    context.isDragging = false
  }

  // the transform component is calculated by the scene main loop and it uses information
  // from various components like billboard and attachment points. to enable dragging behaviors
  // we must stop the update loop of the scene while we drag
  function startDrag() {
    context.isDragging = true
  }

  gizmoManager.gizmos.scaleGizmo?.onDragStartObservable.add(startDrag)
  gizmoManager.gizmos.positionGizmo?.onDragStartObservable.add(startDrag)
  gizmoManager.gizmos.positionGizmo?.onDragStartObservable.add(startDrag)

  gizmoManager.gizmos.scaleGizmo?.onDragEndObservable.add(updateFinal)
  gizmoManager.gizmos.positionGizmo?.onDragEndObservable.add(updateFinal)
  gizmoManager.gizmos.rotationGizmo?.onDragEndObservable.add(updateFinal)

  // snap
  function updateSnap() {
    gizmoManager.gizmos.positionGizmo!.snapDistance = snapManager.isEnabled() ? snapManager.getPositionSnap() : 0
    gizmoManager.gizmos.scaleGizmo!.snapDistance = snapManager.isEnabled() ? snapManager.getScaleSnap() : 0
    gizmoManager.gizmos.rotationGizmo!.snapDistance = snapManager.isEnabled() ? snapManager.getRotationSnap() : 0
  }
  snapManager.onChange(updateSnap)
  updateSnap()

  function isPositionGizmoWorldAligned() {
    return !gizmoManager.gizmos.positionGizmo!.updateGizmoRotationToMatchAttachedMesh
  }
  function setPositionGizmoWorldAligned(worldAligned: boolean) {
    gizmoManager.gizmos.positionGizmo!.updateGizmoRotationToMatchAttachedMesh = !worldAligned
    events.emit('change')
  }
  function isRotationGizmoWorldAligned() {
    return !gizmoManager.gizmos.rotationGizmo!.updateGizmoRotationToMatchAttachedMesh
  }
  function setRotationGizmoWorldAligned(worldAligned: boolean) {
    gizmoManager.gizmos.rotationGizmo!.updateGizmoRotationToMatchAttachedMesh = !worldAligned
    events.emit('change')
  }

  function isRotationGizmoAlignmentDisabled() {
    return rotationGizmoAlignmentDisabled
  }

  function safeSetRotationGizmoWorldAligned(worldAligned: boolean) {
    if (!isRotationGizmoAlignmentDisabled()) {
      setRotationGizmoWorldAligned(worldAligned)
    }
  }

  function onChange(cb: () => void) {
    events.on('change', cb)
    return () => events.off('change', cb)
  }

  return {
    gizmoManager,
    setEntity(entity: BabylonEntity | null) {
      if (entity === lastEntity) return
      if (lastEntity) {
        ;(lastEntity as any).isDragging = false
      }
      gizmoManager.attachToNode(entity)
      lastEntity = entity
      // fix gizmo rotation if necessary
      const transform = getTransform()
      fixRotationGizmoAlignment(transform)
      context.isDragging = false
      events.emit('change')
    },
    getEntity() {
      return lastEntity
    },
    unsetEntity() {
      lastEntity = null
      gizmoManager.attachToNode(lastEntity)
      gizmoManager.positionGizmoEnabled = false
      gizmoManager.rotationGizmoEnabled = false
      gizmoManager.scaleGizmoEnabled = false
      context.isDragging = false
      events.emit('change')
    },
    getGizmoTypes() {
      return [GizmoType.POSITION, GizmoType.ROTATION, GizmoType.SCALE] as const
    },
    setGizmoType(type: GizmoType) {
      gizmoManager.positionGizmoEnabled = type === GizmoType.POSITION
      gizmoManager.rotationGizmoEnabled = type === GizmoType.ROTATION
      gizmoManager.scaleGizmoEnabled = type === GizmoType.SCALE
      events.emit('change')
    },
    isPositionGizmoWorldAligned,
    setPositionGizmoWorldAligned,
    isRotationGizmoWorldAligned,
    setRotationGizmoWorldAligned: safeSetRotationGizmoWorldAligned,
    fixRotationGizmoAlignment,
    isRotationGizmoAlignmentDisabled,
    onChange
  }
}

export type Gizmos = ReturnType<typeof createGizmoManager>
