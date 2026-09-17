import { Engine } from '../../../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../../../packages/@dcl/ecs/src/engine/entity'
import { IEngine, Transport } from '../../../../packages/@dcl/ecs/src'
import * as components from '../../../../packages/@dcl/ecs/src/components'
import { ReadWriteByteBuffer } from '../../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { PutNetworkComponentOperation } from '../../../../packages/@dcl/ecs/src/serialization/crdt/network/putComponentNetwork'
import { createServerValidator } from '../../../../packages/@dcl/sdk/network/server'
import { CommsMessage } from '../../../../packages/@dcl/sdk/network/binary-message-bus'

const NETWORK_ID = 7
const PEER = 'peer'

describe('when the server receives a component update from a peer', () => {
  let engine: IEngine
  let transport: Transport
  let validator: ReturnType<typeof createServerValidator>
  let Transform: ReturnType<typeof components.Transform>
  let GltfContainer: ReturnType<typeof components.GltfContainer>
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let emitted: { type: number; to?: string[] }[]

  function chunk(entityId: number, componentId: number, data: Uint8Array): Uint8Array {
    const buf = new ReadWriteByteBuffer()
    PutNetworkComponentOperation.write(entityId as Entity, 1, componentId, NETWORK_ID, data, buf)
    return buf.toBinary()
  }

  function validTransformBytes(): Uint8Array {
    const data = new ReadWriteByteBuffer()
    Transform.schema.serialize(
      {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
        parent: 0 as Entity
      },
      data
    )
    return data.toBinary()
  }

  /** What the sync transport does with the validator's output. */
  async function feed(bytes: Uint8Array) {
    const applied = validator.processServerMessages(bytes, PEER)
    if (applied.byteLength) transport.onmessage!(applied)
    await engine.update(1)
  }

  beforeEach(() => {
    engine = Engine()
    transport = { type: 'network', filter: () => false, send: async () => {} }
    engine.addTransport(transport)
    Transform = components.Transform(engine)
    GltfContainer = components.GltfContainer(engine)
    NetworkEntity = components.NetworkEntity(engine)
    components.NetworkParent(engine)
    components.CreatedBy(engine)
    emitted = []
    validator = createServerValidator({
      engine,
      binaryMessageBus: {
        emit: (type: number, _data: Uint8Array, to?: string[]) => emitted.push({ type, to }),
        on: () => {}
      } as any
    })
  })

  describe('and the payload is shorter than the schema needs', () => {
    // Not Transform: converting one runs fixTransformParent, which deserializes and
    // throws before validation is reached, so a Transform exercises the null-conversion
    // guard rather than the payload guard.
    function validGltfBytes(): Uint8Array {
      const data = new ReadWriteByteBuffer()
      GltfContainer.schema.serialize(
        { src: 'models/thing.glb', visibleMeshesCollisionMask: 0, invisibleMeshesCollisionMask: 0 },
        data
      )
      return data.toBinary()
    }

    beforeEach(async () => {
      // The server takes a good update first, so it holds state it can answer with.
      await feed(chunk(900, GltfContainer.componentId, validGltfBytes()))
      emitted = []
      await feed(chunk(900, GltfContainer.componentId, validGltfBytes().subarray(0, 4)))
    })

    it('should not relay it to the other peers', () => {
      expect(emitted.filter((message) => message.type === CommsMessage.CRDT)).toEqual([])
    })

    it('should answer the sender with the authoritative state rather than dropping it in silence', () => {
      const corrections = emitted.filter(
        (message) => message.type === CommsMessage.CRDT_AUTHORITATIVE && message.to?.includes(PEER)
      )
      expect(corrections.length).toBeGreaterThan(0)
    })
  })

  describe('and the component id is one this engine never defined', () => {
    beforeEach(async () => {
      await feed(chunk(901, 999999, validTransformBytes()))
    })

    it('should not relay it to the other peers', () => {
      expect(emitted.filter((message) => message.type === CommsMessage.CRDT)).toEqual([])
    })
  })

  describe('and many refused updates each name an entity the server has never seen', () => {
    beforeEach(async () => {
      for (let i = 0; i < 25; i++) {
        await feed(chunk(1000 + i, GltfContainer.componentId, new Uint8Array([1, 2, 3])))
      }
      for (let i = 0; i < 25; i++) {
        await feed(chunk(2000 + i, 999999, new Uint8Array([1, 2, 3])))
      }
    })

    it('should spend no entities on them', () => {
      expect(Array.from(engine.getEntitiesWith(NetworkEntity))).toEqual([])
    })
  })

  describe('and the update is well formed', () => {
    beforeEach(async () => {
      await feed(chunk(902, Transform.componentId, validTransformBytes()))
    })

    it('should relay it to the other peers', () => {
      expect(emitted.filter((message) => message.type === CommsMessage.CRDT).length).toBeGreaterThan(0)
    })
  })
})
