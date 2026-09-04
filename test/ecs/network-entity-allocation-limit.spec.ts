import * as components from '../../packages/@dcl/ecs/src/components'
import { Engine, Entity } from '../../packages/@dcl/ecs/src/engine'
import { createEntityContainer, MAX_ENTITY_NUMBER } from '../../packages/@dcl/ecs/src/engine/entity'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { DeleteEntityNetwork } from '../../packages/@dcl/ecs/src/serialization/crdt/network/deleteEntityNetwork'
import { PutNetworkComponentOperation } from '../../packages/@dcl/ecs/src/serialization/crdt/network/putComponentNetwork'
import { Transport } from '../../packages/@dcl/ecs/src/systems/crdt/types'

/** Leaves exactly this many numbers for the container to hand out. */
const SPARE_ENTITIES = 5
const RESERVED = MAX_ENTITY_NUMBER - SPARE_ENTITIES
/** Far more distinct pairs than there are entities left. */
const ANNOUNCED_PAIRS = 40

type Ctx = {
  engine: ReturnType<typeof Engine>
  Transform: ReturnType<typeof components.Transform>
  NetworkEntity: ReturnType<typeof components.NetworkEntity>
  transport: Transport
}

function setup(): Ctx {
  const engine = Engine({
    onChangeFunction: () => undefined,
    entityContainer: createEntityContainer({ reservedStaticEntities: RESERVED })
  })
  const Transform = components.Transform(engine)
  const NetworkEntity = components.NetworkEntity(engine)
  const transport: Transport = { send: async () => {}, filter: () => false }
  engine.addTransport(transport)
  return { engine, Transform, NetworkEntity, transport }
}

function transformBytes(Transform: Ctx['Transform'], x: number): Uint8Array {
  const payload = new ReadWriteByteBuffer()
  Transform.schema.serialize(
    {
      position: { x, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
      parent: 0 as Entity
    },
    payload
  )
  return payload.toBinary()
}

/** One chunk announcing `count` distinct (networkId, entityId) pairs. */
function announcePairs(Transform: Ctx['Transform'], count: number, x = 1): Uint8Array {
  const data = transformBytes(Transform, x)
  const chunk = new ReadWriteByteBuffer()
  for (let index = 0; index < count; index++) {
    PutNetworkComponentOperation.write(index as Entity, 1, Transform.componentId, index + 1, data, chunk)
  }
  return chunk.toBinary()
}

describe('when a peer announces more network entities than the engine can allocate', () => {
  let ctx: Ctx
  let errors: jest.SpyInstance

  beforeEach(() => {
    ctx = setup()
    errors = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    ctx.transport.onmessage!(announcePairs(ctx.Transform, ANNOUNCED_PAIRS))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should finish the update instead of rejecting out of the tick', async () => {
    await expect(ctx.engine.update(1)).resolves.toBeUndefined()
  })

  it('should map exactly the entities it had room for', async () => {
    await ctx.engine.update(1)

    expect(Array.from(ctx.engine.getEntitiesWith(ctx.NetworkEntity)).length).toBe(SPARE_ENTITIES)
  })

  it('should say what happened', async () => {
    await ctx.engine.update(1)

    expect(errors).toHaveBeenCalledWith(expect.stringContaining('Ran out of local entities'), expect.anything())
  })

  it('should say it only once however many pairs arrive', async () => {
    await ctx.engine.update(1)

    expect(errors).toHaveBeenCalledTimes(1)
  })

  it('should keep running on the next tick', async () => {
    await ctx.engine.update(1)

    await expect(ctx.engine.update(1)).resolves.toBeUndefined()
  })
})

describe('when an update arrives for an already-mapped entity after exhaustion', () => {
  let ctx: Ctx
  let mapped: Entity

  beforeEach(async () => {
    ctx = setup()
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    ctx.transport.onmessage!(announcePairs(ctx.Transform, ANNOUNCED_PAIRS))
    await ctx.engine.update(1)
    mapped = Array.from(ctx.engine.getEntitiesWith(ctx.NetworkEntity))[0][0]

    // Pair 0 is one of the pairs that did get mapped; move it.
    const later = new ReadWriteByteBuffer()
    PutNetworkComponentOperation.write(
      0 as Entity,
      Date.now(),
      ctx.Transform.componentId,
      1,
      transformBytes(ctx.Transform, 42),
      later
    )
    ctx.transport.onmessage!(later.toBinary())
    await ctx.engine.update(1)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should still apply it, because only unmappable messages are dropped', () => {
    expect(ctx.Transform.getOrNull(mapped)?.position.x).toBe(42)
  })
})

describe('when a delete arrives for a pair that was never mapped after exhaustion', () => {
  let ctx: Ctx
  let errors: jest.SpyInstance

  beforeEach(async () => {
    ctx = setup()
    errors = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    ctx.transport.onmessage!(announcePairs(ctx.Transform, ANNOUNCED_PAIRS))
    await ctx.engine.update(1)

    // A delete is a network message too, so it takes the same allocation path.
    const del = new ReadWriteByteBuffer()
    DeleteEntityNetwork.write(9999 as Entity, 9999, del)
    ctx.transport.onmessage!(del.toBinary())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should finish the update rather than rejecting', async () => {
    await expect(ctx.engine.update(1)).resolves.toBeUndefined()
  })

  it('should not report a second time', async () => {
    await ctx.engine.update(1)

    expect(errors).toHaveBeenCalledTimes(1)
  })
})

describe('when entities are freed after exhaustion', () => {
  let ctx: Ctx
  let errors: jest.SpyInstance
  let mappedBefore: number

  beforeEach(async () => {
    ctx = setup()
    errors = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    ctx.transport.onmessage!(announcePairs(ctx.Transform, ANNOUNCED_PAIRS))
    await ctx.engine.update(1)
    mappedBefore = Array.from(ctx.engine.getEntitiesWith(ctx.NetworkEntity)).length

    // Free them all. Numbers can then be recycled with a bumped version, so mapping is
    // able to resume: exhaustion is not permanent.
    for (const [entity] of Array.from(ctx.engine.getEntitiesWith(ctx.NetworkEntity))) {
      ctx.engine.removeEntity(entity)
    }
    await ctx.engine.update(1)

    ctx.transport.onmessage!(announcePairs(ctx.Transform, ANNOUNCED_PAIRS, 7))
    await ctx.engine.update(1)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should map entities again', () => {
    // A removed entity keeps its NetworkEntity so the deletion can still be forwarded, so
    // the old rows are still counted. Growth past them is the proof mapping resumed.
    expect(Array.from(ctx.engine.getEntitiesWith(ctx.NetworkEntity)).length).toBeGreaterThan(mappedBefore)
  })

  it('should report the second exhaustion rather than staying quiet', () => {
    expect(errors.mock.calls.length).toBeGreaterThan(1)
  })
})
