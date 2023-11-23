import { Entity, NetworkEntity, NetworkParent, Transform, engine } from '@dcl/ecs'

export function* getChilds(parent: Entity): Iterable<Entity> {
  const network = NetworkEntity.getOrNull(parent)
  if (network) {
    for (const [entity, parent] of engine.getEntitiesWith(NetworkParent)) {
      if (parent.entityId === network.entityId && parent.networkId === network.networkId) {
        yield entity
      }
    }
  }
}

export function getFirstChild(parent: Entity): Entity | undefined {
  const childs = [...getChilds(parent)]
  return childs[0] ?? undefined
}

export function getParent(child: Entity): Entity | undefined {
  const parent = NetworkParent.getOrNull(child)
  if (!parent) return undefined
  for (const [entity, network] of engine.getEntitiesWith(NetworkEntity)) {
    if (parent.networkId === network.networkId && parent.entityId === network.entityId) {
      return entity
    }
  }
  return undefined
}

export function parentEntity(entity: Entity, parent: Entity) {
  const network = NetworkEntity.getOrNull(parent)
  if (!network) {
    throw new Error('Please call syncEntity on the parent before parentEntity fn')
  }

  // Create network parent component
  NetworkParent.createOrReplace(entity, network)

  // If we dont have a transform for this entity, create an empty one to send it to the renderer
  if (!Transform.getOrNull(entity)) {
    Transform.create(entity)
  }
}
/**
 * enum SyncEnum {
 *  PARENT_DOOR,
 *  CHILD_DOOR
 * }

* // Create parent
 * const parent = engine.addEntity() // 512
 * Transform.create(parent, { position: 4, 1, 4 })
 * syncEntity(parent, [], SyncEnum.PARENT_DOOR) // { networkId: 0, entityId: 1 }

* // Create Child
 * const child = engine.addEntity() // 513
 * Transform.create(child)
 * parentEntity(child, parent) // NetworkParent => { networkId: 0, entityId: 1 }
 * syncEntity(child, [Transform.componentId], SyncEnum.CHILD_DOOR) // { networkId: 0, entityId: 2 }
 *
 * // Now we should see the child on the position 4,1,4 on every client.
 * // But WHAAAAAAAAAAT if we create a new entity on user click, and change the parenting to that entity with the position of the user.
 * // TODO: this case.
 */
