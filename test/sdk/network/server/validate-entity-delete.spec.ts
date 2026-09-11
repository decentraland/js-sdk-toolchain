import { Engine } from '../../../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../../../packages/@dcl/ecs/src/engine/entity'
import { IEngine, Transport } from '../../../../packages/@dcl/ecs/src'
import * as components from '../../../../packages/@dcl/ecs/src/components'
import { ReadWriteByteBuffer } from '../../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { PutNetworkComponentOperation } from '../../../../packages/@dcl/ecs/src/serialization/crdt/network/putComponentNetwork'
import { DeleteComponentNetwork } from '../../../../packages/@dcl/ecs/src/serialization/crdt/network/deleteComponentNetwork'
import { DeleteEntityNetwork } from '../../../../packages/@dcl/ecs/src/serialization/crdt/network/deleteEntityNetwork'
import { createServerValidator } from '../../../../packages/@dcl/sdk/network/server'
import { CommsMessage } from '../../../../packages/@dcl/sdk/network/binary-message-bus'

const NETWORK_ID = 7
const OWNER = 'owner-peer'
const OTHER = 'other-peer'
const REMOTE_ENTITY = 900

describe('when a peer asks the server to delete a synced entity', () => {
  let engine: IEngine
  let transport: Transport
  let validator: ReturnType<typeof createServerValidator>
  let Transform: ReturnType<typeof components.Transform>
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let relayed: number[]
  let localEntity: Entity

  function announce(): Uint8Array {
    const data = new ReadWriteByteBuffer()
    Transform.schema.serialize(
      {
        position: { x: 1, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
        parent: 0 as Entity
      },
      data
    )
    const buf = new ReadWriteByteBuffer()
    PutNetworkComponentOperation.write(
      REMOTE_ENTITY as Entity,
      1,
      Transform.componentId,
      NETWORK_ID,
      data.toBinary(),
      buf
    )
    return buf.toBinary()
  }

  function deletion(): Uint8Array {
    const buf = new ReadWriteByteBuffer()
    DeleteEntityNetwork.write(REMOTE_ENTITY as Entity, NETWORK_ID, buf)
    return buf.toBinary()
  }

  async function feed(bytes: Uint8Array, sender: string) {
    const applied = validator.processServerMessages(bytes, sender)
    if (applied.byteLength) transport.onmessage!(applied)
    await engine.update(1)
  }

  beforeEach(async () => {
    engine = Engine()
    transport = { type: 'network', filter: () => false, send: async () => {} }
    engine.addTransport(transport)
    Transform = components.Transform(engine)
    NetworkEntity = components.NetworkEntity(engine)
    components.NetworkParent(engine)
    components.CreatedBy(engine)
    relayed = []
    validator = createServerValidator({
      engine,
      binaryMessageBus: { emit: (type: number) => relayed.push(type), on: () => {} } as any
    })

    await feed(announce(), OWNER)
    localEntity = Array.from(engine.getEntitiesWith(NetworkEntity))[0][0]
    relayed = []
  })

  describe('and the scene registered no validator', () => {
    beforeEach(async () => {
      await feed(deletion(), OTHER)
    })

    it('should allow it, leaving current behaviour untouched', () => {
      expect(relayed.filter((type) => type === CommsMessage.CRDT).length).toBeGreaterThan(0)
    })
  })

  describe('and the scene refuses deletes from anyone but the creator', () => {
    beforeEach(() => {
      Transform.validateBeforeChange(
        ({ newValue, senderAddress, createdBy }) => newValue !== undefined || senderAddress === createdBy
      )
    })

    describe('and a peer that did not create it asks', () => {
      beforeEach(async () => {
        await feed(deletion(), OTHER)
      })

      it('should refuse it', () => {
        expect(relayed.filter((type) => type === CommsMessage.CRDT)).toEqual([])
      })

      it('should keep the entity alive on the server', () => {
        expect(Transform.getOrNull(localEntity)).not.toBe(null)
      })
    })

    describe('and another peer removes the protected component before deleting the entity', () => {
      let removal: ReadWriteByteBuffer

      beforeEach(async () => {
        removal = new ReadWriteByteBuffer()
        DeleteComponentNetwork.write(REMOTE_ENTITY as Entity, Transform.componentId, 100, NETWORK_ID, removal)
        await feed(removal.toBinary(), OTHER)
        relayed = []
        await feed(deletion(), OTHER)
      })

      it('should refuse the non-owner entity deletion', () => {
        expect(relayed.filter((type) => type === CommsMessage.CRDT)).toEqual([])
      })

      it('should retain the protected component', () => {
        expect(Transform.has(localEntity)).toBe(true)
      })
    })

    describe('and the peer that created it asks', () => {
      beforeEach(async () => {
        await feed(deletion(), OWNER)
      })

      it('should allow it', () => {
        expect(relayed.filter((type) => type === CommsMessage.CRDT).length).toBeGreaterThan(0)
      })
    })
  })

  describe('and the scene allows anyone to take it while it is unheld', () => {
    beforeEach(async () => {
      Transform.validateBeforeChange(
        ({ newValue, currentValue }) => newValue !== undefined || currentValue?.position.x === 1
      )
      await feed(deletion(), OTHER)
    })

    it('should allow a peer that did not create it', () => {
      expect(relayed.filter((type) => type === CommsMessage.CRDT).length).toBeGreaterThan(0)
    })
  })
})
