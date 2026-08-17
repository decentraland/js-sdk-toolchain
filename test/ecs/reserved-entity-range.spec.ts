import { Engine } from '../../packages/@dcl/ecs/src/engine'
import {
  Entity,
  EntityUtils,
  IEntityContainer,
  RESERVED_STATIC_ENTITIES,
  createEntityContainer
} from '../../packages/@dcl/ecs/src/engine/entity'
import { Schemas } from '../../packages/@dcl/ecs/src/schemas'

/**
 * The renderer owns entity NUMBERS [0, RESERVED_STATIC_ENTITIES) at every version:
 * root/player/camera plus the range the avatar-communication system hands to remote
 * players. A scene's entity container must never generate, recycle, or track one.
 *
 * Regression coverage for the collision where a renderer DELETE_ENTITY tombstone for a
 * departed peer's avatar slot seeded the scene's recycling pool, so `engine.addEntity()`
 * returned an id the renderer independently reissued to the next joining peer. Both
 * sides derive `toEntityId(number, version + 1)` from the same stored version, so the
 * two allocators produce the identical id rather than merely overlapping ranges.
 *
 * Imports avoid the package barrel (`packages/@dcl/ecs/src`) deliberately: it eagerly
 * instantiates extended components and cannot be required from a spec without a prior
 * codegen build.
 */
describe('Reserved entity range ownership', () => {
  const AVATAR_SLOT_NUMBER = 32

  const entityNumberOf = (entity: Entity): number => EntityUtils.fromEntityId(entity)[0]

  describe('when the renderer reports a remote player avatar entity as deleted', () => {
    let entityContainer: IEntityContainer
    let avatarSlot: Entity

    beforeEach(() => {
      entityContainer = createEntityContainer()
      avatarSlot = EntityUtils.toEntityId(AVATAR_SLOT_NUMBER, 0)
      // Release one scene-owned entity so generateEntity() reaches its recycling branch
      // instead of short-circuiting to generateNewEntity().
      const sceneOwned = entityContainer.generateEntity()
      entityContainer.removeEntity(sceneOwned)
      entityContainer.releaseRemovedEntities()
    })

    it('should refuse to record the reserved entity number in the recycling pool', () => {
      expect(entityContainer.updateRemovedEntity(avatarSlot)).toBe(false)
    })

    // updateUsedEntity is unreachable for reserved numbers from the CRDT path, because
    // getEntityState returns `Reserved` rather than `Unknown` and only `Unknown` calls it.
    // Asserted anyway: it is public on IEntityContainer, and its `v > 0` branch would
    // otherwise seed removedEntities with a reserved number — the same defect by a
    // different door.
    it('should refuse to mark a reserved entity number as used', () => {
      expect(entityContainer.updateUsedEntity(avatarSlot)).toBe(false)
    })

    it('should refuse to mark a recycled reserved entity number as used', () => {
      expect(entityContainer.updateUsedEntity(EntityUtils.toEntityId(AVATAR_SLOT_NUMBER, 4))).toBe(false)
    })

    it('should not expose a reserved entity number as an existing entity', () => {
      entityContainer.updateUsedEntity(avatarSlot)

      expect(Array.from(entityContainer.getExistingEntities())).not.toContain(avatarSlot)
    })

    it('should never generate an entity inside the reserved range afterwards', () => {
      entityContainer.updateRemovedEntity(avatarSlot)

      const generated = Array.from({ length: 16 }, () => entityContainer.generateEntity())

      expect(generated.filter((entity) => entityNumberOf(entity) < RESERVED_STATIC_ENTITIES)).toEqual([])
    })
  })

  describe('when a composite build offsets the entity counter past the used entities', () => {
    let entityContainer: IEntityContainer

    beforeEach(() => {
      // Reproduces the standing allocation deficit a `DCL_MAX_COMPOSITE_ENTITY` build
      // creates: the counter starts past the composite's entities while only some of
      // them are ever marked used, so generateEntity() takes the recycling branch with
      // no scene-side removal at all.
      entityContainer = createEntityContainer({ reservedStaticEntities: RESERVED_STATIC_ENTITIES })
      for (let entityNumber = RESERVED_STATIC_ENTITIES; entityNumber < RESERVED_STATIC_ENTITIES + 8; entityNumber++) {
        entityContainer.updateUsedEntity(EntityUtils.toEntityId(entityNumber, 0))
      }
      entityContainer.updateRemovedEntity(EntityUtils.toEntityId(AVATAR_SLOT_NUMBER, 0))
    })

    it('should keep every allocation outside the reserved range', () => {
      const generated = Array.from({ length: 24 }, () => entityContainer.generateEntity())

      expect(generated.filter((entity) => entityNumberOf(entity) < RESERVED_STATIC_ENTITIES)).toEqual([])
    })
  })

  describe('when removing an entity whose number is reserved', () => {
    let entityContainer: IEntityContainer

    beforeEach(() => {
      entityContainer = createEntityContainer()
    })

    describe('and its version is zero', () => {
      it('should refuse the removal', () => {
        expect(entityContainer.removeEntity(EntityUtils.toEntityId(AVATAR_SLOT_NUMBER, 0))).toBe(false)
      })
    })

    describe('and its version is greater than zero, so the packed id exceeds the reserved bound', () => {
      let recycledAvatarSlot: Entity

      beforeEach(() => {
        recycledAvatarSlot = EntityUtils.toEntityId(AVATAR_SLOT_NUMBER, 1)
      })

      it('should pack to an id above the reserved bound, which is why a raw comparison missed it', () => {
        expect(recycledAvatarSlot as number).toBeGreaterThan(RESERVED_STATIC_ENTITIES)
      })

      it('should still refuse the removal', () => {
        expect(entityContainer.removeEntity(recycledAvatarSlot)).toBe(false)
      })
    })
  })

  describe('when a scene calls engine.removeEntity on a live remote player avatar entity', () => {
    let engine: ReturnType<typeof Engine>
    // Stands in for a renderer-owned component on the avatar entity. In production the
    // component that matters is the one-shot PlayerIdentityData: the renderer sends it
    // once per peer, so a local purge is never repaired and the entity becomes a moving
    // Transform with no identity.
    let RendererOwned: ReturnType<ReturnType<typeof Engine>['defineComponent']>
    let recycledAvatarSlot: Entity

    beforeEach(() => {
      engine = Engine()
      RendererOwned = engine.defineComponent('test::renderer-owned', { address: Schemas.String })
      recycledAvatarSlot = EntityUtils.toEntityId(AVATAR_SLOT_NUMBER, 1)
      RendererOwned.create(recycledAvatarSlot, { address: '0xabc' })
    })

    it('should report the removal as refused', () => {
      expect(engine.removeEntity(recycledAvatarSlot)).toBe(false)
    })

    it('should not purge the renderer-owned component the scene cannot restore', () => {
      engine.removeEntity(recycledAvatarSlot)

      expect(RendererOwned.getOrNull(recycledAvatarSlot)).not.toBeNull()
    })

    it('should keep the entity resolvable by a getEntitiesWith query', () => {
      engine.removeEntity(recycledAvatarSlot)

      expect(Array.from(engine.getEntitiesWith(RendererOwned))).toHaveLength(1)
    })
  })

  describe('when a scene removes an entity it genuinely owns', () => {
    let engine: ReturnType<typeof Engine>
    let SceneOwned: ReturnType<ReturnType<typeof Engine>['defineComponent']>
    let sceneEntity: Entity

    beforeEach(() => {
      engine = Engine()
      SceneOwned = engine.defineComponent('test::scene-owned', { value: Schemas.Int })
      sceneEntity = engine.addEntity()
      SceneOwned.create(sceneEntity, { value: 7 })
    })

    it('should report the removal as accepted', () => {
      expect(engine.removeEntity(sceneEntity)).toBe(true)
    })

    it('should purge its components, so gating the purge did not break ordinary removal', () => {
      engine.removeEntity(sceneEntity)

      expect(SceneOwned.getOrNull(sceneEntity)).toBeNull()
    })
  })
})
