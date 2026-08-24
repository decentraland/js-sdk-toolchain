import { Engine } from '../../packages/@dcl/ecs/src/engine'
import {
  Entity,
  EntityState,
  EntityUtils,
  IEntityContainer,
  RESERVED_STATIC_ENTITIES,
  createEntityContainer
} from '../../packages/@dcl/ecs/src/engine/entity'
import { Schemas } from '../../packages/@dcl/ecs/src/schemas'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { PutComponentOperation } from '../../packages/@dcl/ecs/src/serialization/crdt'

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
 */
describe('Reserved entity range ownership', () => {
  const AVATAR_SLOT_NUMBER = 32

  const entityNumberOf = (entity: Entity): number => EntityUtils.fromEntityId(entity)[0]

  describe('when the renderer reports a remote player avatar entity as deleted', () => {
    let entityContainer: IEntityContainer
    let avatarSlot: Entity

    // This setup exists to make the tests DISCRIMINATE. Against a fixed container the
    // tombstone is refused outright, so neither precondition below has any effect — but both
    // are what make these tests fail against an unfixed one, and getting either wrong makes
    // them vacuous. First, a standing allocation deficit, so generateEntity() reaches its
    // recycling loop rather than short-circuiting to generateNewEntity(). Second, the avatar
    // number is recorded BEFORE any recyclable scene number: `removedEntities` is a Map
    // iterated in insertion order and the loop returns the first eligible entry, so a scene
    // number recorded first would be handed out and the avatar key never reached.
    beforeEach(() => {
      entityContainer = createEntityContainer()
      avatarSlot = EntityUtils.toEntityId(AVATAR_SLOT_NUMBER, 0)
      // 4 allocations, then 2 released -> counter 516, used 2 -> deficit of 2.
      const owned = Array.from({ length: 4 }, () => entityContainer.generateEntity())
      // Avatar tombstone FIRST, so its key would lead the insertion order (see above).
      entityContainer.updateRemovedEntity(avatarSlot)
      entityContainer.removeEntity(owned[0])
      entityContainer.removeEntity(owned[1])
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
      const generated = Array.from({ length: 16 }, () => entityContainer.generateEntity())

      expect(generated.filter((entity) => entityNumberOf(entity) < RESERVED_STATIC_ENTITIES)).toEqual([])
    })

    // Guards the setup itself: if the deficit disappears, generateEntity() short-circuits and
    // the test above passes for the wrong reason.
    it('should recycle a released number, confirming the allocation deficit', () => {
      const generated = entityContainer.generateEntity()

      expect(EntityUtils.fromEntityId(generated)[1]).toBeGreaterThan(0)
    })
  })

  describe('when a composite build offsets the entity counter past the used entities', () => {
    let entityContainer: IEntityContainer

    const MAX_COMPOSITE_ENTITY = 745
    const COMPOSITE_ENTITY_COUNT = 230

    beforeEach(() => {
      // createEntityContainer reads the define at call time, so assigning the global first
      // reproduces the build: the counter starts at 746 while only 230 composite entities are
      // ever marked used, leaving a permanent deficit of 4. Marking entities used without the
      // define leaves the counter at 512 and never enters the recycling loop at all.
      ;(globalThis as unknown as { DCL_MAX_COMPOSITE_ENTITY: number }).DCL_MAX_COMPOSITE_ENTITY = MAX_COMPOSITE_ENTITY
      entityContainer = createEntityContainer()
      for (let i = 0; i < COMPOSITE_ENTITY_COUNT; i++) {
        entityContainer.updateUsedEntity(EntityUtils.toEntityId(RESERVED_STATIC_ENTITIES + i, 0))
      }
      entityContainer.updateRemovedEntity(EntityUtils.toEntityId(AVATAR_SLOT_NUMBER, 0))
    })

    afterEach(() => {
      delete (globalThis as unknown as { DCL_MAX_COMPOSITE_ENTITY?: number }).DCL_MAX_COMPOSITE_ENTITY
    })

    it('should start the counter past the composite, leaving a standing deficit', () => {
      expect(entityContainer.generateEntity() as number).toBeGreaterThan(MAX_COMPOSITE_ENTITY)
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

  // IEngineOptions.entityContainer is a public injection seam, so Engine.removeEntity must take
  // the reserved bound from the CONTAINER rather than the module default. Using the default
  // breaks in both directions, and neither is detectable by a caller.
  describe('when a custom entity container enforces a different reserved bound', () => {
    let engine: ReturnType<typeof Engine>
    let Owned: ReturnType<ReturnType<typeof Engine>['defineComponent']>

    describe('and the bound is LOWER than the default, so the id IS released', () => {
      let sceneEntity: Entity

      beforeEach(() => {
        engine = Engine({
          onChangeFunction: () => {},
          entityContainer: createEntityContainer({ reservedStaticEntities: 64 })
        })
        Owned = engine.defineComponent('test::owned', { value: Schemas.Int })
        // Number 100 is scene-owned under a bound of 64, but sits inside the default range.
        sceneEntity = EntityUtils.toEntityId(100, 0)
        Owned.create(sceneEntity, { value: 111 })
      })

      it('should release the id, confirming the container considers it scene-owned', () => {
        expect(engine.removeEntity(sceneEntity)).toBe(true)
      })

      it('should purge its components, so a released id cannot keep them', () => {
        engine.removeEntity(sceneEntity)

        expect(Owned.getOrNull(sceneEntity)).toBeNull()
      })

      it('should stop yielding it from getEntitiesWith', () => {
        engine.removeEntity(sceneEntity)

        expect(Array.from(engine.getEntitiesWith(Owned))).toHaveLength(0)
      })

      // Drives an INBOUND message deliberately. `onChangeFunction` is only invoked from the
      // CRDT receive path, so a bare update() with no transport never reaches it — omitting
      // that required Engine option produced an engine that threw here while every other test
      // in this block stayed green.
      it('should produce a usable engine that processes an inbound message', async () => {
        const transport = { name: 'test', send: async () => {}, filter: () => true } as never as Parameters<
          typeof engine.addTransport
        >[0]
        engine.addTransport(transport)
        const buffer = new ReadWriteByteBuffer()
        const payload = new ReadWriteByteBuffer()
        Owned.schema.serialize({ value: 7 }, payload)
        PutComponentOperation.write(EntityUtils.toEntityId(600, 0), 1, Owned.componentId, payload.toBinary(), buffer)
        ;(transport as unknown as { onmessage: (b: Uint8Array) => void }).onmessage(buffer.toBinary())

        await engine.update(1 / 30)

        expect(Owned.getOrNull(EntityUtils.toEntityId(600, 0))).not.toBeNull()
      })
    })

    describe('and the bound is HIGHER than the default, so the id is NOT released', () => {
      let rendererOwned: Entity

      beforeEach(() => {
        engine = Engine({
          onChangeFunction: () => {},
          entityContainer: createEntityContainer({ reservedStaticEntities: 1024 })
        })
        Owned = engine.defineComponent('test::owned', { value: Schemas.Int })
        // Number 700 is renderer-owned under a bound of 1024, but outside the default range.
        rendererOwned = EntityUtils.toEntityId(700, 0)
        Owned.create(rendererOwned, { value: 222 })
      })

      it('should refuse to release the id', () => {
        expect(engine.removeEntity(rendererOwned)).toBe(false)
      })

      it('should NOT purge its components, since the container treats it as renderer-owned', () => {
        engine.removeEntity(rendererOwned)

        expect(Owned.getOrNull(rendererOwned)).not.toBeNull()
      })
    })
  })

  // The renderer applies scene component ops on the three named static entities — that is how
  // InputModifier.deleteFrom(engine.PlayerEntity) clears an input lock — so a removal must
  // still purge them, even though their ids are reserved and never released.
  // engine.getEntityState must delegate to the container rather than alias its method. An
  // aliased reference binds `this` to the engine, so a container that uses `this` reports the
  // wrong state through the public API while the engine — which calls the container directly —
  // reports the right one. removeEntity now classifies via getEntityState, so a divergence
  // there means the public API contradicts the engine's own behaviour.
  describe('when a custom container depends on `this`', () => {
    const CUSTOM_BOUND = 1000

    let engine: ReturnType<typeof Engine>
    let rendererOwned: Entity

    beforeEach(() => {
      class ThisDependentContainer {
        readonly bound = CUSTOM_BOUND
        private readonly used = new Set<number>()
        private counter = CUSTOM_BOUND
        generateEntity(): Entity {
          const entity = EntityUtils.toEntityId(this.counter++, 0)
          this.used.add(entity as number)
          return entity
        }
        removeEntity(entity: Entity): boolean {
          if (EntityUtils.fromEntityId(entity)[0] < this.bound) return false
          this.used.delete(entity as number)
          return true
        }
        getEntityState(entity: Entity): EntityState {
          if (EntityUtils.fromEntityId(entity)[0] < this.bound) return EntityState.Reserved
          return this.used.has(entity as number) ? EntityState.UsedEntity : EntityState.Unknown
        }
        getExistingEntities(): Set<Entity> {
          return new Set([...this.used] as Entity[])
        }
        releaseRemovedEntities(): Entity[] {
          return []
        }
        updateRemovedEntity(): boolean {
          return false
        }
        updateUsedEntity(): boolean {
          return false
        }
      }
      engine = Engine({ onChangeFunction: () => {}, entityContainer: new ThisDependentContainer() })
      rendererOwned = EntityUtils.toEntityId(700, 0)
    })

    it('should report the state the container reports, not undefined-compared garbage', () => {
      expect(engine.getEntityState(rendererOwned)).toBe(EntityState.Reserved)
    })

    it('should agree with what removeEntity actually does', () => {
      expect(engine.removeEntity(rendererOwned)).toBe(false)
    })

    it('should still classify a container-owned entity as releasable', () => {
      expect(engine.removeEntity(engine.addEntity())).toBe(true)
    })
  })

  describe('when a scene removes a named static entity', () => {
    let engine: ReturnType<typeof Engine>
    let InputLock: ReturnType<ReturnType<typeof Engine>['defineComponent']>

    beforeEach(() => {
      engine = Engine()
      InputLock = engine.defineComponent('test::lock', { value: Schemas.Boolean })
      InputLock.create(engine.PlayerEntity, { value: true })
    })

    it('should refuse to release the id', () => {
      expect(engine.removeEntity(engine.PlayerEntity)).toBe(false)
    })

    it('should still purge its components, unlike an avatar entity', () => {
      engine.removeEntity(engine.PlayerEntity)

      expect(InputLock.getOrNull(engine.PlayerEntity)).toBeNull()
    })

    it('should purge the RootEntity too, the lowest named static number', () => {
      InputLock.create(engine.RootEntity, { value: true })

      engine.removeEntity(engine.RootEntity)

      expect(InputLock.getOrNull(engine.RootEntity)).toBeNull()
    })

    // The boundary itself: number 3 is the first NON-named reserved number, so it must behave
    // like an avatar entity, not like the camera. Collapsing NAMED_STATIC_ENTITIES to 0 or
    // widening it to 4 both break exactly here.
    it('should NOT purge the first number above the named statics', () => {
      const firstAvatarNumber = EntityUtils.toEntityId(3, 0)
      InputLock.create(firstAvatarNumber, { value: true })

      engine.removeEntity(firstAvatarNumber)

      expect(InputLock.getOrNull(firstAvatarNumber)).not.toBeNull()
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
