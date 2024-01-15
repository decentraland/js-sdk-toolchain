import mitt from 'mitt'
import { IAxisDragGizmo, PickingInfo, Quaternion } from '@babylonjs/core'
import { EcsEntity } from './EcsEntity'
import { Entity, TransformType } from '@dcl/ecs'
import { snapManager, snapPosition, snapRotation, snapScale } from './snap-manager'
import { SceneContext } from './SceneContext'
import { GizmoType } from '../../utils/gizmo'
import { PatchedGizmoManager } from './gizmo-patch'
import { Vector3 as DclVector3, Quaternion as DclQuaternion } from '@dcl/ecs-math'

interface GizmoAxis {
  xGizmo: IAxisDragGizmo
  yGizmo: IAxisDragGizmo
  zGizmo: IAxisDragGizmo
}

function releaseDragFromGizmo({ xGizmo, yGizmo, zGizmo }: GizmoAxis) {
  xGizmo.dragBehavior.releaseDrag()
  yGizmo.dragBehavior.releaseDrag()
  zGizmo.dragBehavior.releaseDrag()
}

function areProportional(a: number, b: number) {
  // this leeway is here to account for rounding errors due to serializing/deserializing floating point numbers
  return Math.abs(a - b) < 1e-5
}

// should be moved to ecs-math
function areQuaternionsEqual(a: DclQuaternion, b: DclQuaternion) {
  return a.x === b.x && a.y === b.y && a.z === b.z && a.w === b.w
}

export function createGizmoManager(context: SceneContext) {
  // events
  const events = mitt<{ change: void }>()

  // Create and initialize gizmo
  const gizmoManager = new PatchedGizmoManager(context.scene)
  gizmoManager.usePointerToAttachGizmos = false
  gizmoManager.positionGizmoEnabled = true
  gizmoManager.rotationGizmoEnabled = true
  gizmoManager.scaleGizmoEnabled = true
  gizmoManager.positionGizmoEnabled = false
  gizmoManager.rotationGizmoEnabled = false
  gizmoManager.scaleGizmoEnabled = false
  gizmoManager.gizmos.positionGizmo!.updateGizmoRotationToMatchAttachedMesh = false
  gizmoManager.gizmos.rotationGizmo!.updateGizmoRotationToMatchAttachedMesh = true

  let lastEntity: EcsEntity | null = null
  let rotationGizmoAlignmentDisabled = false
  let shouldRestorRotationGizmoAlignment = false
  let isEnabled = true

  function fixRotationGizmoAlignment(value: TransformType) {
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

  function getTransform(entity?: EcsEntity): TransformType {
    const _entity = entity ?? lastEntity
    if (_entity) {
      const parent = context.Transform.getOrNull(_entity.entityId)?.parent || (0 as Entity)
      const value = {
        position: snapPosition(_entity.position),
        scale: snapScale(_entity.scaling),
        rotation: _entity.rotationQuaternion ? snapRotation(_entity.rotationQuaternion) : Quaternion.Zero(),
        parent
      }
      return value
    } else {
      throw new Error('No entity selected')
    }
  }

  function updateEntityTransform(entity: Entity, newTransform: TransformType) {
    const { position, scale, rotation, parent } = newTransform
    context.operations.updateValue(context.Transform, entity, {
      position: DclVector3.create(position.x, position.y, position.z),
      rotation: DclQuaternion.create(rotation.x, rotation.y, rotation.z, rotation.w),
      scale: DclVector3.create(scale.x, scale.y, scale.z),
      parent: parent
    })
    void context.operations.dispatch()
  }

  function updateTransform() {
    if (lastEntity === null) return
    const oldTransform = context.Transform.get(lastEntity.entityId)
    const newTransform = getTransform()
    fixRotationGizmoAlignment(newTransform)
    if (
      DclVector3.equals(newTransform.position, oldTransform.position) &&
      DclVector3.equals(newTransform.scale, oldTransform.scale) &&
      areQuaternionsEqual(newTransform.rotation, oldTransform.rotation)
    )
      return
    // Update last selected entity transform
    updateEntityTransform(lastEntity.entityId, newTransform)

    // When moving multiple entities, we need to calculate the new transform for each selected entity
    if (Array.from(context.engine.getEntitiesWith(context.editorComponents.Selection)).length > 1) {
      for (const [entityId] of context.engine.getEntitiesWith(context.editorComponents.Selection)) {
        if (lastEntity.entityId === entityId) {
          continue
        }
        const entity = context.getEntityOrNull(entityId)!
        const transform = getTransform(entity)
        // Get the selected lastEntity rotated value
        const lastEntityRotation = new Quaternion(
          oldTransform.rotation.x,
          oldTransform.rotation.y,
          oldTransform.rotation.z,
          oldTransform.rotation.w
        )
          .conjugate()
          .multiply(
            new Quaternion(
              newTransform.rotation.x,
              newTransform.rotation.y,
              newTransform.rotation.z,
              newTransform.rotation.w
            )
          )
        updateEntityTransform(entityId, {
          ...transform,
          position: DclVector3.add(
            transform.position,
            DclVector3.subtract(newTransform.position, oldTransform.position)
          ),
          scale: DclVector3.add(transform.scale, DclVector3.subtract(newTransform.scale, oldTransform.scale)),
          rotation: new Quaternion(
            transform.rotation.x,
            transform.rotation.y,
            transform.rotation.z,
            transform.rotation.w
          ).multiply(lastEntityRotation)
        })
      }
    }
  }

  gizmoManager.gizmos.scaleGizmo?.onDragEndObservable.add(updateTransform)
  gizmoManager.gizmos.positionGizmo?.onDragEndObservable.add(updateTransform)
  gizmoManager.gizmos.rotationGizmo?.onDragEndObservable.add(updateTransform)

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

  function unsetEntity() {
    lastEntity = null
    gizmoManager.attachToNode(lastEntity)
    gizmoManager.positionGizmoEnabled = false
    gizmoManager.rotationGizmoEnabled = false
    gizmoManager.scaleGizmoEnabled = false
    events.emit('change')
  }

  function setEnabled(value: boolean) {
    if (value !== isEnabled) {
      isEnabled = value
      if (!isEnabled && lastEntity) {
        unsetEntity()
      }
    }
  }

  let movingNode: PickingInfo | null = null

  const canvas = context.babylon.getRenderingCanvas()

  context.scene.onPointerObservable.add(({ event: e, pickInfo }) => {
    if (e.type === 'pointermove') {
      movingNode = pickInfo
    } else {
      movingNode = null
    }
  })

  if (canvas) {
    canvas.addEventListener('pointerenter', () => {
      if (movingNode) {
        releaseDragFromGizmo(gizmoManager.gizmos.positionGizmo!)
        releaseDragFromGizmo(gizmoManager.gizmos.rotationGizmo!)
        releaseDragFromGizmo(gizmoManager.gizmos.scaleGizmo!)
      }
    })
  }

  return {
    gizmoManager,
    isEnabled() {
      return isEnabled
    },
    setEnabled,
    setEntity(entity: EcsEntity | null) {
      if (entity === lastEntity || !isEnabled) return
      gizmoManager.attachToNode(entity)
      lastEntity = entity
      // fix gizmo rotation if necessary
      const transform = getTransform()
      fixRotationGizmoAlignment(transform)
      events.emit('change')
    },
    getEntity() {
      return lastEntity
    },
    unsetEntity() {
      unsetEntity()
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
