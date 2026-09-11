import { components } from '../../packages/@dcl/ecs/src'
import { Engine, Entity, IEngine } from '../../packages/@dcl/ecs/src/engine'
import { EntityState } from '../../packages/@dcl/ecs/src/engine/entity'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { DeleteEntity } from '../../packages/@dcl/ecs/src/serialization/crdt/deleteEntity'
import { Transport } from '../../packages/@dcl/ecs/src/systems/crdt/types'

describe('when the engine has an entity removal handler', () => {
  let engine: IEngine
  let entity: Entity
  let Transform: ReturnType<typeof components.Transform>
  let removalHandler: jest.Mock<boolean, [Entity]>

  beforeEach(() => {
    engine = Engine()
    entity = engine.addEntity()
    Transform = components.Transform(engine)
    Transform.create(entity, { position: { x: 1, y: 2, z: 3 } })
    removalHandler = jest.fn<boolean, [Entity]>().mockReturnValue(true)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('and the handler defers removal', () => {
    let removed: boolean

    beforeEach(async () => {
      engine.addEntityRemovalHandler(removalHandler)
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
      expect(removalHandler).toHaveBeenCalledWith(entity)
    })

    describe('and the server later sends an accepted deletion', () => {
      let deletion: ReadWriteByteBuffer
      let transport: Transport

      beforeEach(async () => {
        removalHandler.mockClear()
        transport = {
          type: 'network',
          filter: () => false,
          send: jest.fn().mockResolvedValue(undefined)
        }
        engine.addTransport(transport)
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
        expect(removalHandler).not.toHaveBeenCalled()
      })
    })
  })

  describe('and the handler does not defer removal', () => {
    let removed: boolean

    beforeEach(async () => {
      removalHandler.mockReturnValue(false)
      engine.addEntityRemovalHandler(removalHandler)
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

  describe('and no removal handler is registered', () => {
    beforeEach(async () => {
      engine.removeEntity(entity)
      await engine.update(1)
    })

    it('should preserve ordinary local deletion', () => {
      expect(engine.entityContainer.getEntityState(entity)).toBe(EntityState.Removed)
    })
  })

  describe('and the scene captures removeEntity before registering the handler', () => {
    let removeEntity: IEngine['removeEntity']

    beforeEach(() => {
      removeEntity = engine.removeEntity
      engine.addEntityRemovalHandler(removalHandler)
      removeEntity(entity)
    })

    it('should honor the newly registered removal handler', () => {
      expect(removalHandler).toHaveBeenCalledWith(entity)
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
      engine.addEntityRemovalHandler(removalHandler)
      engine.removeEntityWithChildren(entity)
      await engine.update(1)
    })

    it('should request removal of the network child', () => {
      expect(removalHandler).toHaveBeenCalledWith(child)
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
      engine.addEntityRemovalHandler(removalHandler)
      engine.removeEntityWithChildren(entity)
    })

    it('should request removal only once', () => {
      expect(removalHandler.mock.calls).toEqual([[entity]])
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
      engine.addEntityRemovalHandler(removalHandler)
      engine.removeEntityWithChildren(entity)
    })

    it('should request removal of each entity only once', () => {
      expect(removalHandler.mock.calls).toEqual([[entity], [child]])
    })
  })

  describe('and the scene removes an entity with children', () => {
    let child: Entity

    beforeEach(async () => {
      child = engine.addEntity()
      Transform.create(child, { parent: entity })
      engine.addEntityRemovalHandler(removalHandler)
      engine.removeEntityWithChildren(entity)
      await engine.update(1)
    })

    it('should request removal for the parent', () => {
      expect(removalHandler).toHaveBeenCalledWith(entity)
    })

    it('should request removal for the child', () => {
      expect(removalHandler).toHaveBeenCalledWith(child)
    })

    it('should retain the parent component', () => {
      expect(Transform.has(entity)).toBe(true)
    })

    it('should preserve the child relationship while awaiting acceptance', () => {
      expect(Transform.get(child).parent).toBe(entity)
    })
  })

  describe('and the scene unregisters the removal handler', () => {
    let unregister: () => void

    beforeEach(() => {
      unregister = engine.addEntityRemovalHandler(removalHandler)
      unregister()
      unregister()
      engine.removeEntity(entity)
    })

    it('should stop invoking the handler', () => {
      expect(removalHandler).not.toHaveBeenCalled()
    })

    it('should remove the entity immediately', () => {
      expect(Transform.has(entity)).toBe(false)
    })
  })

  describe('and multiple removal handlers are registered', () => {
    let otherHandler: jest.Mock<boolean, [Entity]>
    let unregisterFirst: () => void

    beforeEach(() => {
      removalHandler.mockReturnValue(false)
      otherHandler = jest.fn<boolean, [Entity]>().mockReturnValue(true)
      unregisterFirst = engine.addEntityRemovalHandler(removalHandler)
      engine.addEntityRemovalHandler(otherHandler)
    })

    describe('and a later handler defers the removal', () => {
      beforeEach(() => {
        engine.removeEntity(entity)
      })

      it('should consult the later handler after the first allows removal', () => {
        expect(otherHandler).toHaveBeenCalledWith(entity)
      })

      it('should preserve the entity if any handler defers removal', () => {
        expect(Transform.has(entity)).toBe(true)
      })
    })

    describe('and the first handler is unregistered', () => {
      beforeEach(() => {
        unregisterFirst()
        engine.removeEntity(entity)
      })

      it('should continue honoring the remaining handler', () => {
        expect(otherHandler).toHaveBeenCalledWith(entity)
      })

      it('should retain the entity while the remaining handler defers removal', () => {
        expect(Transform.has(entity)).toBe(true)
      })
    })

    describe('and all handlers allow local removal', () => {
      beforeEach(() => {
        otherHandler.mockReturnValue(false)
        engine.removeEntity(entity)
      })

      it('should remove the component immediately', () => {
        expect(Transform.has(entity)).toBe(false)
      })
    })
  })
})
