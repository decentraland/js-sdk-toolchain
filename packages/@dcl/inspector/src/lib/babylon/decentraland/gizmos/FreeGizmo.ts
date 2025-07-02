import { Vector3, TransformNode, Scene, UtilityLayerRenderer, PointerDragBehavior, AbstractMesh } from '@babylonjs/core'
import { Entity } from '@dcl/ecs'
import { EcsEntity } from '../EcsEntity'
import { IGizmoTransformer } from './types'
import { TransformUtils } from './utils'

export class FreeGizmo implements IGizmoTransformer {
  private dragBehavior: PointerDragBehavior | null = null
  private isDragging = false
  private changeHandlers: (() => void)[] = []
  private initialStates = new Map<
    Entity,
    {
      worldPosition: Vector3
      offset: Vector3
    }
  >()

  constructor(private scene: Scene, private utilityLayer: UtilityLayerRenderer = new UtilityLayerRenderer(scene)) {}

  setup(): void {
    this.cleanup()
  }

  cleanup(): void {
    this.detachDragBehavior()
    this.initialStates.clear()
    this.isDragging = false
  }

  private detachDragBehavior() {
    if (this.dragBehavior && this.dragBehavior.attachedNode) {
      this.dragBehavior.detach()
      this.dragBehavior = null
    }
  }

  onDragStart(entities: EcsEntity[], gizmoNode: TransformNode): void {
    if (!entities.length) return

    const firstEntity = entities[0]

    // Simple drag behavior in global XZ plane
    this.dragBehavior = new PointerDragBehavior({ dragPlaneNormal: Vector3.Up() })
    this.dragBehavior.useObjectOrientationForDragging = false

    // Store initial states
    this.initialStates.clear()
    const centroid = firstEntity.getAbsolutePosition().clone()

    for (const entity of entities) {
      const worldPosition = entity.getAbsolutePosition()
      const offset = worldPosition.subtract(centroid)
      this.initialStates.set(entity.entityId, { worldPosition, offset })
    }

    // Attach behavior to first entity
    this.dragBehavior.attach(firstEntity as unknown as AbstractMesh)

    this.dragBehavior.onDragStartObservable.add(() => {
      this.isDragging = true
      this.notifyChange()
    })

    this.dragBehavior.onDragObservable.add((eventData) => {
      if (!this.isDragging || !eventData.delta) return

      // Move first entity
      const delta = eventData.delta.clone()
      delta.y = 0 // Lock Y movement
      firstEntity.position.addInPlace(delta)

      // Move other entities relative to first
      for (const entity of entities) {
        if (entity === firstEntity) continue

        const state = this.initialStates.get(entity.entityId)
        if (!state) continue

        const newWorldPosition = firstEntity.getAbsolutePosition().add(state.offset)
        const parent = entity.parent instanceof TransformNode ? entity.parent : null
        const localPosition = TransformUtils.convertToLocalPosition(newWorldPosition, parent)
        localPosition.y = state.worldPosition.y // Preserve original Y
        entity.position.copyFrom(localPosition)
      }

      this.notifyChange()
    })

    this.dragBehavior.onDragEndObservable.add(() => {
      this.isDragging = false
      this.notifyChange()
    })
  }

  private notifyChange() {
    for (const handler of this.changeHandlers) {
      handler()
    }
  }

  onChange(callback: () => void) {
    this.changeHandlers.push(callback)
    return () => {
      const index = this.changeHandlers.indexOf(callback)
      if (index !== -1) {
        this.changeHandlers.splice(index, 1)
      }
    }
  }

  update(entities: EcsEntity[], gizmoNode: TransformNode): void {
    // no-op
  }

  onDragEnd(): void {
    this.cleanup()
  }

  dispose(): void {
    this.cleanup()
    this.utilityLayer.dispose()
  }
}
