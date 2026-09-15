import { Engine } from '../../../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../../../packages/@dcl/ecs/src/engine/entity'
import { IEngine, Transport } from '../../../../packages/@dcl/ecs/src'
import * as components from '../../../../packages/@dcl/ecs/src/components'
import { ReadWriteByteBuffer } from '../../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { PutNetworkComponentOperation } from '../../../../packages/@dcl/ecs/src/serialization/crdt/network/putComponentNetwork'
import { createServerValidator } from '../../../../packages/@dcl/sdk/network/server'

const NETWORK_ID = 7
const AUTH_SERVER = 'authoritative-server'
const EXHAUSTED = 'It fails trying to generate an entity out of range 65535.'

describe('when the entity range is drained', () => {
  let engine: IEngine
  let transport: Transport
  let validator: ReturnType<typeof createServerValidator>
  let Transform: ReturnType<typeof components.Transform>
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let errors: string[]

  function chunk(entityId: number, x: number, timestamp = 1): Uint8Array {
    const data = new ReadWriteByteBuffer()
    Transform.schema.serialize(
      {
        position: { x, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
        parent: 0 as Entity
      },
      data
    )
    const buf = new ReadWriteByteBuffer()
    PutNetworkComponentOperation.write(
      entityId as Entity,
      timestamp,
      Transform.componentId,
      NETWORK_ID,
      data.toBinary(),
      buf
    )
    return buf.toBinary()
  }

  function drain() {
    engine.addEntity = () => {
      throw new Error(EXHAUSTED)
    }
  }

  beforeEach(() => {
    engine = Engine()
    transport = { type: 'network', filter: () => false, send: async () => {} }
    engine.addTransport(transport)
    Transform = components.Transform(engine)
    NetworkEntity = components.NetworkEntity(engine)
    components.NetworkParent(engine)
    components.CreatedBy(engine)
    errors = []
    jest.spyOn(console, 'error').mockImplementation((message: unknown) => {
      errors.push(String(message))
    })
    validator = createServerValidator({
      engine,
      binaryMessageBus: { emit: () => {}, on: () => {} } as any
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('and the authoritative server announces an entity to a client', () => {
    beforeEach(() => {
      drain()
    })

    it('should not throw out of the client message handler', () => {
      expect(() => validator.processClientMessages(chunk(900, 1), AUTH_SERVER)).not.toThrow()
    })

    it('should report it once rather than per announcement', () => {
      for (let i = 0; i < 5; i++) validator.processClientMessages(chunk(900 + i, 1), AUTH_SERVER)
      expect(errors.filter((message) => message.includes('Ran out of entities'))).toHaveLength(1)
    })
  })

  describe('and a peer announces an entity to the server', () => {
    beforeEach(() => {
      drain()
    })

    it('should not throw out of the server message handler', () => {
      expect(() => validator.processServerMessages(chunk(901, 1), 'peer')).not.toThrow()
    })
  })

  describe('and an entity mapped before the range drained is updated', () => {
    let mapped: Entity

    beforeEach(async () => {
      const applied = validator.processClientMessages(chunk(902, 1), AUTH_SERVER)
      transport.onmessage!(applied)
      await engine.update(1)
      mapped = Array.from(engine.getEntitiesWith(NetworkEntity))[0][0]
      drain()

      const next = validator.processClientMessages(chunk(902, 42, 2), AUTH_SERVER)
      if (next.byteLength) transport.onmessage!(next)
      await engine.update(1)
    })

    it('should still apply the update, since it needs no new entity', () => {
      expect(Transform.get(mapped).position.x).toBe(42)
    })
  })
})
