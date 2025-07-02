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
import { LEFT_BUTTON } from './mouse-utils'

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

function calculateAverageRotation(rotations: Quaternion[]): Quaternion {
  if (rotations.length === 0) return new Quaternion()

  // Start with the first rotation
  const result = rotations[0].clone()

  // Average with the rest of the rotations
  for (let i = 1; i < rotations.length; i++) {
    Quaternion.SlerpToRef(result, rotations[i], 1 / (i + 1), result)
  }

  return result
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
  gizmoManager.gizmos.rotationGizmo!.updateGizmoRotationToMatchAttachedMesh = false

  // Configure all gizmos to only work with left click
  if (gizmoManager.gizmos.positionGizmo) configureGizmoButtons(gizmoManager.gizmos.positionGizmo, [LEFT_BUTTON])
  if (gizmoManager.gizmos.rotationGizmo) configureGizmoButtons(gizmoManager.gizmos.rotationGizmo, [LEFT_BUTTON])
  if (gizmoManager.gizmos.scaleGizmo) configureGizmoButtons(gizmoManager.gizmos.scaleGizmo, [LEFT_BUTTON])

  let selectedEntities: EcsEntity[] = []
  let rotationGizmoAlignmentDisabled = false
  let positionGizmoAlignmentDisabled = false
  let shouldRestorPositionGizmoAlignment = false
  let isEnabled = true

  function fixRotationGizmoAlignment(value: TransformType) {
    const isProportional =
      areProportional(value.scale.x, value.scale.y) && areProportional(value.scale.y, value.scale.z)
    rotationGizmoAlignmentDisabled = !isProportional
    if (!isProportional) {
      setRotationGizmoWorldAligned(true) // set to world
    } else {
      setRotationGizmoWorldAligned(false) // restore to local
    }
    events.emit('change')
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

  /**
   * Updates the transform of all selected entities after a gizmo operation
   *
   * This function correctly applies gizmo transformations while maintaining
   * proper parent-child relationships and preventing scale distortion.
   */
  function updateTransform() {
    const firstEntity = getFirstEntity()
    if (!firstEntity) return

    fixRotationGizmoAlignment(getTransform(firstEntity))

    // Get the gizmo dummy node
    const dummyNode = getDummyNode()

    // Store which gizmo is active
    const { positionGizmoEnabled, rotationGizmoEnabled, scaleGizmoEnabled } = gizmoManager

    // First measure the initial offsets when position gizmo is active
    // This allows us to maintain relative positions of multiple selected entities
    const initialOffsets = new Map<Entity, Vector3>()
    const initialDummyPos = dummyNode.position.clone()

    if (positionGizmoEnabled && selectedEntities.length > 1) {
      // Calculate relative offsets from the dummy node for each entity
      for (const entity of selectedEntities) {
        const entityWorldPos = new Vector3()
        const entityRot = new Quaternion()
        const entityScale = new Vector3()
        entity.computeWorldMatrix(true).decompose(entityScale, entityRot, entityWorldPos)

        // Store the offset from dummy node center
        initialOffsets.set(entity.entityId, entityWorldPos.subtract(initialDummyPos))
      }
    }

    // Process each selected entity
    for (const entity of selectedEntities) {
      const originalParent = getParent(entity)
      const parentEntity = context.getEntityOrNull(originalParent ?? context.rootNode.entityId)
      if (!parentEntity) continue

      // Get the entity's original transform from ECS
      const originalTransform = entity.ecsComponentValues.transform
      if (!originalTransform) continue

      // Create new transform object with original values
      const newTransform = {
        position: DclVector3.create(
          originalTransform.position.x,
          originalTransform.position.y,
          originalTransform.position.z
        ),
        rotation: DclQuaternion.create(
          originalTransform.rotation.x,
          originalTransform.rotation.y,
          originalTransform.rotation.z,
          originalTransform.rotation.w
        ),
        scale: DclVector3.create(originalTransform.scale.x, originalTransform.scale.y, originalTransform.scale.z),
        parent: originalParent
      }

      if (positionGizmoEnabled) {
        // Calculate the final world position including offsets if multiple entities are selected
        let finalWorldPos: Vector3

        if (selectedEntities.length > 1 && initialOffsets.has(entity.entityId)) {
          // For multiple entities: position = dummyNode.position + entity's offset from dummy
          const offset = initialOffsets.get(entity.entityId)!
          finalWorldPos = dummyNode.position.add(offset)
        } else {
          // For single entity: use the entity's exact world position
          const entityWorldMatrix = entity.computeWorldMatrix(true)
          finalWorldPos = new Vector3()
          const entityWorldRot = new Quaternion()
          const entityWorldScale = new Vector3()
          entityWorldMatrix.decompose(entityWorldScale, entityWorldRot, finalWorldPos)
        }

        // Calculate parent's world matrix
        const parentWorldMatrix = parentEntity.computeWorldMatrix(true)
        const invParentWorld = parentWorldMatrix.clone()
        invParentWorld.invert()

        // Convert world position to local position in parent's space
        const localPos = Vector3.TransformCoordinates(finalWorldPos, invParentWorld)

        // Apply snapping
        const snappedLocalPos = snapPosition(localPos)

        // Update the position in the transform
        newTransform.position = DclVector3.create(snappedLocalPos.x, snappedLocalPos.y, snappedLocalPos.z)
      } else if (rotationGizmoEnabled) {
        // For rotation, we need a more accurate approach to handle parent-child rotations

        // Get the current entity's world position and world rotation after gizmo operation
        const entityWorldMatrix = entity.computeWorldMatrix(true)
        const entityWorldRotation = new Quaternion()
        const entityWorldScale = new Vector3()
        const entityWorldPos = new Vector3()
        entityWorldMatrix.decompose(entityWorldScale, entityWorldRotation, entityWorldPos)

        // Get parent's world matrix to calculate local rotation
        const parentWorldMatrix = parentEntity.computeWorldMatrix(true)
        const invParentMatrix = parentWorldMatrix.clone()
        invParentMatrix.invert()

        // Calculate local rotation by transforming world rotation to local space
        const invParentRotation = new Quaternion()
        const parentScale = new Vector3()
        const parentPos = new Vector3()
        invParentMatrix.decompose(parentScale, invParentRotation, parentPos)

        // To get local rotation, multiply world rotation by inverse parent rotation
        // This is equivalent to: worldRot = parentRot * localRot, so localRot = parentRot^-1 * worldRot
        const localRotation = invParentRotation.multiply(entityWorldRotation)

        // Apply snapping and update
        const snappedLocalRot = snapRotation(localRotation)
        newTransform.rotation = DclQuaternion.create(
          snappedLocalRot.x,
          snappedLocalRot.y,
          snappedLocalRot.z,
          snappedLocalRot.w
        )
      } else if (scaleGizmoEnabled) {
        // Calculate dummy node world matrix
        const dummyWorldMatrix = dummyNode.computeWorldMatrix(true)

        // Extract entity's current scale from the world matrix
        const worldScale = new Vector3()
        const worldRot = new Quaternion()
        const worldPos = new Vector3()
        dummyWorldMatrix.decompose(worldScale, worldRot, worldPos)

        // Apply snapping and update
        const snappedScale = snapScale(worldScale)
        newTransform.scale = DclVector3.create(snappedScale.x, snappedScale.y, snappedScale.z)
      }

      // Apply the transform update
      context.operations.updateValue(context.Transform, entity.entityId, newTransform)
    }

    // Make sure the entities are reparented properly
    restoreParents()
    repositionGizmoOnCentroid()

    // Dispatch all transform updates
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

    const rotations = selectedEntities.map((entity) => {
      const { x, y, z, w } = computeWorldTransform(entity).rotation
      return new Quaternion(x, y, z, w)
    })

    const centroidPosition = calculateCenter(positions)
    const centroidRotation = calculateAverageRotation(rotations)
    const dummyNode = getDummyNode()

    // Set the dummy node transform
    dummyNode.position = centroidPosition
    dummyNode.rotationQuaternion = centroidRotation
    dummyNode.scaling = new Vector3(1, 1, 1)

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
