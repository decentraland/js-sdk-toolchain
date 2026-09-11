import { Engine } from '../../packages/@dcl/ecs/src/engine'
import {
  GrowOnlyValueSetComponentDefinition,
  LastWriteWinElementSetComponentDefinition
} from '../../packages/@dcl/ecs/src/engine/component'
import { EntityUtils } from '../../packages/@dcl/ecs/src/engine/entity'
import { Schemas } from '../../packages/@dcl/ecs/src/schemas'
import { ByteBuffer, ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import {
  AppendValueOperation,
  AuthoritativePutComponentOperation,
  DeleteComponent,
  DeleteEntity,
  PutComponentOperation
} from '../../packages/@dcl/ecs/src/serialization/crdt'

/**
 * Receive-side guard for reserved-range entities.
 *
 * The renderer owns entity NUMBERS [0, RESERVED_STATIC_ENTITIES): root/player/camera plus
 * the range the avatar-communication system hands to remote players. `engine.removeEntity`
 * is already a no-op on that range, but `receiveMessages` used to apply any inbound message
 * with no range guard — so a crafted CRDT frame from a peer (or any scene-added transport)
 * could erase a live avatar's components (DELETE_ENTITY), overwrite them with a forged high
 * timestamp (PUT_COMPONENT), force-overwrite them bypassing timestamps entirely
 * (AUTHORITATIVE_PUT_COMPONENT), delete them (DELETE_COMPONENT), or append forged values
 * (APPEND_VALUE).
 *
 * Any mutation of a reserved-range entity must be honored ONLY from the trusted
 * host/renderer transport (Transport.allowReservedEntities), and rejected from any other
 * transport.
 */
describe('Receive-side guard for reserved (avatar) entities', () => {
  const AVATAR_SLOT_NUMBER = 32
  // Version 0 packs to the bare number; getEntityState reports it Reserved (number < bound).
  const AVATAR_SLOT = EntityUtils.toEntityId(AVATAR_SLOT_NUMBER, 0)
  // Any timestamp that beats the local LWW state, proving the guard (not conflict
  // resolution) is what rejects untrusted writes.
  const WINNING_TIMESTAMP = 100

  const addressSchema = Schemas.Map({ address: Schemas.String })
  const emoteSchema = Schemas.Map({ timestamp: Schemas.Int, emote: Schemas.String })

  let engine: ReturnType<typeof Engine>
  // Stands in for the renderer-owned, one-shot PlayerIdentityData on a live avatar: the
  // renderer sends it once per peer, so a local overwrite or purge is never repaired.
  let RendererOwned: LastWriteWinElementSetComponentDefinition<{ address: string }>
  // Stands in for a renderer-owned grow-only set (e.g. AvatarEmoteCommand).
  let EmoteStream: GrowOnlyValueSetComponentDefinition<{ timestamp: number; emote: string }>

  // Add a transport and feed it one CRDT frame written by `write`. `trusted` mirrors the
  // renderer transport's allowReservedEntities flag; an untrusted transport stands in for a
  // comms peer or an exploit injector.
  function inject(trusted: boolean, write: (frame: ByteBuffer) => void): void {
    const transport = {
      type: trusted ? 'renderer' : 'network',
      allowReservedEntities: trusted,
      send: async () => {},
      filter: () => true
    } as never as Parameters<typeof engine.addTransport>[0]
    engine.addTransport(transport)
    const frame = new ReadWriteByteBuffer()
    write(frame)
    ;(transport as unknown as { onmessage: (b: Uint8Array) => void }).onmessage(frame.toBinary())
  }

  function serializeAddress(address: string): Uint8Array {
    const buf = new ReadWriteByteBuffer()
    addressSchema.serialize({ address }, buf)
    return buf.toBinary()
  }

  function serializeEmote(timestamp: number, emote: string): Uint8Array {
    const buf = new ReadWriteByteBuffer()
    emoteSchema.serialize({ timestamp, emote }, buf)
    return buf.toBinary()
  }

  beforeEach(async () => {
    engine = Engine({ onChangeFunction: () => {} })
    RendererOwned = engine.defineComponentFromSchema('test::renderer-owned', addressSchema)
    EmoteStream = engine.defineValueSetComponentFromSchema('test::emote-stream', emoteSchema, {
      timestampFunction: (value) => value.timestamp,
      maxElements: 10
    })
    RendererOwned.create(AVATAR_SLOT, { address: '0xabc' })
    // Settle the local create so every injection below runs against clean CRDT state.
    await engine.update(1 / 30)
  })

  describe('inbound DELETE_ENTITY on a reserved entity', () => {
    describe('when it arrives from an untrusted transport (a comms peer / injected frame)', () => {
      it('should ignore the delete and keep the avatar component', async () => {
        inject(false, (frame) => DeleteEntity.write(AVATAR_SLOT, frame))

        await engine.update(1 / 30)

        expect(RendererOwned.getOrNull(AVATAR_SLOT)).not.toBeNull()
      })

      it('should keep the avatar resolvable by a getEntitiesWith query', async () => {
        inject(false, (frame) => DeleteEntity.write(AVATAR_SLOT, frame))

        await engine.update(1 / 30)

        expect(Array.from(engine.getEntitiesWith(RendererOwned))).toHaveLength(1)
      })
    })

    describe('when it arrives from the trusted host/renderer transport', () => {
      it('should apply the delete and purge the component, so genuine disconnects still work', async () => {
        inject(true, (frame) => DeleteEntity.write(AVATAR_SLOT, frame))

        await engine.update(1 / 30)

        expect(RendererOwned.getOrNull(AVATAR_SLOT)).toBeNull()
      })
    })

    // The guard must not over-reach: a delete for an entity the scene genuinely owns
    // (outside the reserved range) still applies, whatever transport it came from.
    describe('when it targets a scene-owned entity from an untrusted transport', () => {
      it('should apply the delete normally', async () => {
        const sceneEntity = engine.addEntity()
        RendererOwned.create(sceneEntity, { address: '0xdef' })

        inject(false, (frame) => DeleteEntity.write(sceneEntity, frame))

        await engine.update(1 / 30)

        expect(RendererOwned.getOrNull(sceneEntity)).toBeNull()
      })
    })
  })

  describe('inbound component operations on a reserved entity', () => {
    describe('when they arrive from an untrusted transport (a comms peer / injected frame)', () => {
      it('should ignore a PUT_COMPONENT even when its timestamp would win the LWW conflict', async () => {
        inject(false, (frame) =>
          PutComponentOperation.write(
            AVATAR_SLOT,
            WINNING_TIMESTAMP,
            RendererOwned.componentId,
            serializeAddress('0xhijacked'),
            frame
          )
        )

        await engine.update(1 / 30)

        expect(RendererOwned.get(AVATAR_SLOT).address).toBe('0xabc')
      })

      it('should ignore an AUTHORITATIVE_PUT_COMPONENT, which would otherwise bypass timestamps entirely', async () => {
        inject(false, (frame) =>
          AuthoritativePutComponentOperation.write(
            AVATAR_SLOT,
            WINNING_TIMESTAMP,
            RendererOwned.componentId,
            serializeAddress('0xhijacked'),
            frame
          )
        )

        await engine.update(1 / 30)

        expect(RendererOwned.get(AVATAR_SLOT).address).toBe('0xabc')
      })

      it('should ignore a DELETE_COMPONENT and keep the avatar component', async () => {
        inject(false, (frame) =>
          DeleteComponent.write(AVATAR_SLOT, RendererOwned.componentId, WINNING_TIMESTAMP, frame)
        )

        await engine.update(1 / 30)

        expect(RendererOwned.getOrNull(AVATAR_SLOT)).not.toBeNull()
      })

      it('should ignore an APPEND_VALUE and keep the grow-only set empty', async () => {
        inject(false, (frame) =>
          AppendValueOperation.write(AVATAR_SLOT, 0, EmoteStream.componentId, serializeEmote(1, 'wave'), frame)
        )

        await engine.update(1 / 30)

        expect(EmoteStream.get(AVATAR_SLOT).size).toBe(0)
      })

      it('should not poison local LWW timestamps: a later renderer write with a lower timestamp still applies', async () => {
        inject(false, (frame) =>
          PutComponentOperation.write(
            AVATAR_SLOT,
            WINNING_TIMESTAMP,
            RendererOwned.componentId,
            serializeAddress('0xhijacked'),
            frame
          )
        )
        await engine.update(1 / 30)

        // The renderer keeps counting from the real state (local timestamp is 1); if the
        // forged timestamp had reached the CRDT layer this write would lose and be
        // rejected forever.
        inject(true, (frame) =>
          PutComponentOperation.write(AVATAR_SLOT, 2, RendererOwned.componentId, serializeAddress('0xfed'), frame)
        )
        await engine.update(1 / 30)

        expect(RendererOwned.get(AVATAR_SLOT).address).toBe('0xfed')
      })
    })

    describe('when they arrive from the trusted host/renderer transport', () => {
      it('should apply a PUT_COMPONENT, so avatar streaming still works', async () => {
        inject(true, (frame) =>
          PutComponentOperation.write(
            AVATAR_SLOT,
            WINNING_TIMESTAMP,
            RendererOwned.componentId,
            serializeAddress('0xfed'),
            frame
          )
        )

        await engine.update(1 / 30)

        expect(RendererOwned.get(AVATAR_SLOT).address).toBe('0xfed')
      })

      it('should apply an AUTHORITATIVE_PUT_COMPONENT', async () => {
        inject(true, (frame) =>
          AuthoritativePutComponentOperation.write(
            AVATAR_SLOT,
            WINNING_TIMESTAMP,
            RendererOwned.componentId,
            serializeAddress('0xfed'),
            frame
          )
        )

        await engine.update(1 / 30)

        expect(RendererOwned.get(AVATAR_SLOT).address).toBe('0xfed')
      })

      it('should apply a DELETE_COMPONENT, so genuine cleanup still works', async () => {
        inject(true, (frame) => DeleteComponent.write(AVATAR_SLOT, RendererOwned.componentId, WINNING_TIMESTAMP, frame))

        await engine.update(1 / 30)

        expect(RendererOwned.getOrNull(AVATAR_SLOT)).toBeNull()
      })

      it('should apply an APPEND_VALUE, so grow-only streams (e.g. emotes) still work', async () => {
        inject(true, (frame) =>
          AppendValueOperation.write(AVATAR_SLOT, 0, EmoteStream.componentId, serializeEmote(1, 'wave'), frame)
        )

        await engine.update(1 / 30)

        expect(EmoteStream.get(AVATAR_SLOT).size).toBe(1)
      })
    })

    // The guard must not over-reach: component ops on an entity the scene genuinely owns
    // (outside the reserved range) still apply, whatever transport they came from.
    describe('when they target a scene-owned entity from an untrusted transport', () => {
      it('should apply a PUT_COMPONENT normally', async () => {
        const sceneEntity = engine.addEntity()
        RendererOwned.create(sceneEntity, { address: '0xdef' })
        await engine.update(1 / 30)

        inject(false, (frame) =>
          PutComponentOperation.write(
            sceneEntity,
            WINNING_TIMESTAMP,
            RendererOwned.componentId,
            serializeAddress('0xfed'),
            frame
          )
        )
        await engine.update(1 / 30)

        expect(RendererOwned.get(sceneEntity).address).toBe('0xfed')
      })
    })
  })
})
