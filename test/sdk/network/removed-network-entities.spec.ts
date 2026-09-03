jest.mock('~system/CommunicationsController', () => ({}), { virtual: true })
jest.mock('~system/UserIdentity', () => ({}), { virtual: true })
import { Engine, Entity } from '../../../packages/@dcl/ecs/src'
import * as components from '../../../packages/@dcl/ecs/src/components'
import { entityUtils } from '../../../packages/@dcl/sdk/src/network/entities'
import { engineToCrdt } from '../../../packages/@dcl/sdk/src/network/state'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { PutNetworkComponentOperation } from '../../../packages/@dcl/ecs/src/serialization/crdt/network/putComponentNetwork'
import { Transport } from '../../../packages/@dcl/ecs/src/systems/crdt/types'

const SYNC_ID = 7

function setup() {
  const engine = Engine()
  const Transform = components.Transform(engine as any)
  components.NetworkEntity(engine as any)
  components.NetworkParent(engine as any)
  components.SyncComponents(engine as any)
  const { syncEntity } = entityUtils(engine as any, { networkId: 42, userId: '0xabc' } as any)
  return { engine, Transform, syncEntity }
}

describe('when a synchronised entity is removed', () => {
  let engine: ReturnType<typeof setup>['engine']
  let syncEntity: ReturnType<typeof setup>['syncEntity']
  let Transform: ReturnType<typeof setup>['Transform']
  let removed: Entity

  beforeEach(async () => {
    const context = setup()
    engine = context.engine
    syncEntity = context.syncEntity
    Transform = context.Transform

    removed = engine.addEntity()
    Transform.create(removed)
    syncEntity(removed, [Transform.componentId], SYNC_ID)
    await engine.update(1)

    engine.removeEntity(removed)
    await engine.update(1)
    await engine.update(1)
  })

  it('should send nothing about it to a player joining later', () => {
    expect(engineToCrdt(engine as any)).toEqual([])
  })

  it('should let its sync id be used again', () => {
    const replacement = engine.addEntity()
    Transform.create(replacement)

    expect(() => syncEntity(replacement, [Transform.componentId], SYNC_ID)).not.toThrow()
  })
})

describe('when a synchronised entity is still alive', () => {
  let engine: ReturnType<typeof setup>['engine']
  let syncEntity: ReturnType<typeof setup>['syncEntity']

  beforeEach(async () => {
    const context = setup()
    engine = context.engine
    syncEntity = context.syncEntity

    const entity = engine.addEntity()
    context.Transform.create(entity)
    syncEntity(entity, [context.Transform.componentId], SYNC_ID)
    await engine.update(1)
  })

  it('should send its state to a player joining later', () => {
    expect(engineToCrdt(engine as any).length).toBeGreaterThan(0)
  })

  it('should still refuse to reuse its sync id', () => {
    const other = engine.addEntity()

    expect(() => syncEntity(other, [], SYNC_ID)).toThrow('already in use')
  })
})

describe('when a synchronised entity is removed and the join snapshot is taken before the next update', () => {
  let engine: ReturnType<typeof setup>['engine']
  let Transform: ReturnType<typeof setup>['Transform']
  let syncEntity: ReturnType<typeof setup>['syncEntity']
  let removed: Entity

  beforeEach(async () => {
    const context = setup()
    engine = context.engine
    Transform = context.Transform
    syncEntity = context.syncEntity
    removed = engine.addEntity()
    Transform.create(removed, { position: { x: 1, y: 2, z: 3 } } as any)
    syncEntity(removed, [Transform.componentId], SYNC_ID)
    await engine.update(1)

    // No update after this: the tombstone has not been released yet, so the
    // entity reads back as Unknown rather than Removed.
    engine.removeEntity(removed)
  })

  it('should send nothing about it to a player joining in that window', () => {
    expect(engineToCrdt(engine as any)).toEqual([])
  })
})

describe('when a sync id is reused by a live entity after the original was removed', () => {
  let engine: ReturnType<typeof setup>['engine']
  let Transform: ReturnType<typeof setup>['Transform']
  let syncEntity: ReturnType<typeof setup>['syncEntity']
  let NetworkEntity: ReturnType<typeof components.NetworkEntity>
  let replacement: Entity

  beforeEach(async () => {
    const context = setup()
    engine = context.engine
    Transform = context.Transform
    syncEntity = context.syncEntity
    NetworkEntity = engine.getComponent(components.NetworkEntity(engine as any).componentId) as any

    const original = engine.addEntity()
    Transform.create(original, { position: { x: 1, y: 1, z: 1 } } as any)
    syncEntity(original, [Transform.componentId], SYNC_ID)
    await engine.update(1)

    engine.removeEntity(original)
    await engine.update(1)

    replacement = engine.addEntity()
    Transform.create(replacement, { position: { x: 9, y: 9, z: 9 } } as any)
    syncEntity(replacement, [Transform.componentId], SYNC_ID)
    await engine.update(1)
  })

  it('should keep both the tombstone and the live replacement mapped to the id', () => {
    const matching = Array.from(engine.getEntitiesWith(NetworkEntity)).filter(
      ([, network]) => network.entityId === (SYNC_ID as unknown as Entity)
    )

    expect(matching.length).toBe(2)
  })

  it('should include the replacement in a join snapshot', () => {
    expect(engineToCrdt(engine as any).length).toBeGreaterThan(0)
  })
})

describe('when an inbound update arrives for a sync id that was removed and reused', () => {
  let engine: ReturnType<typeof setup>['engine']
  let Transform: ReturnType<typeof setup>['Transform']
  let syncEntity: ReturnType<typeof setup>['syncEntity']
  let transport: Transport
  let replacement: Entity
  let incomingPosition: { x: number; y: number; z: number }

  beforeEach(async () => {
    const context = setup()
    engine = context.engine
    Transform = context.Transform
    syncEntity = context.syncEntity
    transport = { send: async () => {}, filter: () => false }
    engine.addTransport(transport as any)
    incomingPosition = { x: 5, y: 6, z: 7 }

    const original = engine.addEntity()
    Transform.create(original, { position: { x: 1, y: 1, z: 1 } } as any)
    syncEntity(original, [Transform.componentId], SYNC_ID)
    await engine.update(1)

    engine.removeEntity(original)
    await engine.update(1)

    replacement = engine.addEntity()
    Transform.create(replacement, { position: { x: 9, y: 9, z: 9 } } as any)
    syncEntity(replacement, [Transform.componentId], SYNC_ID)
    await engine.update(1)

    // A peer sends an update addressed to the reused id. syncEntity with an enum id
    // uses networkId 0 and the enum as the entity id.
    const data = new ReadWriteByteBuffer()
    Transform.schema.serialize(
      {
        position: incomingPosition,
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
        parent: 0 as Entity
      } as any,
      data
    )
    const buffer = new ReadWriteByteBuffer()
    PutNetworkComponentOperation.write(
      SYNC_ID as unknown as Entity,
      Date.now(),
      Transform.componentId,
      0,
      data.toBinary(),
      buffer
    )
    transport.onmessage!(buffer.toBinary())
    await engine.update(1)
  })

  it('should apply the update to the live replacement rather than dropping it on the tombstone', () => {
    expect(Transform.getOrNull(replacement)?.position).toEqual(incomingPosition)
  })
})
