import mitt from 'mitt'
import {
  IAxisDragGizmo,
  PickingInfo,
  Quaternion,
  Node,
  Vector3,
  PointerDragBehavior,
  AbstractMesh
} from '@babylonjs/core'
import { Entity, TransformType } from '@dcl/ecs'
import { Vector3 as DclVector3, Quaternion as DclQuaternion } from '@dcl/ecs-math'
import { GizmoType } from '../../utils/gizmo'
import { EcsEntity } from './EcsEntity'
import { snapManager, snapPosition, snapRotation, snapScale } from './snap-manager'
import { SceneContext } from './SceneContext'
import { PatchedGizmoManager } from './gizmo-patch'
import { ROOT } from '../../sdk/tree'

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
  let positionGizmoAlignmentDisabled = false
  let shouldRestorRotationGizmoAlignment = false
  let shouldRestorPositionGizmoAlignment = false
  let isEnabled = true
  const parentMapper: Map<Entity, Node> = new Map()

  function getSelectedEntities() {
    return context.operations.getSelectedEntities()
  }

  function areMultipleEntitiesSelected() {
    return getSelectedEntities().length > 1
  }

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

  function fixPositionGizmoAlignment(value: TransformType) {
    const isProportional =
      areProportional(value.scale.x, value.scale.y) && areProportional(value.scale.y, value.scale.z)
    positionGizmoAlignmentDisabled = !isProportional
    if (!isProportional && !isPositionGizmoWorldAligned()) {
      setPositionGizmoWorldAligned(true) // set to world
      shouldRestorPositionGizmoAlignment = true
    } else if (shouldRestorPositionGizmoAlignment && isProportional) {
      setPositionGizmoWorldAligned(false) // restore to local
      shouldRestorPositionGizmoAlignment = false
    } else {
      events.emit('change')
    }
  }

  function getTransform(entity?: EcsEntity): TransformType {
    const _entity = entity ?? lastEntity
    if (_entity) {
      const parent = context.Transform.getOrNull(_entity.entityId)?.parent || (0 as Entity)
      const value = {
        position: gizmoManager.positionGizmoEnabled ? snapPosition(_entity.position) : _entity.position,
        scale: gizmoManager.scaleGizmoEnabled ? snapScale(_entity.scaling) : _entity.scaling,
        rotation: gizmoManager.rotationGizmoEnabled
          ? _entity.rotationQuaternion
            ? snapRotation(_entity.rotationQuaternion)
            : Quaternion.Zero()
          : _entity.rotationQuaternion ?? Quaternion.Zero(),
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

    // Remap all selected entities to the original parent
    parentMapper.forEach((value, key, map) => {
      if (key === lastEntity!.entityId) return
      const entity = context.getEntityOrNull(key)
      if (entity) {
        entity.setParent(value)
        map.delete(key)
      }
    })

    if (
      DclVector3.equals(newTransform.position, oldTransform.position) &&
      DclVector3.equals(newTransform.scale, oldTransform.scale) &&
      areQuaternionsEqual(newTransform.rotation, oldTransform.rotation)
    )
      return
    // Update last selected entity transform
    updateEntityTransform(lastEntity.entityId, newTransform)

    // Update entity transform for all the selected entities
    if (areMultipleEntitiesSelected()) {
      for (const entityId of getSelectedEntities()) {
        if (entityId === lastEntity.entityId) continue
        const entity = context.getEntityOrNull(entityId)!
        const transform = getTransform(entity)
        updateEntityTransform(entityId, transform)
      }
    }
  }

  function initTransform() {
    if (lastEntity === null) return
    if (areMultipleEntitiesSelected()) {
      for (const entityId of getSelectedEntities()) {
        if (entityId === lastEntity.entityId) continue
        const entity = context.getEntityOrNull(entityId)!
        parentMapper.set(entityId, entity.parent!)
        entity.setParent(lastEntity)
      }
    }
  }

  gizmoManager.gizmos.scaleGizmo?.onDragStartObservable.add(initTransform)
  gizmoManager.gizmos.positionGizmo?.onDragStartObservable.add(initTransform)
  gizmoManager.gizmos.rotationGizmo?.onDragStartObservable.add(initTransform)

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

  function isPositionGizmoAlignmentDisabled() {
    return positionGizmoAlignmentDisabled
  }

  function safeSetRotationGizmoWorldAligned(worldAligned: boolean) {
    if (!isRotationGizmoAlignmentDisabled()) {
      setRotationGizmoWorldAligned(worldAligned)
    }
  }

  function safeSetPositionGizmoWorldAligned(worldAligned: boolean) {
    if (!isPositionGizmoAlignmentDisabled()) {
      setPositionGizmoWorldAligned(worldAligned)
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

  const meshPointerDragBehavior = new PointerDragBehavior({
    dragPlaneNormal: new Vector3(0, 1, 0)
  })

  context.scene.onPointerDown = function (_e, pickResult) {
    if (
      lastEntity === null ||
      pickResult.pickedMesh === null ||
      !gizmoManager.freeGizmoEnabled ||
      !context.Transform.getOrNull(lastEntity.entityId)
    )
      return
    const selectedEntities = getSelectedEntities().map((entityId) => context.getEntityOrNull(entityId)!)
    if (selectedEntities.some((entity) => pickResult.pickedMesh!.isDescendantOf(entity))) {
      initTransform()
      meshPointerDragBehavior.attach(lastEntity as unknown as AbstractMesh)
    }
  }

  context.scene.onPointerUp = function () {
    if (lastEntity === null || !gizmoManager.freeGizmoEnabled || !context.Transform.getOrNull(lastEntity.entityId))
      return
    updateTransform()
    meshPointerDragBehavior.detach()
  }

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
      if (
        entity === lastEntity ||
        !isEnabled ||
        areMultipleEntitiesSelected() ||
        entity?.isHidden() ||
        entity?.isLocked() ||
        entity?.getRoot() !== ROOT
      ) {
        return
      }
      gizmoManager.attachToNode(entity)
      lastEntity = entity
      // fix gizmo rotation/position if necessary
      const transform = getTransform()
      fixRotationGizmoAlignment(transform)
      fixPositionGizmoAlignment(transform)
      events.emit('change')
    },
    getEntity() {
      return lastEntity
    },
    unsetEntity() {
      unsetEntity()
    },
    getGizmoTypes() {
      return [GizmoType.POSITION, GizmoType.ROTATION, GizmoType.SCALE, GizmoType.FREE] as const
    },
    setGizmoType(type: GizmoType) {
      gizmoManager.positionGizmoEnabled = type === GizmoType.POSITION
      gizmoManager.rotationGizmoEnabled = type === GizmoType.ROTATION
      gizmoManager.scaleGizmoEnabled = type === GizmoType.SCALE
      gizmoManager.freeGizmoEnabled = type === GizmoType.FREE
      events.emit('change')
    },
    isPositionGizmoWorldAligned,
    setPositionGizmoWorldAligned: safeSetPositionGizmoWorldAligned,
    fixPositionGizmoAlignment,
    isPositionGizmoAlignmentDisabled,
    isRotationGizmoWorldAligned,
    setRotationGizmoWorldAligned: safeSetRotationGizmoWorldAligned,
    fixRotationGizmoAlignment,
    isRotationGizmoAlignmentDisabled,
    onChange
  }
}

export type Gizmos = ReturnType<typeof createGizmoManager>
