import * as components from '../../packages/@dcl/ecs/src/components'
import { Engine, Entity } from '../../packages/@dcl/ecs/src/engine'
import { createEntityContainer } from '../../packages/@dcl/ecs/src/engine/entity'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { PutNetworkComponentOperation } from '../../packages/@dcl/ecs/src/serialization/crdt/network/putComponentNetwork'
import { Transport } from '../../packages/@dcl/ecs/src/systems/crdt/types'

/** Entity numbers below this are reserved, so the container has very few left to hand out. */
const ALMOST_EXHAUSTED = 65530

describe('when a peer announces more network entities than the engine can allocate', () => {
  let engine: ReturnType<typeof Engine>
  let Transform: ReturnType<typeof components.Transform>
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let transport: Transport
  let errors: jest.SpyInstance

  beforeEach(() => {
    // A container that is nearly out of range, so exhaustion is reached in a few messages
    // instead of the ~65k a real peer would have to send.
    engine = Engine({
      onChangeFunction: () => undefined,
      entityContainer: createEntityContainer({ reservedStaticEntities: ALMOST_EXHAUSTED })
    })
    Transform = components.Transform(engine)
    NetworkEntity = components.NetworkEntity(engine)
    transport = { send: async () => {}, filter: () => false }
    engine.addTransport(transport)
    errors = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    const payload = new ReadWriteByteBuffer()
    Transform.schema.serialize(
      {
        position: { x: 1, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
        parent: 0 as Entity
      },
      payload
    )
    const data = payload.toBinary()

    // Far more distinct (networkId, entityId) pairs than there are entities left.
    const chunk = new ReadWriteByteBuffer()
    for (let index = 0; index < 40; index++) {
      PutNetworkComponentOperation.write(index as Entity, 1, Transform.componentId, index + 1, data, chunk)
    }
    transport.onmessage!(chunk.toBinary())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should finish the update instead of rejecting out of the tick', async () => {
    await expect(engine.update(1)).resolves.toBeUndefined()
  })

  it('should map as many as it had room for and no more', async () => {
    await engine.update(1)

    const mapped = Array.from(engine.getEntitiesWith(NetworkEntity)).length
    expect(mapped).toBeGreaterThan(0)
    expect(mapped).toBeLessThan(40)
  })

  it('should say once that it ran out', async () => {
    await engine.update(1)

    expect(errors).toHaveBeenCalledTimes(1)
  })

  it('should keep running on the next tick', async () => {
    await engine.update(1)

    await expect(engine.update(1)).resolves.toBeUndefined()
  })
})
