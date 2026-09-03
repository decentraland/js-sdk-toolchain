import { components, Schemas } from '../../packages/@dcl/ecs/src'
import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../packages/@dcl/ecs/src/engine/entity'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { AppendValueOperation } from '../../packages/@dcl/ecs/src/serialization/crdt/appendValue'
import { PutComponentOperation } from '../../packages/@dcl/ecs/src/serialization/crdt/putComponent'
import { PutNetworkComponentOperation } from '../../packages/@dcl/ecs/src/serialization/crdt/network/putComponentNetwork'
import { Transport } from '../../packages/@dcl/ecs/src/systems/crdt/types'

/**
 * A well-framed PUT_COMPONENT whose data buffer is shorter than the component's
 * schema needs. The frame is valid — the header, the fields and the announced
 * data length all agree — so the message is read; only the deserialize that
 * follows runs past the end of the buffer.
 */
function craftShortPut(entity: Entity, componentId: number, timestamp: number, dataBytes: number): Uint8Array {
  const buffer = new ReadWriteByteBuffer()
  PutComponentOperation.write(entity, timestamp, componentId, new Uint8Array(dataBytes), buffer)
  return buffer.toBinary()
}

function craftShortAppend(entity: Entity, componentId: number, timestamp: number, dataBytes: number): Uint8Array {
  const buffer = new ReadWriteByteBuffer()
  AppendValueOperation.write(entity, timestamp, componentId, new Uint8Array(dataBytes), buffer)
  return buffer.toBinary()
}

function craftShortNetworkPut(
  entity: Entity,
  componentId: number,
  networkId: number,
  timestamp: number,
  dataBytes: number
): Uint8Array {
  const buffer = new ReadWriteByteBuffer()
  PutNetworkComponentOperation.write(entity, timestamp, componentId, networkId, new Uint8Array(dataBytes), buffer)
  return buffer.toBinary()
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const chunk = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0))
  let offset = 0
  for (const part of parts) {
    chunk.set(part, offset)
    offset += part.byteLength
  }
  return chunk
}

describe('when a peer sends a last-write-wins component update whose payload is too short for the schema', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let transport: Transport
  let entity: Entity

  beforeEach(() => {
    engine = Engine()
    Transform = components.Transform(engine)
    transport = { send: async () => {}, filter: () => false }
    engine.addTransport(transport)
    entity = 512 as Entity
    transport.onmessage!(craftShortPut(entity, Transform.componentId, 1, 4))
  })

  it('should let the engine finish the update instead of throwing out of the tick', async () => {
    await expect(engine.update(1)).resolves.toBeUndefined()
  })

  it('should leave the component with no value for that entity', async () => {
    await engine.update(1)

    expect(Transform.getOrNull(entity)).toBe(null)
  })
})

describe('when a malformed last-write-wins update is followed in the same batch by a well-formed one', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let transport: Transport
  let malformedEntity: Entity
  let healthyEntity: Entity
  let healthyPosition: { x: number; y: number; z: number }

  beforeEach(() => {
    engine = Engine()
    Transform = components.Transform(engine)
    transport = { send: async () => {}, filter: () => false }
    engine.addTransport(transport)
    malformedEntity = 512 as Entity
    healthyEntity = 513 as Entity
    healthyPosition = { x: 4, y: 5, z: 6 }

    const healthy = new ReadWriteByteBuffer()
    const healthyData = new ReadWriteByteBuffer()
    Transform.schema.serialize(
      {
        position: healthyPosition,
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
        parent: 0 as Entity
      },
      healthyData
    )
    PutComponentOperation.write(healthyEntity, 1, Transform.componentId, healthyData.toBinary(), healthy)

    transport.onmessage!(concat(craftShortPut(malformedEntity, Transform.componentId, 1, 4), healthy.toBinary()))
  })

  it('should still apply the well-formed update that follows the malformed one', async () => {
    await engine.update(1)

    expect(Transform.getOrNull(healthyEntity)?.position).toEqual(healthyPosition)
  })

  it('should leave no value for the entity of the malformed update', async () => {
    await engine.update(1)

    expect(Transform.getOrNull(malformedEntity)).toBe(null)
  })
})

describe('when a well-formed update arrives after a dropped malformed one for the same entity', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let transport: Transport
  let entity: Entity
  let laterPosition: { x: number; y: number; z: number }

  beforeEach(() => {
    engine = Engine()
    Transform = components.Transform(engine)
    transport = { send: async () => {}, filter: () => false }
    engine.addTransport(transport)
    entity = 512 as Entity
    laterPosition = { x: 7, y: 8, z: 9 }

    // The malformed update is dropped without advancing the entity's timestamp,
    // so a well-formed update at the same lamport number is still a first write.
    transport.onmessage!(craftShortPut(entity, Transform.componentId, 1, 4))

    const healthy = new ReadWriteByteBuffer()
    const healthyData = new ReadWriteByteBuffer()
    Transform.schema.serialize(
      {
        position: laterPosition,
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
        parent: 0 as Entity
      },
      healthyData
    )
    PutComponentOperation.write(entity, 1, Transform.componentId, healthyData.toBinary(), healthy)
    transport.onmessage!(healthy.toBinary())
  })

  it('should apply the well-formed update', async () => {
    await engine.update(1)

    expect(Transform.getOrNull(entity)?.position).toEqual(laterPosition)
  })
})

describe('when a malformed last-write-wins update is delivered on one transport', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let source: Transport
  let sink: Transport
  let sinkReceived: number

  beforeEach(() => {
    engine = Engine()
    Transform = components.Transform(engine)
    sinkReceived = 0
    source = { send: async () => {}, filter: () => true, type: 'network' }
    sink = {
      send: async (messages) => {
        for (const message of [messages].flat()) {
          sinkReceived += message.byteLength
        }
      },
      filter: () => true,
      type: 'network'
    }
    engine.addTransport(source)
    engine.addTransport(sink)
    source.onmessage!(craftShortPut(512 as Entity, Transform.componentId, 1, 4))
  })

  it('should not relay the dropped message to the other transport', async () => {
    await engine.update(1)

    expect(sinkReceived).toBe(0)
  })
})

describe('when a peer appends a grow-only value whose payload is too short for the schema', () => {
  const schema = Schemas.Map({ timestamp: Schemas.Int, text: Schemas.String })
  let engine: ReturnType<typeof Engine>
  let GrowOnly: ReturnType<ReturnType<typeof Engine>['defineValueSetComponentFromSchema']>
  let transport: Transport
  let entity: Entity

  beforeEach(() => {
    engine = Engine()
    GrowOnly = engine.defineValueSetComponentFromSchema('test-grow-only', schema, {
      timestampFunction: (value) => value.timestamp,
      maxElements: 10
    })
    transport = { send: async () => {}, filter: () => false }
    engine.addTransport(transport)
    entity = 512 as Entity
    transport.onmessage!(craftShortAppend(entity, GrowOnly.componentId, 1, 2))
  })

  it('should let the engine finish the update instead of throwing out of the tick', async () => {
    await expect(engine.update(1)).resolves.toBeUndefined()
  })

  it('should not add any value to the set for that entity', async () => {
    await engine.update(1)

    expect(Array.from(GrowOnly.get(entity))).toEqual([])
  })
})

describe('when a peer sends a malformed network component update for an unseen network entity', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let source: Transport
  let sink: Transport
  let sinkReceived: number

  beforeEach(() => {
    engine = Engine()
    Transform = components.Transform(engine)
    NetworkEntity = components.NetworkEntity(engine)
    sinkReceived = 0
    source = { send: async () => {}, filter: () => true, type: 'network' }
    sink = {
      send: async (messages) => {
        for (const message of [messages].flat()) {
          sinkReceived += message.byteLength
        }
      },
      filter: () => true,
      type: 'network'
    }
    engine.addTransport(source)
    engine.addTransport(sink)
    source.onmessage!(craftShortNetworkPut(7 as Entity, Transform.componentId, 123, 1, 4))
  })

  it('should let the engine finish the update instead of throwing out of the tick', async () => {
    await expect(engine.update(1)).resolves.toBeUndefined()
  })

  it('should not allocate a network entity mapping for it', async () => {
    await engine.update(1)

    expect(Array.from(engine.getEntitiesWith(NetworkEntity))).toEqual([])
  })

  it('should not relay the dropped message to the other transport', async () => {
    await engine.update(1)

    expect(sinkReceived).toBe(0)
  })
})

describe('when a peer sends more than one malformed network component update', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let transport: Transport

  beforeEach(() => {
    engine = Engine()
    Transform = components.Transform(engine)
    NetworkEntity = components.NetworkEntity(engine)
    transport = { send: async () => {}, filter: () => false }
    engine.addTransport(transport)
    transport.onmessage!(craftShortNetworkPut(7 as Entity, Transform.componentId, 123, 1, 4))
    transport.onmessage!(craftShortNetworkPut(8 as Entity, Transform.componentId, 124, 1, 4))
  })

  it('should not accumulate ghost network entities', async () => {
    await engine.update(1)

    expect(Array.from(engine.getEntitiesWith(NetworkEntity))).toEqual([])
  })
})

describe('when a peer sends a well-formed network component update for an unseen network entity', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let transport: Transport
  let networkId: number
  let remoteEntity: Entity
  let position: { x: number; y: number; z: number }

  beforeEach(() => {
    engine = Engine()
    Transform = components.Transform(engine)
    NetworkEntity = components.NetworkEntity(engine)
    transport = { send: async () => {}, filter: () => false }
    engine.addTransport(transport)
    networkId = 123
    remoteEntity = 7 as Entity
    position = { x: 4, y: 5, z: 6 }

    const data = new ReadWriteByteBuffer()
    Transform.schema.serialize(
      { position, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 }, parent: 0 as Entity },
      data
    )
    const buffer = new ReadWriteByteBuffer()
    PutNetworkComponentOperation.write(remoteEntity, 1, Transform.componentId, networkId, data.toBinary(), buffer)
    transport.onmessage!(buffer.toBinary())
  })

  it('should allocate exactly one network entity mapping for it', async () => {
    await engine.update(1)

    expect(Array.from(engine.getEntitiesWith(NetworkEntity)).map(([, value]) => value)).toEqual([
      { entityId: remoteEntity, networkId }
    ])
  })

  it('should apply the component to the mapped local entity', async () => {
    await engine.update(1)

    const [localEntity] = Array.from(engine.getEntitiesWith(NetworkEntity))[0]
    expect(Transform.getOrNull(localEntity)?.position).toEqual(position)
  })
})
