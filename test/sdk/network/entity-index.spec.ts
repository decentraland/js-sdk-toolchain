/**
 * The index is a cache with no invalidation hook, so what it owes is that a
 * cached hit is never returned once it stopped being true. These are the three
 * ways the network layer makes that happen.
 */
import { Engine, Entity } from '../../../packages/@dcl/ecs'
import { createNetworkEntityIndex } from '../../../packages/@dcl/sdk/src/network/entity-index'
import { defineComponents } from './utils/harness'

function setup() {
  const engine = Engine()
  const { NetworkEntity } = defineComponents(engine)
  return { engine, NetworkEntity, find: createNetworkEntityIndex(engine, NetworkEntity) }
}

describe('network entity index', () => {
  it('resolves an entity by its network identity, and misses on an unknown one', () => {
    const { engine, NetworkEntity, find } = setup()
    const entity = engine.addEntity()
    NetworkEntity.create(entity, { networkId: 7, entityId: 512 as Entity })

    expect(find(7, 512 as Entity)).toBe(entity)
    // repeated, so the second lookup is served by the cache
    expect(find(7, 512 as Entity)).toBe(entity)
    expect(find(7, 513 as Entity)).toBeNull()
    expect(find(8, 512 as Entity)).toBeNull()
  })

  it('does not return an entity the engine has removed', () => {
    const { engine, NetworkEntity, find } = setup()
    const entity = engine.addEntity()
    NetworkEntity.create(entity, { networkId: 7, entityId: 512 as Entity })
    expect(find(7, 512 as Entity)).toBe(entity)

    // what reconcileWithDump does to an entity the state dump left out
    NetworkEntity.deleteFrom(entity)
    engine.removeEntity(entity)

    expect(find(7, 512 as Entity)).toBeNull()
  })

  it('follows an identity that moved to a different local entity', () => {
    const { engine, NetworkEntity, find } = setup()
    const first = engine.addEntity()
    NetworkEntity.create(first, { networkId: 7, entityId: 512 as Entity })
    expect(find(7, 512 as Entity)).toBe(first)

    NetworkEntity.deleteFrom(first)
    const second = engine.addEntity()
    NetworkEntity.create(second, { networkId: 7, entityId: 512 as Entity })

    expect(find(7, 512 as Entity)).toBe(second)
  })
})
