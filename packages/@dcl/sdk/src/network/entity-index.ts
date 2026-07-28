import { Entity, IEngine, INetowrkEntity } from '@dcl/ecs'

/**
 * Resolves the local entity that carries a network identity (`networkId:entityId`),
 * replacing the `getEntitiesWith(NetworkEntity)` scan the network layer used to run
 * once per inbound message.
 *
 * The map is a cache, not a registry: a hit counts only while the entity still
 * carries the identity it was filed under, and a miss falls back to the scan. That
 * is what keeps it honest without a single invalidation hook — NetworkEntity is
 * written from several places (`syncEntity`, the validator, an applied state dump)
 * and dropped by the engine (`reconcileWithDump`, DELETE_ENTITY), so a registry
 * would have to hook all of them and would go stale the day one is added.
 */
export function createNetworkEntityIndex(engine: IEngine, NetworkEntity: INetowrkEntity) {
  const index = new Map<string, Entity>()

  return function findNetworkEntity(networkId: number, entityId: Entity): Entity | null {
    const key = `${networkId}:${entityId}`
    const cached = index.get(key)
    if (cached !== undefined) {
      const network = NetworkEntity.getOrNull(cached)
      if (network && network.networkId === networkId && network.entityId === entityId) return cached
      index.delete(key)
    }

    for (const [entity, network] of engine.getEntitiesWith(NetworkEntity)) {
      if (network.networkId === networkId && network.entityId === entityId) {
        index.set(key, entity)
        return entity
      }
    }
    return null
  }
}
