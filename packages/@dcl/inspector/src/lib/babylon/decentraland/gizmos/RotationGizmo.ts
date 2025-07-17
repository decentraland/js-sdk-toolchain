import { Vector3, TransformNode, Quaternion, Matrix, GizmoManager, Nullable, IRotationGizmo } from '@babylonjs/core'
import { Entity } from '@dcl/ecs'
import { EcsEntity } from '../EcsEntity'
import { snapManager } from '../snap-manager'
import { IGizmoTransformer } from './types'
import { LEFT_BUTTON } from '../mouse-utils'
import { configureGizmoButtons } from './utils'

// Types for better type safety
type EntityTransformData = {
  initialRotation: Quaternion
  offset?: Vector3
}

type DragState = {
  startRotation: Quaternion
  entities: EcsEntity[]
  transformData: Map<Entity, EntityTransformData>
  multiTransform?: TransformNode
  lastAppliedSnapAngle?: number // Track the last applied snap angle for smooth snapping
}

// Helper class for entity rotation calculations
class EntityRotationHelper {
  static getWorldRotation(entity: EcsEntity): Quaternion {
    if (!entity.rotationQuaternion) return Quaternion.Identity()

    if (!entity.parent || !(entity.parent instanceof TransformNode)) {
      return entity.rotationQuaternion.clone()
    }

    const parent = entity.parent as TransformNode
    const parentWorldRotation = parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
    const entityLocalRotation = entity.rotationQuaternion || Quaternion.Identity()

    return parentWorldRotation.multiply(entityLocalRotation)
  }

  static getLocalRotation(worldRotation: Quaternion, parent: TransformNode | null): Quaternion {
    if (!parent) return worldRotation.clone()

    const parentWorldRotation = parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())

    return parentWorldRotation.invert().multiply(worldRotation)
  }

  static applyRotationToEntity(entity: EcsEntity, rotation: Quaternion, isWorldAligned: boolean): void {
    if (!entity.rotationQuaternion) {
      entity.rotationQuaternion = new Quaternion()
    }

    if (isWorldAligned && entity.parent && entity.parent instanceof TransformNode) {
      const localRotation = this.getLocalRotation(rotation, entity.parent as TransformNode)
      entity.rotationQuaternion.copyFrom(localRotation)
    } else {
      entity.rotationQuaternion.copyFrom(rotation)
    }

    // Force update world matrix
    entity.computeWorldMatrix(true)
  }
}

// Helper class for multi-entity operations
class MultiEntityHelper {
  static calculateCentroid(entities: EcsEntity[]): Vector3 {
    if (entities.length === 0) return Vector3.Zero()

    const sum = entities.reduce((acc, entity) => {
      return acc.add(entity.getAbsolutePosition())
    }, Vector3.Zero())

    return sum.scale(1 / entities.length)
  }

  static createMultiTransform(centroid: Vector3, scene: any): TransformNode {
    const multiTransform = new TransformNode('multiTransform', scene)
    multiTransform.position = centroid
    multiTransform.rotationQuaternion = Quaternion.Identity()
    return multiTransform
  }

  static calculateRotatedPosition(offset: Vector3, rotationDelta: Quaternion, centroid: Vector3): Vector3 {
    const rotationMatrix = new Matrix()
    rotationDelta.toRotationMatrix(rotationMatrix)
    const rotatedOffset = Vector3.TransformCoordinates(offset, rotationMatrix)
    return centroid.add(rotatedOffset)
  }
}

// Helper class for gizmo synchronization
class GizmoSyncHelper {
  static syncGizmoRotation(gizmoNode: TransformNode, entities: EcsEntity[], isWorldAligned: boolean): void {
    if (entities.length === 0) return

    if (isWorldAligned) {
      // World aligned: reset to identity rotation
      if (gizmoNode.rotationQuaternion) {
        gizmoNode.rotationQuaternion.set(0, 0, 0, 1)
      }
    } else {
      // Local aligned: sync with the first entity's rotation (if single entity)
      if (entities.length === 1) {
        const entity = entities[0]
        if (entity.rotationQuaternion && gizmoNode.rotationQuaternion) {
          const worldRotation = EntityRotationHelper.getWorldRotation(entity)
          gizmoNode.rotationQuaternion.copyFrom(worldRotation)
        }
      } else {
        // For multiple entities, always reset to identity rotation
        if (gizmoNode.rotationQuaternion) {
          gizmoNode.rotationQuaternion.set(0, 0, 0, 1)
        }
      }
    }

    gizmoNode.computeWorldMatrix(true)
  }
}

// Helper class for smooth snapping calculations
class SmoothSnapHelper {
  static getRotationAngle(quaternion: Quaternion): number {
    const normalized = quaternion.normalize()
    const { w } = normalized

    // For very small rotations, return 0
    if (Math.abs(w) > 0.9999) {
      return 0
    }

    return 2 * Math.acos(Math.abs(w))
  }

  static shouldApplySnap(currentAngle: number, lastAppliedAngle: number | undefined, snapThreshold: number): boolean {
    // If snapping is disabled, always apply rotation immediately
    if (!snapManager.isEnabled()) {
      return true
    }

    if (lastAppliedAngle === undefined) {
      // First time, apply snap if we've moved significantly
      return Math.abs(currentAngle) >= snapThreshold * 0.5
    }

    // Check if we've moved enough to warrant a new snap
    const angleDifference = Math.abs(currentAngle - lastAppliedAngle)
    return angleDifference >= snapThreshold
  }

  static getSnapThreshold(): number {
    // Get snap threshold in radians from the snap manager
    return snapManager.getRotationSnap()
  }

  static isSnapEnabled(): boolean {
    return snapManager.isEnabled()
  }
}

export class RotationGizmo implements IGizmoTransformer {
  private rotationGizmo: Nullable<IRotationGizmo> = null
  private currentEntities: EcsEntity[] = []
  private currentEntityIds = new Set<Entity>()
  private dragState: DragState | null = null

  // Observers
  private dragStartObserver: any = null
  private dragObserver: any = null
  private dragEndObserver: any = null

  // Callbacks
  private updateEntityRotation: ((entity: EcsEntity) => void) | null = null
  private updateEntityPosition: ((entity: EcsEntity) => void) | null = null
  private dispatchOperations: (() => void) | null = null

  // Configuration
  private isWorldAligned = true
  private sceneContext: any = null

  constructor(private gizmoManager: GizmoManager, private snapRotation: (rotation: Quaternion) => Quaternion) {}

  setup(): void {
    if (!this.gizmoManager.gizmos.rotationGizmo) return

    this.rotationGizmo = this.gizmoManager.gizmos.rotationGizmo
    this.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = !this.isWorldAligned
  }

  enable(): void {
    if (!this.gizmoManager.gizmos.rotationGizmo) return
    this.setupDragObservables()
    // Configure gizmo to only work with left click
    configureGizmoButtons(this.gizmoManager.gizmos.rotationGizmo, [LEFT_BUTTON])
  }

  cleanup(): void {
    this.rotationGizmo = null
    this.cleanupDragObservables()
    this.clearDragState()
    this.currentEntityIds.clear()
  }

  setEntities(entities: EcsEntity[]): void {
    this.currentEntities = entities
    this.currentEntityIds = new Set(entities.map((e) => e.entityId))
    this.syncGizmoRotation()
  }

  setUpdateCallbacks(
    updateEntityRotation: (entity: EcsEntity) => void,
    updateEntityPosition: (entity: EcsEntity) => void,
    dispatchOperations: () => void,
    sceneContext?: any
  ): void {
    this.updateEntityRotation = updateEntityRotation
    this.updateEntityPosition = updateEntityPosition
    this.dispatchOperations = dispatchOperations
    this.sceneContext = sceneContext
  }

  setWorldAligned(value: boolean): void {
    this.isWorldAligned = value

    if (this.gizmoManager.gizmos.rotationGizmo) {
      this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = !value
    }

    this.syncGizmoRotation()
  }

  setSnapDistance(_distance: number): void {
    // We handle the snap distance in the snap manager
    return
  }

  onDragStart(entities: EcsEntity[], gizmoNode: TransformNode): void {
    const selectionChanged = this.hasSelectionChanged(entities)

    if (selectionChanged) {
      this.clearDragState()
      this.initializeDragState(entities, gizmoNode)
      // Update current entity IDs for selection change detection
      this.currentEntityIds = new Set(entities.map((e) => e.entityId))
    } else {
      this.updateDragStateRotations(entities)
    }

    // Ensure dragState exists before setting startRotation
    if (!this.dragState) {
      this.initializeDragState(entities, gizmoNode)
    }

    // Store the initial gizmo rotation for delta calculation
    this.dragState!.startRotation = gizmoNode.rotationQuaternion?.clone() || Quaternion.Identity()
  }

  update(entities: EcsEntity[], gizmoNode: TransformNode): void {
    if (entities.length === 0) return

    // Ensure dragState exists
    if (!this.dragState) {
      console.warn('RotationGizmo: No drag state found, initializing...')
      this.initializeDragState(entities, gizmoNode)
    }

    if (entities.length === 1) {
      this.updateSingleEntity(entities[0], gizmoNode)
    } else {
      this.updateMultipleEntities(entities, gizmoNode)
    }
  }

  onDragEnd(): void {
    if (this.currentEntities.length > 1) {
      this.updateMultipleEntitiesRotation()
    }

    // Only sync gizmo for world alignment
    // For local alignment, let the gizmo maintain its current rotation
    if (this.isWorldAligned) {
      this.syncGizmoRotation()
    }

    this.clearDragState()
  }

  // Private methods for drag observable management
  private setupDragObservables(): void {
    if (!this.gizmoManager.gizmos.rotationGizmo) return

    const rotationGizmo = this.gizmoManager.gizmos.rotationGizmo

    this.dragStartObserver = rotationGizmo.onDragStartObservable.add(() => {
      if (this.gizmoManager.attachedNode) {
        this.onDragStart(this.currentEntities, this.gizmoManager.attachedNode as TransformNode)
      }
    })

    this.dragObserver = rotationGizmo.onDragObservable.add(() => {
      if (this.gizmoManager.attachedNode) {
        this.update(this.currentEntities, this.gizmoManager.attachedNode as TransformNode)

        if (this.updateEntityRotation) {
          this.currentEntities.forEach(this.updateEntityRotation)
        }
      }
    })

    this.dragEndObserver = rotationGizmo.onDragEndObservable.add(() => {
      this.onDragEnd()

      if (this.dispatchOperations) {
        this.dispatchOperations()
      }
    })
  }

  private cleanupDragObservables(): void {
    if (!this.gizmoManager.gizmos.rotationGizmo) return

    const rotationGizmo = this.gizmoManager.gizmos.rotationGizmo

    if (this.dragStartObserver) {
      rotationGizmo.onDragStartObservable.remove(this.dragStartObserver)
      this.dragStartObserver = null
    }

    if (this.dragObserver) {
      rotationGizmo.onDragObservable.remove(this.dragObserver)
      this.dragObserver = null
    }

    if (this.dragEndObserver) {
      rotationGizmo.onDragEndObservable.remove(this.dragEndObserver)
      this.dragEndObserver = null
    }
  }

  // Private methods for drag state management
  private clearDragState(): void {
    if (this.dragState?.multiTransform) {
      this.dragState.multiTransform.dispose()
    }
    this.dragState = null
  }

  private initializeDragState(entities: EcsEntity[], gizmoNode: TransformNode): void {
    const transformData = new Map<Entity, EntityTransformData>()

    if (entities.length === 1) {
      this.initializeSingleEntityDragState(entities[0], transformData)
    } else {
      this.initializeMultipleEntitiesDragState(entities, transformData)
    }

    this.dragState = {
      startRotation: Quaternion.Identity(),
      entities,
      transformData
    }
  }

  private initializeSingleEntityDragState(entity: EcsEntity, transformData: Map<Entity, EntityTransformData>): void {
    const initialRotation = this.isWorldAligned
      ? EntityRotationHelper.getWorldRotation(entity)
      : entity.rotationQuaternion?.clone() || Quaternion.Identity()

    transformData.set(entity.entityId, { initialRotation })
  }

  private initializeMultipleEntitiesDragState(
    entities: EcsEntity[],
    transformData: Map<Entity, EntityTransformData>
  ): void {
    const centroid = MultiEntityHelper.calculateCentroid(entities)
    const multiTransform = MultiEntityHelper.createMultiTransform(centroid, entities[0].scene)

    for (const entity of entities) {
      const worldPosition = entity.getAbsolutePosition()
      const offset = worldPosition.subtract(centroid)

      const initialRotation = this.isWorldAligned
        ? EntityRotationHelper.getWorldRotation(entity)
        : entity.rotationQuaternion?.clone() || Quaternion.Identity()

      transformData.set(entity.entityId, {
        initialRotation,
        offset
      })
    }

    this.dragState!.multiTransform = multiTransform
  }

  private updateDragStateRotations(entities: EcsEntity[]): void {
    if (!this.dragState) return

    for (const entity of entities) {
      const data = this.dragState.transformData.get(entity.entityId)
      if (data) {
        data.initialRotation = this.isWorldAligned
          ? EntityRotationHelper.getWorldRotation(entity)
          : entity.rotationQuaternion?.clone() || Quaternion.Identity()
      }
    }
  }

  // Private methods for entity updates
  private updateSingleEntity(entity: EcsEntity, gizmoNode: TransformNode): void {
    if (!gizmoNode.rotationQuaternion || !this.dragState) return

    const data = this.dragState.transformData.get(entity.entityId)
    if (!data) return

    if (this.isWorldAligned) {
      this.updateSingleEntityWorldAligned(entity, gizmoNode, data)
    } else {
      this.updateSingleEntityLocalAligned(entity, gizmoNode)
    }
  }

  private updateSingleEntityWorldAligned(entity: EcsEntity, gizmoNode: TransformNode, data: EntityTransformData): void {
    const currentGizmoRotation = gizmoNode.rotationQuaternion
    if (!currentGizmoRotation) return

    const hasRotated = !currentGizmoRotation.equals(this.dragState!.startRotation)

    if (hasRotated) {
      const rotationDelta = this.dragState!.startRotation.invert().multiply(currentGizmoRotation)

      // Calculate the accumulated rotation angle since drag start
      const accumulatedAngle = SmoothSnapHelper.getRotationAngle(rotationDelta)
      const snapThreshold = SmoothSnapHelper.getSnapThreshold()

      // Check if we should apply the snap based on the accumulated angle
      const shouldApplySnap = SmoothSnapHelper.shouldApplySnap(
        accumulatedAngle,
        this.dragState!.lastAppliedSnapAngle,
        snapThreshold
      )

      if (shouldApplySnap) {
        // Apply the snapped rotation
        const snappedRotationDelta = this.snapRotation(rotationDelta)
        const newWorldRotation = snappedRotationDelta.multiply(data.initialRotation)

        EntityRotationHelper.applyRotationToEntity(entity, newWorldRotation, this.isWorldAligned)

        // Update the last applied snap angle to the accumulated angle
        this.dragState!.lastAppliedSnapAngle = accumulatedAngle
      }
      // If we shouldn't apply snap, the entity keeps its current rotation
      // The gizmo continues to move freely until the next threshold
    } else {
      // Gizmo hasn't rotated, keep the entity's initial rotation
      EntityRotationHelper.applyRotationToEntity(entity, data.initialRotation, this.isWorldAligned)
    }
  }

  private updateSingleEntityLocalAligned(entity: EcsEntity, gizmoNode: TransformNode): void {
    const currentGizmoRotation = gizmoNode.rotationQuaternion
    if (!currentGizmoRotation) return

    const data = this.dragState!.transformData.get(entity.entityId)
    if (!data) return

    const hasRotated = !currentGizmoRotation.equals(this.dragState!.startRotation)

    if (hasRotated) {
      // Calculate the rotation delta from the start of the drag
      const rotationDelta = this.dragState!.startRotation.invert().multiply(currentGizmoRotation)

      // Calculate the accumulated rotation angle since drag start
      const accumulatedAngle = SmoothSnapHelper.getRotationAngle(rotationDelta)
      const snapThreshold = SmoothSnapHelper.getSnapThreshold()

      // Check if we should apply the snap based on the accumulated angle
      const shouldApplySnap = SmoothSnapHelper.shouldApplySnap(
        accumulatedAngle,
        this.dragState!.lastAppliedSnapAngle,
        snapThreshold
      )

      if (shouldApplySnap) {
        // Apply the snapped rotation
        const snappedGizmoRotation = this.snapRotation(currentGizmoRotation)

        // For local alignment, the gizmo rotation represents the target world rotation
        // Convert it to local rotation for the entity
        if (entity.parent && entity.parent instanceof TransformNode) {
          const parent = entity.parent as TransformNode
          const parentWorldRotation =
            parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
          const localRotation = parentWorldRotation.invert().multiply(snappedGizmoRotation)

          if (!entity.rotationQuaternion) {
            entity.rotationQuaternion = new Quaternion()
          }
          entity.rotationQuaternion.copyFrom(localRotation)
        } else {
          // No parent, world rotation is local rotation
          if (!entity.rotationQuaternion) {
            entity.rotationQuaternion = new Quaternion()
          }
          entity.rotationQuaternion.copyFrom(snappedGizmoRotation)
        }

        // Update the last applied snap angle to the accumulated angle
        this.dragState!.lastAppliedSnapAngle = accumulatedAngle
      }
      // If we shouldn't apply snap, the entity keeps its current rotation
      // The gizmo continues to move freely until the next threshold
    } else {
      // Gizmo hasn't rotated, keep the entity's initial rotation
      if (!entity.rotationQuaternion) {
        entity.rotationQuaternion = new Quaternion()
      }
      entity.rotationQuaternion.copyFrom(data.initialRotation)
    }

    // Force update world matrix
    entity.computeWorldMatrix(true)
  }

  private updateMultipleEntities(entities: EcsEntity[], gizmoNode: TransformNode): void {
    if (!gizmoNode.rotationQuaternion || !this.dragState) return

    // Ensure we have the multiTransform and initial data
    if (!this.dragState.multiTransform || this.dragState.transformData.size === 0) {
      // If we don't have the data, recreate them
      this.clearDragState()
      this.initializeDragState(entities, gizmoNode)
    }

    const currentGizmoRotation = gizmoNode.rotationQuaternion
    const hasRotated = !currentGizmoRotation.equals(this.dragState.startRotation)

    if (hasRotated) {
      const rotationDelta = this.dragState.startRotation.invert().multiply(currentGizmoRotation)

      // Calculate the accumulated rotation angle since drag start
      const accumulatedAngle = SmoothSnapHelper.getRotationAngle(rotationDelta)
      const snapThreshold = SmoothSnapHelper.getSnapThreshold()

      // Check if we should apply the snap based on the accumulated angle
      const shouldApplySnap = SmoothSnapHelper.shouldApplySnap(
        accumulatedAngle,
        this.dragState.lastAppliedSnapAngle,
        snapThreshold
      )

      if (shouldApplySnap) {
        // Apply the snapped rotation
        const snappedRotationDelta = this.snapRotation(rotationDelta)

        this.applyRotationToMultipleEntities(entities, snappedRotationDelta)

        // Update the last applied snap angle to the accumulated angle
        this.dragState.lastAppliedSnapAngle = accumulatedAngle
      }
      // If we shouldn't apply snap, the entities keep their current rotation
      // The gizmo continues to move freely until the next threshold
    } else {
      this.resetMultipleEntitiesToInitialState(entities)
    }
  }

  private applyRotationToMultipleEntities(entities: EcsEntity[], rotationDelta: Quaternion): void {
    if (!this.dragState?.multiTransform) return

    for (const entity of entities) {
      const data = this.dragState.transformData.get(entity.entityId)
      if (!data || !data.offset) continue

      const newWorldPosition = MultiEntityHelper.calculateRotatedPosition(
        data.offset,
        rotationDelta,
        this.dragState.multiTransform!.position
      )

      const newWorldRotation = rotationDelta.multiply(data.initialRotation)

      this.applyTransformToEntity(entity, newWorldPosition, newWorldRotation)
    }
  }

  private resetMultipleEntitiesToInitialState(entities: EcsEntity[]): void {
    for (const entity of entities) {
      const data = this.dragState!.transformData.get(entity.entityId)
      if (!data) continue

      EntityRotationHelper.applyRotationToEntity(entity, data.initialRotation, this.isWorldAligned)
    }
  }

  private applyTransformToEntity(entity: EcsEntity, worldPosition: Vector3, worldRotation: Quaternion): void {
    if (entity.parent && entity.parent instanceof TransformNode) {
      const parent = entity.parent as TransformNode
      const parentWorldMatrixInverse = parent.getWorldMatrix().clone().invert()

      const localPosition = Vector3.TransformCoordinates(worldPosition, parentWorldMatrixInverse)
      const localRotation = EntityRotationHelper.getLocalRotation(worldRotation, parent)

      entity.position.copyFrom(localPosition)
      if (!entity.rotationQuaternion) {
        entity.rotationQuaternion = new Quaternion()
      }
      entity.rotationQuaternion.copyFrom(localRotation)
    } else {
      entity.position.copyFrom(worldPosition)
      if (!entity.rotationQuaternion) {
        entity.rotationQuaternion = new Quaternion()
      }
      entity.rotationQuaternion.copyFrom(worldRotation)
    }

    // Force update world matrix
    entity.computeWorldMatrix(true)
  }

  // Private utility methods
  private hasSelectionChanged(entities: EcsEntity[]): boolean {
    const newEntityIds = new Set(entities.map((e) => e.entityId))

    if (this.currentEntityIds.size !== newEntityIds.size) return true

    for (const id of newEntityIds) {
      if (!this.currentEntityIds.has(id)) return true
    }

    return false
  }

  private syncGizmoRotation(): void {
    if (!this.gizmoManager.attachedNode) return

    const gizmoNode = this.gizmoManager.attachedNode as TransformNode
    GizmoSyncHelper.syncGizmoRotation(gizmoNode, this.currentEntities, this.isWorldAligned)
  }

  private updateMultipleEntitiesRotation(): void {
    if (!this.sceneContext || this.currentEntities.length <= 1) return

    this.currentEntities.forEach((entity) => {
      if (this.updateEntityRotation) {
        this.updateEntityRotation(entity)
      }
      if (this.updateEntityPosition) {
        this.updateEntityPosition(entity)
      }
    })

    if (this.dispatchOperations) {
      this.dispatchOperations()
    }
  }
}
