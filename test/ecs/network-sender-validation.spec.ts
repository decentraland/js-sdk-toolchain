import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../packages/@dcl/ecs/src/engine/entity'
import { components, EntityState, IEngine, Transport, TransportSender } from '../../packages/@dcl/ecs/src'
import { componentNumberFromName } from '../../packages/@dcl/ecs/src/components/component-number'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { PutNetworkComponentOperation } from '../../packages/@dcl/ecs/src/serialization/crdt/network/putComponentNetwork'
import { DeleteComponentNetwork } from '../../packages/@dcl/ecs/src/serialization/crdt/network/deleteComponentNetwork'
import { DeleteEntityNetwork } from '../../packages/@dcl/ecs/src/serialization/crdt/network/deleteEntityNetwork'
import { PutComponentOperation } from '../../packages/@dcl/ecs/src/serialization/crdt/putComponent'
import { createNetworkManager, SandBox } from './utils'

type Mapping = { entity: Entity; networkId: number; entityId: number }

function mappings(engine: IEngine): Mapping[] {
  const NetworkEntity = components.NetworkEntity(engine)
  return Array.from(engine.getEntitiesWith(NetworkEntity)).map(([entity, network]) => ({
    entity,
    networkId: network.networkId,
    entityId: network.entityId
  }))
}

describe('when a transport reports which peer a chunk of messages came from', () => {
  let engine: IEngine
  let transport: Transport
  let Transform: ReturnType<typeof components.Transform>
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let buffer: ReadWriteByteBuffer
  let transformData: Uint8Array
  let sender: TransportSender
  let otherPeerNetworkId: number

  beforeEach(() => {
    engine = Engine()
    transport = createNetworkManager()
    engine.addTransport(transport)
    Transform = components.Transform(engine)
    NetworkEntity = components.NetworkEntity(engine)

    const dataBuffer = new ReadWriteByteBuffer()
    Transform.schema.serialize(SandBox.DEFAULT_POSITION, dataBuffer)
    transformData = dataBuffer.toBinary()

    buffer = new ReadWriteByteBuffer()
    sender = {
      address: '0x0000000000000000000000000000000000000001',
      networkId: componentNumberFromName('0x0000000000000000000000000000000000000001')
    }
    otherPeerNetworkId = componentNumberFromName('0x0000000000000000000000000000000000000002')
  })

  describe('and the peer announces a new entity in its own id space', () => {
    beforeEach(async () => {
      PutNetworkComponentOperation.write(
        500 as Entity,
        1,
        Transform.componentId,
        sender.networkId,
        transformData,
        buffer
      )
      transport.onmessage!(buffer.toBinary(), sender)
      await engine.update(1)
    })

    it('should map the announced entity to a local one', () => {
      expect(mappings(engine)).toEqual([expect.objectContaining({ networkId: sender.networkId, entityId: 500 })])
    })

    it('should apply the component to the mapped entity', () => {
      expect(Transform.getOrNull(mappings(engine)[0].entity)).toMatchObject(SandBox.DEFAULT_POSITION)
    })
  })

  describe("and the peer announces a new entity in another peer's id space", () => {
    beforeEach(async () => {
      PutNetworkComponentOperation.write(
        500 as Entity,
        1,
        Transform.componentId,
        otherPeerNetworkId,
        transformData,
        buffer
      )
      transport.onmessage!(buffer.toBinary(), sender)
      await engine.update(1)
    })

    it('should not spend a local entity on it', () => {
      expect(mappings(engine)).toEqual([])
    })
  })

  describe('and a chunk mixes an entity the peer owns with one it does not', () => {
    beforeEach(async () => {
      PutNetworkComponentOperation.write(
        500 as Entity,
        1,
        Transform.componentId,
        otherPeerNetworkId,
        transformData,
        buffer
      )
      PutNetworkComponentOperation.write(
        501 as Entity,
        1,
        Transform.componentId,
        sender.networkId,
        transformData,
        buffer
      )
      transport.onmessage!(buffer.toBinary(), sender)
      await engine.update(1)
    })

    it('should create only the entity the peer owns', () => {
      expect(mappings(engine)).toEqual([expect.objectContaining({ networkId: sender.networkId, entityId: 501 })])
    })
  })

  describe("and a message writes to another peer's entity that already exists", () => {
    let shared: Entity

    beforeEach(async () => {
      shared = engine.addEntity()
      NetworkEntity.create(shared, { networkId: otherPeerNetworkId, entityId: 500 as Entity })
      await engine.update(1)

      PutNetworkComponentOperation.write(
        500 as Entity,
        1,
        Transform.componentId,
        otherPeerNetworkId,
        transformData,
        buffer
      )
      transport.onmessage!(buffer.toBinary(), sender)
      await engine.update(1)
    })

    it('should apply the write, since shared entities are writable by any peer', () => {
      expect(Transform.getOrNull(shared)).toMatchObject(SandBox.DEFAULT_POSITION)
    })
  })

  describe('and a delete-component message names an entity of another peer that does not exist', () => {
    beforeEach(async () => {
      DeleteComponentNetwork.write(500 as Entity, Transform.componentId, 100, otherPeerNetworkId, buffer)
      transport.onmessage!(buffer.toBinary(), sender)
      await engine.update(1)
    })

    it('should not spend an entity on a payload-free message', () => {
      expect(mappings(engine)).toEqual([])
    })
  })

  describe('and a delete-entity message names an entity of another peer that does not exist', () => {
    beforeEach(async () => {
      DeleteEntityNetwork.write(500 as Entity, otherPeerNetworkId, buffer)
      transport.onmessage!(buffer.toBinary(), sender)
      await engine.update(1)
    })

    it('should not spend an entity that is removed the same tick', () => {
      expect(engine.getEntityState(mappings(engine)[0]?.entity ?? (0 as Entity))).not.toEqual(EntityState.Removed)
    })
  })

  describe('and a message uses the shared networkId for an entity registered locally', () => {
    let sharedEntity: Entity

    beforeEach(async () => {
      sharedEntity = engine.addEntity()
      NetworkEntity.create(sharedEntity, { networkId: 0, entityId: 7 as Entity })
      await engine.update(1)

      PutNetworkComponentOperation.write(7 as Entity, 1, Transform.componentId, 0, transformData, buffer)
      transport.onmessage!(buffer.toBinary(), sender)
      await engine.update(1)
    })

    it('should apply the component to the locally registered entity', () => {
      expect(Transform.getOrNull(sharedEntity)).toMatchObject(SandBox.DEFAULT_POSITION)
    })
  })

  describe('and a message uses the shared networkId for an entity nobody registered locally', () => {
    beforeEach(async () => {
      PutNetworkComponentOperation.write(7 as Entity, 1, Transform.componentId, 0, transformData, buffer)
      transport.onmessage!(buffer.toBinary(), sender)
      await engine.update(1)
    })

    it('should not mint an entity in the shared namespace', () => {
      expect(mappings(engine)).toEqual([])
    })
  })

  describe('and the peer floods the chunk with entities it does not own', () => {
    beforeEach(async () => {
      for (let entityId = 1; entityId <= 200; entityId++) {
        PutNetworkComponentOperation.write(
          entityId as Entity,
          1,
          Transform.componentId,
          otherPeerNetworkId,
          transformData,
          buffer
        )
      }
      transport.onmessage!(buffer.toBinary(), sender)
      await engine.update(1)
    })

    it('should not consume a single entity of the local range', () => {
      expect(mappings(engine)).toEqual([])
    })
  })

  describe('and the chunk carries a plain local message', () => {
    beforeEach(async () => {
      PutComponentOperation.write(512 as Entity, 1, Transform.componentId, transformData, buffer)
      transport.onmessage!(buffer.toBinary(), sender)
      await engine.update(1)
    })

    it('should apply it, since local ids carry no ownership claim', () => {
      expect(Transform.getOrNull(512 as Entity)).toMatchObject(SandBox.DEFAULT_POSITION)
    })
  })
})

describe('when a transport cannot report who sent a chunk of messages', () => {
  let engine: IEngine
  let transport: Transport
  let Transform: ReturnType<typeof components.Transform>
  let buffer: ReadWriteByteBuffer

  beforeEach(async () => {
    engine = Engine()
    transport = createNetworkManager()
    engine.addTransport(transport)
    Transform = components.Transform(engine)

    const dataBuffer = new ReadWriteByteBuffer()
    Transform.schema.serialize(SandBox.DEFAULT_POSITION, dataBuffer)

    buffer = new ReadWriteByteBuffer()
    PutNetworkComponentOperation.write(500 as Entity, 1, Transform.componentId, 1234, dataBuffer.toBinary(), buffer)
    transport.onmessage!(buffer.toBinary())
    await engine.update(1)
  })

  it('should accept the network message unchanged', () => {
    expect(mappings(engine)).toEqual([expect.objectContaining({ networkId: 1234, entityId: 500 })])
  })
})
