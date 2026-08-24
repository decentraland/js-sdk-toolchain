import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { Entity, EntityUtils } from '../../packages/@dcl/ecs/src/engine/entity'
import { Schemas } from '../../packages/@dcl/ecs/src/schemas'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { DeleteEntity } from '../../packages/@dcl/ecs/src/serialization/crdt/deleteEntity'

/**
 * Receive-side guard for reserved-range entities.
 *
 * The renderer owns entity NUMBERS [0, RESERVED_STATIC_ENTITIES): root/player/camera plus
 * the range the avatar-communication system hands to remote players. `engine.removeEntity`
 * is already a no-op on that range, but `receiveMessages` purges components directly via
 * `definition.entityDeleted` when it processes an inbound DELETE_ENTITY, with no range
 * guard — so a crafted CRDT frame from a peer (or any scene-added transport) could erase a
 * live avatar's components.
 *
 * A reserved-range DELETE_ENTITY must be honored ONLY from the trusted host/renderer
 * transport (Transport.allowReservedEntities), and rejected from any other transport.
 */
describe('Inbound DELETE_ENTITY on a reserved (avatar) entity', () => {
  const AVATAR_SLOT_NUMBER = 32
  // Version 0 packs to the bare number; getEntityState reports it Reserved (number < bound).
  const AVATAR_SLOT = EntityUtils.toEntityId(AVATAR_SLOT_NUMBER, 0)

  let engine: ReturnType<typeof Engine>
  // Stands in for the renderer-owned, one-shot PlayerIdentityData on a live avatar: the
  // renderer sends it once per peer, so a local purge is never repaired.
  let RendererOwned: ReturnType<ReturnType<typeof Engine>['defineComponent']>

  // Add a transport and feed it one DELETE_ENTITY frame for `entity`. `trusted` mirrors the
  // renderer transport's allowReservedEntities flag; an untrusted transport stands in for a
  // comms peer or an exploit injector.
  function injectDelete(entity: Entity, trusted: boolean): void {
    const transport = {
      type: trusted ? 'renderer' : 'network',
      allowReservedEntities: trusted,
      send: async () => {},
      filter: () => true
    } as never as Parameters<typeof engine.addTransport>[0]
    engine.addTransport(transport)
    const buffer = new ReadWriteByteBuffer()
    DeleteEntity.write(entity, buffer)
    ;(transport as unknown as { onmessage: (b: Uint8Array) => void }).onmessage(buffer.toBinary())
  }

  beforeEach(() => {
    engine = Engine({ onChangeFunction: () => {} })
    RendererOwned = engine.defineComponent('test::renderer-owned', { address: Schemas.String })
    RendererOwned.create(AVATAR_SLOT, { address: '0xabc' })
  })

  describe('when it arrives from an untrusted transport (a comms peer / injected frame)', () => {
    it('should ignore the delete and keep the avatar component', async () => {
      injectDelete(AVATAR_SLOT, false)

      await engine.update(1 / 30)

      expect(RendererOwned.getOrNull(AVATAR_SLOT)).not.toBeNull()
    })

    it('should keep the avatar resolvable by a getEntitiesWith query', async () => {
      injectDelete(AVATAR_SLOT, false)

      await engine.update(1 / 30)

      expect(Array.from(engine.getEntitiesWith(RendererOwned))).toHaveLength(1)
    })
  })

  describe('when it arrives from the trusted host/renderer transport', () => {
    it('should apply the delete and purge the component, so genuine disconnects still work', async () => {
      injectDelete(AVATAR_SLOT, true)

      await engine.update(1 / 30)

      expect(RendererOwned.getOrNull(AVATAR_SLOT)).toBeNull()
    })
  })

  // The guard must not over-reach: a delete for an entity the scene genuinely owns (outside
  // the reserved range) still applies, whatever transport it came from.
  describe('when it targets a scene-owned entity from an untrusted transport', () => {
    it('should apply the delete normally', async () => {
      const sceneEntity = engine.addEntity()
      RendererOwned.create(sceneEntity, { address: '0xdef' })

      injectDelete(sceneEntity, false)

      await engine.update(1 / 30)

      expect(RendererOwned.getOrNull(sceneEntity)).toBeNull()
    })
  })
})
