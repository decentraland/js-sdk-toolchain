import mitt from 'mitt'
import {
  IAxisDragGizmo,
  PickingInfo,
  Quaternion,
  Vector3,
  PointerDragBehavior,
  AbstractMesh,
  TransformNode
} from '@babylonjs/core'
import { Entity, TransformType } from '@dcl/ecs'
import { Vector3 as DclVector3, Quaternion as DclQuaternion } from '@dcl/ecs-math'
import { GizmoType } from '../../utils/gizmo'
import { EcsEntity } from './EcsEntity'
import { snapManager, snapPosition, snapRotation, snapScale } from './snap-manager'
import { SceneContext } from './SceneContext'
import { PatchedGizmoManager } from './gizmo-patch'
import { ROOT } from '../../sdk/tree'

const GIZMO_DUMMY_NODE = 'GIZMO_DUMMY_NODE'

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

function configureGizmoButtons(gizmo: GizmoAxis, buttons: number[]) {
  gizmo.xGizmo.dragBehavior.dragButtons = buttons
  gizmo.yGizmo.dragBehavior.dragButtons = buttons
  gizmo.zGizmo.dragBehavior.dragButtons = buttons
}

function areProportional(a: number, b: number) {
  // this leeway is here to account for rounding errors due to serializing/deserializing floating point numbers
  return Math.abs(a - b) < 1e-5
}

function calculateCenter(positions: Vector3[]): Vector3 {
  if (positions.length === 0) new Vector3(0, 0, 0)

  const sum = positions.reduce((acc, pos) => {
    acc.x += pos.x
    acc.y += pos.y
    acc.z += pos.z
    return acc
  }, new Vector3(0, 0, 0))

  return sum.scale(1 / positions.length)
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

  // Configure all gizmos to only work with left click
  if (gizmoManager.gizmos.positionGizmo) configureGizmoButtons(gizmoManager.gizmos.positionGizmo, [0])
  if (gizmoManager.gizmos.rotationGizmo) configureGizmoButtons(gizmoManager.gizmos.rotationGizmo, [0])
  if (gizmoManager.gizmos.scaleGizmo) configureGizmoButtons(gizmoManager.gizmos.scaleGizmo, [0])

  let selectedEntities: EcsEntity[] = []
  let rotationGizmoAlignmentDisabled = false
  let positionGizmoAlignmentDisabled = false
  let shouldRestorRotationGizmoAlignment = false
  let shouldRestorPositionGizmoAlignment = false
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

  function getFirstEntity() {
    return selectedEntities[0]
  }

  function getParent(entity: EcsEntity) {
    return context.Transform.getOrNull(entity.entityId)?.parent || (0 as Entity)
  }

  function computeWorldTransform(entity: EcsEntity): TransformType {
    const { positionGizmoEnabled, scaleGizmoEnabled, rotationGizmoEnabled } = gizmoManager
    // Compute the updated transform based on the current node position
    const worldMatrix = entity.computeWorldMatrix(true)
    const position = new Vector3()
    const scale = new Vector3()
    const rotation = new Quaternion()
    worldMatrix.decompose(scale, rotation, position)

    return {
      position: positionGizmoEnabled ? snapPosition(position) : position,
      scale: scaleGizmoEnabled ? snapScale(scale) : scale,
      rotation: rotationGizmoEnabled ? snapRotation(rotation) : rotation
    }
  }

  function getTransform(entity: EcsEntity): TransformType {
    return {
      position: entity.position,
      scale: entity.scaling,
      rotation: entity.rotationQuaternion ?? Quaternion.Zero(),
      parent: getParent(entity)
    }
  }

  function updateEntityTransform(entity: Entity, newTransform: TransformType) {
    const { position, scale, rotation, parent } = newTransform
    context.operations.updateValue(context.Transform, entity, {
      position: DclVector3.create(position.x, position.y, position.z),
      rotation: DclQuaternion.create(rotation.x, rotation.y, rotation.z, rotation.w),
      scale: DclVector3.create(scale.x, scale.y, scale.z),
      parent
    })
  }

  /**
   * Updates the transform of all selected entities after a gizmo operation
   *
   * 1. Fixes rotation gizmo alignment based on the first selected entity's transform
   * 2. For each selected entity:
   *    - Gets the original parent and resolves it to a valid entity or root node
   *    - Temporarily sets the entity's parent to handle transform calculations
   *    - Updates the entity's transform:
   *      - If parent is root node: Uses world space transform with snapping
   *      - Otherwise: Uses local space transform
   *    - Preserves the original parent relationship
   * 3. Dispatches the transform updates to persist changes
   */
  function updateTransform() {
    fixRotationGizmoAlignment(getTransform(getFirstEntity()))
    for (const entity of selectedEntities) {
      const originalParent = getParent(entity)
      const parent = context.getEntityOrNull(originalParent ?? context.rootNode.entityId)

      entity.setParent(parent)

      updateEntityTransform(entity.entityId, {
        ...(parent === context.rootNode ? computeWorldTransform(entity) : getTransform(entity)),
        parent: originalParent
      })
    }

    void context.operations.dispatch()
  }

  // Check if a transform node for the gizmo already exists, or create one
  function getDummyNode(): TransformNode {
    let dummyNode = context.scene.getTransformNodeByName(GIZMO_DUMMY_NODE) as TransformNode
    if (!dummyNode) dummyNode = new TransformNode(GIZMO_DUMMY_NODE, context.scene) as TransformNode
    return dummyNode
  }

  function restoreParents() {
    for (const entity of selectedEntities) {
      const originalParent = getParent(entity)
      const parent = context.getEntityOrNull(originalParent ?? context.rootNode.entityId)
      entity.setParent(parent)
    }
  }

  function repositionGizmoOnCentroid() {
    const positions = selectedEntities.map((entity) => {
      const { x, y, z } = computeWorldTransform(entity).position
      return new Vector3(x, y, z)
    })
    const centroidPosition = calculateCenter(positions)
    const dummyNode = getDummyNode()

    // Set the dummy node position on centroid. This should be the first thing to do on the dummy node
    // so everything aligns to the right position afterwards.
    dummyNode.position = centroidPosition

    for (const entity of selectedEntities) {
      entity.setParent(dummyNode)
    }

    gizmoManager.attachToNode(dummyNode)
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

  function removeGizmos() {
    gizmoManager.attachToNode(null)
    gizmoManager.positionGizmoEnabled = false
    gizmoManager.rotationGizmoEnabled = false
    gizmoManager.scaleGizmoEnabled = false
    events.emit('change')
  }

  function setEnabled(value: boolean) {
    if (value !== isEnabled) {
      isEnabled = value
      if (!isEnabled && selectedEntities.length > 0) {
        restoreParents()
        removeGizmos()
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
    const firstEntity = getFirstEntity()
    if (
      !firstEntity ||
      pickResult.pickedMesh === null ||
      !gizmoManager.freeGizmoEnabled ||
      !context.Transform.getOrNull(firstEntity.entityId)
    )
      return
    if (selectedEntities.some((entity) => pickResult.pickedMesh!.isDescendantOf(entity))) {
      meshPointerDragBehavior.attach(firstEntity as unknown as AbstractMesh)
    }
  }

  context.scene.onPointerUp = function () {
    const firstEntity = getFirstEntity()
    if (!firstEntity || !gizmoManager.freeGizmoEnabled || !context.Transform.getOrNull(firstEntity.entityId)) return
    void updateTransform()
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
    restoreParents,
    repositionGizmoOnCentroid,
    addEntity(entity: EcsEntity): void {
      if (
        selectedEntities.includes(entity) ||
        !isEnabled ||
        entity?.isHidden() ||
        entity?.isLocked() ||
        entity?.getRoot() !== ROOT
      ) {
        return
      }
      restoreParents()
      selectedEntities.push(entity)
      repositionGizmoOnCentroid()
      const transform = getTransform(entity)
      // fix gizmo rotation/position if necessary
      fixRotationGizmoAlignment(transform)
      fixPositionGizmoAlignment(transform)
      events.emit('change')
    },
    getEntity() {
      return getFirstEntity()
    },
    removeEntity(entity: EcsEntity) {
      restoreParents()
      selectedEntities = selectedEntities.filter((e) => e.entityId !== entity.entityId)
      if (selectedEntities.length === 0) removeGizmos()
      else repositionGizmoOnCentroid()
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
