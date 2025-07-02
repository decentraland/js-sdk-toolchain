import { Quaternion } from '@babylonjs/core'
import { ComponentType, Entity, TransformType } from '@dcl/ecs'
import type { ComponentOperation } from '../component-operations'
import { EcsEntity } from '../EcsEntity'
import { ROOT } from '../../../sdk/tree'
import { getRoot } from '../../../sdk/nodes'

export const putTransformComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const newValue = component.getOrNull(entity.entityId) as TransformType | null
    const currentValue = entity.ecsComponentValues.transform
    entity.ecsComponentValues.transform = newValue || undefined
    let needsReparenting = false

    if (!currentValue && newValue) {
      needsReparenting = true
      // Initialize with clean rotation for new entities
      if (!entity.rotationQuaternion) {
        entity.rotationQuaternion = Quaternion.Identity()
      } else {
        entity.rotationQuaternion.set(0, 0, 0, 1)
      }
    } else if (currentValue && !newValue) {
      // remove current value
      needsReparenting = true
      entity.position.setAll(0)
      if (!entity.rotationQuaternion) entity.rotationQuaternion = Quaternion.Identity()
      else entity.rotationQuaternion.set(0, 0, 0, 1)
      entity.scaling.setAll(1)
      reparentChildrenToRoot(entity)
    }

    // set the new value
    if (newValue) {
      needsReparenting ||= currentValue?.parent !== newValue.parent
      entity.position.set(newValue.position.x, newValue.position.y, newValue.position.z)

      // Handle rotation conversion
      if (!entity.rotationQuaternion) {
        entity.rotationQuaternion = new Quaternion(
          newValue.rotation.x,
          newValue.rotation.y,
          newValue.rotation.z,
          newValue.rotation.w
        )
      } else {
        // Ensure we're setting the quaternion components in the right order
        entity.rotationQuaternion.set(
          newValue.rotation.x,
          newValue.rotation.y,
          newValue.rotation.z,
          newValue.rotation.w
        )
      }

      // Normalize the quaternion to ensure it's valid
      entity.rotationQuaternion.normalize()

      entity.scaling.set(newValue.scale.x, newValue.scale.y, newValue.scale.z)
    }

    if (needsReparenting) reparentEntity(entity)
  }
}

/**
 * When entities are created we must check if their "ids" are used as parent for
 * other entities. If that is the case, those children must be reparented to this
 * freshly created entity
 */
export function createDefaultTransform(entity: EcsEntity) {
  const transformContext = getTransformContextForEntity(entity)
  if (transformContext) {
    const reparentQueue = transformContext.pendingParentQueues.get(entity.entityId)
    if (reparentQueue?.size) {
      const ctx = entity.context.deref()
      for (const child of reparentQueue) {
        const childEntity = ctx?.getEntityOrNull(child)
        if (childEntity) childEntity.parent = entity
      }
      reparentQueue.clear()
    }
  }
}

/**
 * This function parents an entity with another one. It implements a queuing logic
 * to create "synthetic" entities if the selected parent doesn't exist yet. This case
 * is common, since CRDT messages are unsorted and batched.
 */
function reparentEntity(entity: EcsEntity) {
  const context = entity.context.deref()
  const parentEntityId: Entity | undefined = entity.ecsComponentValues.transform?.parent

  // when changing the root of the entity, we need to enable/disable the mesh if the root is the player or the camera
  const nodes = context?.editorComponents.Nodes.getOrNull(ROOT)?.value || []
  if (nodes.length > 0) {
    const oldRoot = getRoot(entity.entityId, nodes)
    const newRoot = getRoot(parentEntityId || ROOT, nodes)
    if (newRoot !== oldRoot) {
      const isSceneRoot = newRoot === ROOT
      if (!isSceneRoot) {
        entity.setVisibility(false)
        entity.context.deref()?.gizmos.removeEntity(entity)
      } else {
        entity.setVisibility(true)
        entity.context.deref()?.gizmos.addEntity(entity)
      }
    }
  }

  if (context) {
    // If already parented to the right entity, do nothing
    if (entity.parent && (entity.parent as EcsEntity).entityId === parentEntityId) return

    // Handle root parenting
    if (!parentEntityId) {
      entity.parent = context.rootNode
      return
    }

    // Handle parenting to another entity
    const parentEntity = context.getEntityOrNull(parentEntityId)
    if (parentEntity) {
      if (!entity.ecsComponentValues.transform) {
        // For new entities, set clean initial transforms
        context.operations.updateValue(context.Transform, entity.entityId, {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 },
          parent: parentEntityId
        })
        entity.parent = parentEntity
      } else {
        // For existing entities, preserve their current transform values
        const currentTransform = entity.ecsComponentValues.transform

        // First update the parent in the ECS component
        context.operations.updateValue(context.Transform, entity.entityId, {
          position: { ...currentTransform.position },
          rotation: { ...currentTransform.rotation },
          scale: { ...currentTransform.scale },
          parent: parentEntityId
        })

        // Then update the Babylon.js parent relationship
        // This ensures the entity maintains its world transform
        entity.computeWorldMatrix(true) // Force world matrix update
        entity.parent = parentEntity
        entity.computeWorldMatrix(true) // Force update after parenting

        // Dispatch the changes
        void context.operations.dispatch()
      }
    } else {
      scheduleFutureReparenting(entity, parentEntityId)
    }
  }
}

function scheduleFutureReparenting(entity: EcsEntity, parentEntityId: Entity) {
  const transformContext = getTransformContextForEntity(entity)
  if (transformContext) {
    let list = transformContext.pendingParentQueues.get(parentEntityId)
    if (!list) {
      list = new Set()
      transformContext.pendingParentQueues.set(parentEntityId, list)
    }
    list.add(entity.entityId)
  }
}

/**
 * This function applies the reparenting logic described in
 * https://adr.decentraland.org/adr/ADR-153, effectively moving all its children
 * entities to the scene root.
 *
 * This function is used while removing the Transform component. Since all components
 * are removed before entity disposal, it is also called while destroying an entity.
 */
function reparentChildrenToRoot(entity: EcsEntity) {
  const rootNode = entity.context.deref()?.rootNode

  if (rootNode) {
    for (const child of entity.childrenEntities()) {
      child.parent = entity
      scheduleFutureReparenting(child, entity.entityId)
    }
  } else {
    debugger // !panic
  }
}

type InternalTransformContext = {
  pendingParentQueues: Map<Entity, Set<Entity>>
}
const transformContextSymbol = Symbol('transform-component-context')
function getTransformContextForEntity(entity: EcsEntity): InternalTransformContext | undefined {
  const ctx = entity.context.deref() as any
  if (ctx) {
    if (!ctx[transformContextSymbol]) {
      ctx[transformContextSymbol] = { pendingParentQueues: new Map() }
    }
    return ctx[transformContextSymbol]
  }
}
