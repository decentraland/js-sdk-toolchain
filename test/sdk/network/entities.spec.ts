/**
 * Unit tests for entityUtils — specifically the syncEntity duplicate-ID guard.
 *
 * Background (Sentry issue UNITY-EXPLORER-NQH):
 *   When a second player joins a multi-user scene, the CRDT state sync delivers
 *   the host's entity state *before* the joining client's main() runs.  This
 *   pre-populates the ECS with NetworkEntity components.  When main() then calls
 *   syncEntity() on those same entities, the old guard threw unconditionally
 *   because it did not exclude the entity currently being registered.
 *
 *   Fix (Option 1): skip `entityId` itself in the duplicate check so that
 *   re-registering a pre-populated entity is a no-op, while still throwing
 *   when two *different* entities compete for the same enumId.
 */

// ---------------------------------------------------------------------------
// Mock @dcl/ecs — only the symbols entityUtils actually uses at runtime
// ---------------------------------------------------------------------------
jest.mock('@dcl/ecs', () => {
  return {
    NetworkEntity: { componentId: 1001 },
    NetworkParent: { componentId: 1002 },
    Transform: { componentId: 1003 },
    SyncComponents: { componentId: 1004 }
  }
})

// ---------------------------------------------------------------------------
// Mock ./state — getDesyncedComponents is not under test here
// ---------------------------------------------------------------------------
jest.mock('../../../packages/@dcl/sdk/src/network/state', () => {
  return {
    getDesyncedComponents: () => []
  }
})

// ---------------------------------------------------------------------------
// Now import the module under test (after mocks are registered)
// ---------------------------------------------------------------------------
import { entityUtils } from '../../../packages/@dcl/sdk/src/network/entities'
import { Entity } from '../../../packages/@dcl/ecs/dist/engine/entity'

const toEntity = (n: number): Entity => n as unknown as Entity

// ---------------------------------------------------------------------------
// Helper: build a minimal mock engine for these tests
// ---------------------------------------------------------------------------
function buildMockEngine() {
  // In-memory store: Map<componentId, Map<entity, value>>
  const store = new Map<number, Map<Entity, Record<string, unknown>>>()

  function getStore(componentId: number) {
    if (!store.has(componentId)) store.set(componentId, new Map())
    return store.get(componentId)!
  }

  function makeComponent(componentId: number) {
    return {
      componentId,
      createOrReplace(entity: Entity, value: Record<string, unknown>) {
        getStore(componentId).set(entity, value)
      },
      getOrNull(entity: Entity) {
        return getStore(componentId).get(entity) ?? null
      }
    }
  }

  const engine = {
    _store: store,
    getComponent(componentId: number) {
      return makeComponent(componentId)
    },
    getEntitiesWith(component: { componentId: number }): Iterable<[Entity, Record<string, unknown>]> {
      return getStore(component.componentId).entries() as Iterable<[Entity, Record<string, unknown>]>
    }
  }

  return engine
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('entityUtils — syncEntity duplicate-ID guard', () => {
  const ENUM_ID = 42
  const NETWORK_ENTITY_CID = 1001

  it('succeeds when no NetworkEntity component exists yet (first player entering)', () => {
    const engine = buildMockEngine()
    const profile = { networkId: 7, userId: 'playerA' }
    const { syncEntity } = entityUtils(engine as any, profile)

    const entity = toEntity(512)

    expect(() => syncEntity(entity, [], ENUM_ID)).not.toThrow()
  })

  it('does NOT throw when the same entity already has the same enumId (late-join CRDT pre-population)', () => {
    /**
     * This is the exact race condition observed in Sentry UNITY-EXPLORER-NQH:
     *
     * 1. Player A enters → NetworkEntity{networkId:0, entityId:ENUM_ID} is written to entity 512
     * 2. Player B joins  → receives CRDT state → entity 512 gets NetworkEntity{0, ENUM_ID} in B's ECS
     * 3. Player B's main() runs → calls syncEntity(512, [], ENUM_ID)
     *
     * Before the fix the guard would see the pre-populated NetworkEntity and throw.
     * After the fix it skips the entity being registered and proceeds without error.
     */
    const engine = buildMockEngine()
    const profile = { networkId: 7, userId: 'playerB' }

    // Simulate CRDT state sync: pre-populate entity 512 with the exact
    // NetworkEntity value that syncEntity would produce.
    const entity = toEntity(512)
    engine
      .getComponent(NETWORK_ENTITY_CID)
      .createOrReplace(entity, { networkId: 0, entityId: toEntity(ENUM_ID) })

    const { syncEntity } = entityUtils(engine as any, profile)

    // Must not throw — this is the regression test for UNITY-EXPLORER-NQH
    expect(() => syncEntity(entity, [], ENUM_ID)).not.toThrow()
  })

  it('DOES throw when a different entity already claims the same enumId (genuine collision)', () => {
    /**
     * The guard must still fire when two *different* entities try to claim the
     * same enumId — that is a real scene bug.
     */
    const engine = buildMockEngine()
    const profile = { networkId: 7, userId: 'playerA' }

    // Entity 100 already owns enumId 42
    const existingEntity = toEntity(100)
    engine
      .getComponent(NETWORK_ENTITY_CID)
      .createOrReplace(existingEntity, { networkId: 0, entityId: toEntity(ENUM_ID) })

    const { syncEntity } = entityUtils(engine as any, profile)

    // A different entity (200) trying to claim the same enumId should throw
    const newEntity = toEntity(200)
    expect(() => syncEntity(newEntity, [], ENUM_ID)).toThrow(
      `syncEntity failed because the id provided (${ENUM_ID}) is already in use by a different entity`
    )
  })

  it('allows the same entity to call syncEntity twice with the same enumId (idempotent re-registration)', () => {
    /**
     * A scene that calls syncEntity in a system tick (rather than just main)
     * may call it multiple times on the same entity.  This should be safe.
     */
    const engine = buildMockEngine()
    const profile = { networkId: 7, userId: 'playerA' }
    const { syncEntity } = entityUtils(engine as any, profile)

    const entity = toEntity(512)
    syncEntity(entity, [], ENUM_ID) // first call — registers the entity
    expect(() => syncEntity(entity, [], ENUM_ID)).not.toThrow() // second call — idempotent
  })

  it('allows different entities to use different enumIds without conflict', () => {
    const engine = buildMockEngine()
    const profile = { networkId: 7, userId: 'playerA' }
    const { syncEntity } = entityUtils(engine as any, profile)

    expect(() => syncEntity(toEntity(512), [], 10)).not.toThrow()
    expect(() => syncEntity(toEntity(513), [], 20)).not.toThrow()
  })

  it('throws if profile is not yet initialized', () => {
    const engine = buildMockEngine()
    const profile = { networkId: 0, userId: '' } // networkId=0 means not ready
    const { syncEntity } = entityUtils(engine as any, profile)

    expect(() => syncEntity(toEntity(512), [], ENUM_ID)).toThrow(
      'Profile not initialized. Call syncEntity inside the main() function.'
    )
  })
})
