import { components } from '../../packages/@dcl/ecs/src'
import { Engine, Entity, IEngine } from '../../packages/@dcl/ecs/src/engine'
import { EntityState } from '../../packages/@dcl/ecs/src/engine/entity'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { DeleteEntity } from '../../packages/@dcl/ecs/src/serialization/crdt/deleteEntity'
import { Transport } from '../../packages/@dcl/ecs/src/systems/crdt/types'

describe('when a transport handles entity removal requests', () => {
  let engine: IEngine
  let entity: Entity
  let Transform: ReturnType<typeof components.Transform>
  let transport: Transport
  let requestEntityRemoval: jest.Mock<boolean, [Entity]>

  beforeEach(() => {
    engine = Engine()
    entity = engine.addEntity()
    Transform = components.Transform(engine)
    Transform.create(entity, { position: { x: 1, y: 2, z: 3 } })
    requestEntityRemoval = jest.fn<boolean, [Entity]>().mockReturnValue(true)
    transport = {
      type: 'network',
      filter: () => false,
      send: jest.fn().mockResolvedValue(undefined),
      requestEntityRemoval
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('and the transport defers removal', () => {
    let removed: boolean

    beforeEach(async () => {
      engine.addTransport(transport)
      removed = engine.removeEntity(entity)
      await engine.update(1)
    })

    it('should report that the entity was not removed', () => {
      expect(removed).toBe(false)
    })

    it('should retain the component state', () => {
      expect(Transform.get(entity).position).toEqual({ x: 1, y: 2, z: 3 })
    })

    it('should keep the entity alive after the next tick', () => {
      expect(engine.entityContainer.getEntityState(entity)).toBe(EntityState.UsedEntity)
    })

    it('should request removal of the original entity', () => {
      expect(requestEntityRemoval).toHaveBeenCalledWith(entity)
    })

    describe('and the server later sends an accepted deletion', () => {
      let deletion: ReadWriteByteBuffer

      beforeEach(async () => {
        requestEntityRemoval.mockClear()
        deletion = new ReadWriteByteBuffer()
        DeleteEntity.write(entity, deletion)
        transport.onmessage!(deletion.toBinary())
        await engine.update(1)
      })

      it('should commit the deletion', () => {
        expect(engine.entityContainer.getEntityState(entity)).toBe(EntityState.Removed)
      })

      it('should remove the component', () => {
        expect(Transform.has(entity)).toBe(false)
      })

      it('should not request permission again for the accepted deletion', () => {
        expect(requestEntityRemoval).not.toHaveBeenCalled()
      })
    })
  })

  describe('and the transport does not handle the request', () => {
    let removed: boolean

    beforeEach(async () => {
      requestEntityRemoval.mockReturnValue(false)
      engine.addTransport(transport)
      removed = engine.removeEntity(entity)
      await engine.update(1)
    })

    it('should report successful local removal', () => {
      expect(removed).toBe(true)
    })

    it('should remove the component', () => {
      expect(Transform.has(entity)).toBe(false)
    })
  })

  describe('and the transport has no removal hook', () => {
    beforeEach(async () => {
      delete transport.requestEntityRemoval
      engine.addTransport(transport)
      engine.removeEntity(entity)
      await engine.update(1)
    })

    it('should preserve ordinary local deletion', () => {
      expect(engine.entityContainer.getEntityState(entity)).toBe(EntityState.Removed)
    })
  })

  describe('and the scene captures removeEntity before adding the transport', () => {
    let removeEntity: IEngine['removeEntity']

    beforeEach(() => {
      removeEntity = engine.removeEntity
      engine.addTransport(transport)
      removeEntity(entity)
    })

    it('should honor the newly installed removal hook', () => {
      expect(requestEntityRemoval).toHaveBeenCalledWith(entity)
    })

    it('should retain the original entity state', () => {
      expect(Transform.has(entity)).toBe(true)
    })
  })

  describe('and the scene removes a network entity with network children', () => {
    let child: Entity
    let NetworkEntity: ReturnType<typeof components.NetworkEntity>
    let NetworkParent: ReturnType<typeof components.NetworkParent>

    beforeEach(async () => {
      child = engine.addEntity()
      NetworkEntity = components.NetworkEntity(engine)
      NetworkParent = components.NetworkParent(engine)
      NetworkEntity.create(entity, { networkId: 7, entityId: entity })
      NetworkEntity.create(child, { networkId: 7, entityId: child })
      NetworkParent.create(child, { networkId: 7, entityId: entity })
      Transform.create(child)
      engine.addTransport(transport)
      engine.removeEntityWithChildren(entity)
      await engine.update(1)
    })

    it('should request removal of the network child', () => {
      expect(requestEntityRemoval).toHaveBeenCalledWith(child)
    })

    it('should retain the network child component', () => {
      expect(Transform.has(child)).toBe(true)
    })
  })

  describe('and a network entity is its own parent', () => {
    let NetworkEntity: ReturnType<typeof components.NetworkEntity>
    let NetworkParent: ReturnType<typeof components.NetworkParent>

    beforeEach(() => {
      NetworkEntity = components.NetworkEntity(engine)
      NetworkParent = components.NetworkParent(engine)
      NetworkEntity.create(entity, { networkId: 7, entityId: entity })
      NetworkParent.create(entity, { networkId: 7, entityId: entity })
      engine.addTransport(transport)
      engine.removeEntityWithChildren(entity)
    })

    it('should request removal only once', () => {
      expect(requestEntityRemoval.mock.calls).toEqual([[entity]])
    })
  })

  describe('and network entities form a parent cycle', () => {
    let child: Entity
    let NetworkEntity: ReturnType<typeof components.NetworkEntity>
    let NetworkParent: ReturnType<typeof components.NetworkParent>

    beforeEach(() => {
      child = engine.addEntity()
      NetworkEntity = components.NetworkEntity(engine)
      NetworkParent = components.NetworkParent(engine)
      NetworkEntity.create(entity, { networkId: 7, entityId: entity })
      NetworkEntity.create(child, { networkId: 7, entityId: child })
      NetworkParent.create(entity, { networkId: 7, entityId: child })
      NetworkParent.create(child, { networkId: 7, entityId: entity })
      Transform.create(child)
      engine.addTransport(transport)
      engine.removeEntityWithChildren(entity)
    })

    it('should request removal of each entity only once', () => {
      expect(requestEntityRemoval.mock.calls).toEqual([[entity], [child]])
    })
  })

  describe('and the scene removes an entity with children', () => {
    let child: Entity

    beforeEach(async () => {
      child = engine.addEntity()
      Transform.create(child, { parent: entity })
      engine.addTransport(transport)
      engine.removeEntityWithChildren(entity)
      await engine.update(1)
    })

    it('should request removal for the parent', () => {
      expect(requestEntityRemoval).toHaveBeenCalledWith(entity)
    })

    it('should request removal for the child', () => {
      expect(requestEntityRemoval).toHaveBeenCalledWith(child)
    })

    it('should retain the parent component', () => {
      expect(Transform.has(entity)).toBe(true)
    })

    it('should preserve the child relationship while awaiting acceptance', () => {
      expect(Transform.get(child).parent).toBe(entity)
    })
  })
})
